/**
 * Registration requests for new students.
 * Stored in Supabase table `registration_requests`.
 * On approve: creates an Account + Student so the person can log in
 * (via "Забыли пароль?" to set their password).
 */

import { getSupabase, isSupabaseConfigured } from './supabase'
import {
  listAccounts,
  normalizePhone,
  type Account,
} from './auth'
import { saveSharedKey, loadSharedKeys } from './sync'
import type { Student, Category } from './data'


function withTimeout<T>(promise: PromiseLike<T>, ms = 12000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    Promise.resolve(promise).then(
      (v) => { clearTimeout(t); resolve(v) },
      (e) => { clearTimeout(t); reject(e) },
    )
  })
}


async function loadRegRequests(): Promise<RegistrationRequest[]> {
  try {
    const cloud = await loadSharedKeys(['registrationRequests'])
    return Array.isArray(cloud?.registrationRequests) ? cloud.registrationRequests : []
  } catch {
    return []
  }
}

async function saveRegRequests(list: RegistrationRequest[]): Promise<boolean> {
  return saveSharedKey('registrationRequests', list)
}

export type RegistrationRequest = {
  id: string
  full_name: string
  phone: string
  category: string | null
  branch: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
  note: string | null
}

function uid() {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export async function submitRegistrationRequest(input: {
  fullName: string
  phone: string
  category?: string | null
  branch?: string | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase()
  if (!sb || !isSupabaseConfigured) return { ok: false, error: 'no-cloud' }

  const name = input.fullName.trim()
  const phone = normalizePhone(input.phone)
  if (name.length < 2) return { ok: false, error: 'name' }
  if (phone.length < 10) return { ok: false, error: 'phone' }

  // Prevent duplicate pending for same phone
  try {
    const { data: existing } = await withTimeout(
      sb.from('registration_requests').select('id').eq('phone', phone).eq('status', 'pending').limit(1),
      8000,
    )
    if (existing && existing.length > 0) return { ok: false, error: 'exists' }
  } catch (e) {
    console.warn('[reg] duplicate check timeout:', e)
    // continue anyway
  }

  const row = {
    id: uid(),
    full_name: name,
    phone,
    category: input.category || null,
    branch: input.branch || null,
    status: 'pending' as const,
    created_at: new Date().toISOString(),
  }

  // Always write to app_state (reliable)
  try {
    const prev = await loadRegRequests()
    const next = [{ ...row, reviewed_at: null, note: null }, ...prev.filter((x) => x.id !== row.id && x.phone !== row.phone)]
    const ok = await saveRegRequests(next)
    if (!ok) return { ok: false, error: 'save' }
  } catch (e) {
    console.warn('[reg] submit app_state:', e)
    return { ok: false, error: 'save' }
  }
  // Best-effort also write to table
  try {
    await withTimeout(sb.from('registration_requests').insert(row), 6000)
  } catch (e) {
    console.warn('[reg] table insert skipped:', e)
  }
  return { ok: true }
}

export async function listRegistrationRequests(): Promise<RegistrationRequest[]> {
  // Primary: app_state
  const fromState = await loadRegRequests()
  if (fromState.length) return fromState
  // Fallback: dedicated table
  const sb = getSupabase()
  if (!sb) return fromState
  try {
    const { data, error } = await withTimeout(
      sb.from('registration_requests').select('*').order('created_at', { ascending: false }),
      8000,
    )
    if (error) return fromState
    return (data ?? []) as RegistrationRequest[]
  } catch {
    return fromState
  }
}

export async function setRegistrationRequestStatus(
  id: string,
  status: 'approved' | 'rejected',
  note?: string,
): Promise<boolean> {
  // Update app_state
  try {
    const prev = await loadRegRequests()
    const next = prev.map((r) =>
      r.id === id ? { ...r, status, reviewed_at: new Date().toISOString(), note: note ?? null } : r
    )
    await saveRegRequests(next)
  } catch (e) {
    console.warn('[reg] status app_state:', e)
  }
  // Best-effort table update
  const sb = getSupabase()
  if (sb) {
    try {
      await sb.from('registration_requests').update({
        status,
        reviewed_at: new Date().toISOString(),
        note: note ?? null,
      }).eq('id', id)
    } catch (e) {
      console.warn('[reg] status table:', e)
    }
  }
  return true
}

/**
 * Approve a request: create Account + Student, save to cloud, mark request approved.
 * The new student can log in and use "Забыли пароль?" to set their password.
 */
export async function approveRegistrationRequest(
  req: RegistrationRequest,
): Promise<{ ok: true; tempPassword: string } | { ok: false; error: string }> {
  const phone = normalizePhone(req.phone)
  const name = req.full_name.trim()
  if (!name || phone.length < 10) return { ok: false, error: 'invalid' }

  const accounts = listAccounts()
  if (accounts.some((a) => a.phone === phone)) {
    // Already exists — just mark approved
    await setRegistrationRequestStatus(req.id, 'approved', 'already-exists')
    return { ok: true, tempPassword: '' }
  }

  // Unique temporary password per student (phone tail + random)
  const tempPassword = `Emir${phone.replace(/\D/g, '').slice(-4)}${Math.floor(100 + Math.random() * 900)}`

  const { createAccountSilent } = await import('./auth')
  const created = await createAccountSilent(name, phone, tempPassword)
  if (!created.ok) return { ok: false, error: created.error }

  // Persist accounts to cloud immediately
  await saveSharedKey('accounts', listAccounts())

  const category = (req.category as Category) || 'B'
  const student: Student = {
    id: created.accountId,
    name,
    phone,
    category,
    docs: { idFront: null, idBack: null, psycho: null, narco: null },
    status: 'draft',
    readyDate: null,
    submittedAt: null,
    updatedAt: new Date().toISOString(),
  }

  // Append student to cloud students list
  const { loadSharedKeys, saveStudentsLocalWins, saveNoticesMerged } = await import('./sync')
  const cloud = await loadSharedKeys(['students', 'notices'])
  const remote = (cloud?.students || []) as Student[]
  const nextStudents = [...remote.filter((s) => s.id !== student.id && s.phone !== phone), student]
  await saveStudentsLocalWins(nextStudents)

  // Targeted notice so student sees acceptance + phone + password after login
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const notice = {
    id: `n_reg_${created.accountId}_${Date.now().toString(36)}`,
    kind: 'info' as const,
    title: {
      ru: 'Заявка одобрена',
      kk: 'Өтініш мақұлданды',
    },
    body: {
      ru: `Ваша заявка с номером ${phone} принята. Временный пароль: ${tempPassword}. Войдите с этим паролем или нажмите «Забыли пароль?» и задайте свой.`,
      kk: `${phone} нөмірімен жіберілген өтінішіңіз қабылданды. Уақытша құпия сөз: ${tempPassword}. Осы құпия сөзбен кіріңіз немесе «Құпия сөзді ұмыттыңыз ба?» арқылы өз құпия сөзіңізді қойыңыз.`,
    },
    time: stamp,
    read: false,
    studentId: created.accountId,
  }
  const prevNotices = Array.isArray(cloud?.notices) ? cloud.notices : []
  await saveNoticesMerged([notice, ...prevNotices.filter((n) => n.id !== notice.id)])

  // Dedicated cloud map so login screen always finds password by phone
  const phoneKey = phone.replace(/\D/g, '').slice(-10)
  try {
    const credCloud = await loadSharedKeys(['regCredentials'])
    const map = { ...(credCloud?.regCredentials || {}) }
    map[phoneKey] = {
      phone,
      fullName: name,
      tempPassword,
      accountId: created.accountId,
    }
    await saveSharedKey('regCredentials', map)
  } catch (e) {
    console.warn('[reg] regCredentials save:', e)
  }

  await setRegistrationRequestStatus(req.id, 'approved', `temp:${tempPassword}`)
  return { ok: true, tempPassword }
}

function phoneKeyOf(phone: string) {
  return normalizePhone(phone).replace(/\D/g, '').slice(-10)
}

/** Lookup approved registration by phone — returns temp password if still stored. */
export async function getApprovedCredentialsByPhone(
  phone: string,
): Promise<{ fullName: string; phone: string; tempPassword: string } | null> {
  const ph = normalizePhone(phone)
  const key = phoneKeyOf(ph)
  if (key.length < 10) return null

  try {
    const cloud = await loadSharedKeys(['regCredentials'])
    const hit = cloud?.regCredentials?.[key]
    if (hit?.tempPassword) {
      return { fullName: hit.fullName || '', phone: hit.phone || ph, tempPassword: hit.tempPassword }
    }
  } catch (e) {
    console.warn('[reg] regCredentials load:', e)
  }

  const list = await listRegistrationRequests()
  const hit = list.find((r) => phoneKeyOf(r.phone) === key && r.status === 'approved')
  if (!hit?.note?.startsWith('temp:')) return null
  const tempPassword = hit.note.slice(5).trim()
  if (!tempPassword) return null
  return { fullName: hit.full_name, phone: ph, tempPassword }
}
