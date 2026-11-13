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
  if (!isSupabaseConfigured) return { ok: false, error: 'no-cloud' }

  const name = input.fullName.trim()
  const phone = normalizePhone(input.phone)
  if (name.length < 2) return { ok: false, error: 'name' }
  if (phone.length < 10) return { ok: false, error: 'phone' }

  const phoneKey = phone.replace(/\D/g, '').slice(-10)
  const row = {
    id: uid(),
    full_name: name,
    phone,
    category: input.category || null,
    branch: input.branch || null,
    status: 'pending' as const,
    created_at: new Date().toISOString(),
    reviewed_at: null as string | null,
    note: null as string | null,
  }

  // 1) Try table first (more reliable after migration)
  let tableOk = false
  const sb = getSupabase()
  if (sb) {
    try {
      const { error } = await withTimeout(
        sb.from('registration_requests').insert({
          id: row.id,
          full_name: row.full_name,
          phone: row.phone,
          category: row.category,
          branch: row.branch,
          status: row.status,
          created_at: row.created_at,
        }),
        8000,
      )
      if (!error) tableOk = true
      else console.warn('[reg] table insert:', error.message)
    } catch (e) {
      console.warn('[reg] table insert exception:', e)
    }
  }

  // 2) Also try app_state (for admin list)
  let stateOk = false
  try {
    const prev = await withTimeout(loadRegRequests(), 6000).catch(() => [] as RegistrationRequest[])
    if (prev.some((r) => r.status === 'pending' && (normalizePhone(r.phone) === phone || r.phone.replace(/\D/g, '').slice(-10) === phoneKey))) {
      return { ok: false, error: 'exists' }
    }
    const next = [row, ...prev.filter((x) => x.id !== row.id && normalizePhone(x.phone) !== phone && x.phone.replace(/\D/g, '').slice(-10) !== phoneKey)]
    stateOk = await withTimeout(saveRegRequests(next), 6000).catch(() => false)
  } catch (e) {
    console.warn('[reg] app_state:', e)
  }

  if (tableOk || stateOk) return { ok: true }
  return { ok: false, error: 'save' }
}

export async function listRegistrationRequests(): Promise<RegistrationRequest[]> {
  // Only app_state — never wait on the secondary table (was up to 8s)
  try {
    return await withTimeout(loadRegRequests(), 6000)
  } catch (e) {
    console.warn('[reg] list:', e)
    return []
  }
}

export async function setRegistrationRequestStatus(
  id: string,
  status: 'approved' | 'rejected',
  note?: string,
  /** Optional: pass current list to avoid an extra load */
  knownList?: RegistrationRequest[],
): Promise<boolean> {
  try {
    const prev = knownList ?? (await withTimeout(loadRegRequests(), 4000))
    const next = prev.map((r) =>
      r.id === id ? { ...r, status, reviewed_at: new Date().toISOString(), note: note ?? null } : r,
    )
    await withTimeout(saveRegRequests(next), 4000)
  } catch (e) {
    console.warn('[reg] status app_state:', e)
    return false
  }
  // Table update never blocks UI
  const sb = getSupabase()
  if (sb) {
    void Promise.resolve(
      sb.from('registration_requests').update({
        status,
        reviewed_at: new Date().toISOString(),
        note: note ?? null,
      }).eq('id', id),
    ).catch(() => {})
  }
  return true
}

/**
 * Approve a request: create Account + Student, save to cloud, mark request approved.
 * Batched cloud I/O so admin / phone are not stuck on sequential round-trips.
 */
export async function approveRegistrationRequest(
  req: RegistrationRequest,
): Promise<{ ok: true; tempPassword: string } | { ok: false; error: string }> {
  const phone = normalizePhone(req.phone)
  const name = req.full_name.trim()
  if (!name || phone.length < 10) return { ok: false, error: 'invalid' }

  const phoneKey = phone.replace(/\D/g, '').slice(-10)

  // One parallel read for everything we need
  const { loadSharedKeys } = await import('./sync')
  let cloud: Awaited<ReturnType<typeof loadSharedKeys>> = null
  try {
    cloud = await withTimeout(
      loadSharedKeys(['students', 'notices', 'regCredentials', 'registrationRequests', 'accounts']),
      6000,
    )
  } catch (e) {
    console.warn('[reg] approve load:', e)
  }

  // Prefer cloud accounts for "already exists"
  if (cloud?.accounts?.length) {
    const { mergeAccountsFromCloud } = await import('./auth')
    mergeAccountsFromCloud(cloud.accounts)
  }

  const accounts = listAccounts()
  const exists =
    accounts.some((a) => a.phone === phone || a.phone.replace(/\D/g, '').slice(-10) === phoneKey) ||
    (cloud?.accounts || []).some(
      (a: { phone?: string }) =>
        a.phone === phone || (a.phone || '').replace(/\D/g, '').slice(-10) === phoneKey,
    )

  const reqList = Array.isArray(cloud?.registrationRequests)
    ? (cloud!.registrationRequests as RegistrationRequest[])
    : await loadRegRequests().catch(() => [] as RegistrationRequest[])

  if (exists) {
    await setRegistrationRequestStatus(req.id, 'approved', 'already-exists', reqList)
    return { ok: true, tempPassword: '' }
  }

  const tempPassword = `Emir${phone.replace(/\D/g, '').slice(-4)}${Math.floor(100 + Math.random() * 900)}`

  const { createAccountSilent } = await import('./auth')
  const created = await createAccountSilent(name, phone, tempPassword)
  if (!created.ok) return { ok: false, error: created.error }

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

  const remoteStudents = (cloud?.students || []) as Student[]
  const nextStudents = [
    ...remoteStudents.filter((s) => s.id !== student.id && s.phone !== phone),
    student,
  ]

  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const notice = {
    id: `n_reg_${created.accountId}_${Date.now().toString(36)}`,
    kind: 'info' as const,
    title: { ru: 'Заявка одобрена', kk: 'Өтініш мақұлданды' },
    body: {
      ru: `Ваша заявка с номером ${phone} принята. Временный пароль: ${tempPassword}. Войдите с этим паролем или нажмите «Забыли пароль?» и задайте свой.`,
      kk: `${phone} нөмірімен жіберілген өтінішіңіз қабылданды. Уақытша құпия сөз: ${tempPassword}. Осы құпия сөзбен кіріңіз немесе «Құпия сөзді ұмыттыңыз ба?» арқылы өз құпия сөзіңізді қойыңыз.`,
    },
    time: stamp,
    read: false,
    studentId: created.accountId,
  }
  const prevNotices = Array.isArray(cloud?.notices) ? cloud.notices : []
  const nextNotices = [notice, ...prevNotices.filter((n) => n.id !== notice.id)]

  const credMap = { ...(cloud?.regCredentials || {}) }
  credMap[phoneKey] = {
    phone,
    fullName: name,
    tempPassword,
    accountId: created.accountId,
  }

  const nextReqs = reqList.map((r) =>
    r.id === req.id
      ? { ...r, status: 'approved' as const, reviewed_at: new Date().toISOString(), note: `temp:${tempPassword}` }
      : r,
  )

  // Parallel writes — no extra load+merge round-trips (lists already prepared)
  await Promise.all([
    saveSharedKey('accounts', listAccounts()),
    saveSharedKey('students', nextStudents),
    saveSharedKey('notices', nextNotices),
    saveSharedKey('regCredentials', credMap),
    saveRegRequests(nextReqs),
  ])

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
    const cloud = await withTimeout(loadSharedKeys(['regCredentials']), 4000)
    const hit = cloud?.regCredentials?.[key]
    if (hit?.tempPassword) {
      return { fullName: hit.fullName || '', phone: hit.phone || ph, tempPassword: hit.tempPassword }
    }
  } catch (e) {
    console.warn('[reg] regCredentials load:', e)
  }

  try {
    const list = await listRegistrationRequests()
    const hit = list.find((r) => phoneKeyOf(r.phone) === key && r.status === 'approved')
    if (!hit?.note?.startsWith('temp:')) return null
    const tempPassword = hit.note.slice(5).trim()
    if (!tempPassword) return null
    return { fullName: hit.full_name, phone: ph, tempPassword }
  } catch {
    return null
  }
}
