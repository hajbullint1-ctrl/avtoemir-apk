/**
 * Registration requests for new students.
 * Stored in Supabase table `registration_requests`.
 * On approve: creates an Account + Student so the person can log in
 * (via "Забыли пароль?" to set their password).
 * Phone is unique — one number = one request / one account.
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

  // Check existing account
  try {
    const cloud = await loadSharedKeys(['accounts'])
    if (cloud?.accounts?.length) {
      const { mergeAccountsFromCloud } = await import('./auth')
      mergeAccountsFromCloud(cloud.accounts)
    }
  } catch {}
  if (listAccounts().some((a) => a.phone === phone || a.phone.replace(/\D/g, '').slice(-10) === phoneKey)) {
    return { ok: false, error: 'exists' }
  }

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

  // Upsert into table by phone
  let tableOk = false
  const sb = getSupabase()
  if (sb) {
    try {
      const { error } = await withTimeout(
        sb.from('registration_requests').upsert({
          id: row.id,
          full_name: row.full_name,
          phone: row.phone,
          category: row.category,
          branch: row.branch,
          status: row.status,
          created_at: row.created_at,
        }, { onConflict: 'phone' }),
        8000,
      )
      if (!error) tableOk = true
      else console.warn('[reg] table upsert:', error.message)
    } catch (e) {
      console.warn('[reg] table upsert exception:', e)
    }
  }

  // app_state: replace any existing by phone
  let stateOk = false
  try {
    const prev = await withTimeout(loadRegRequests(), 6000).catch(() => [] as RegistrationRequest[])
    const next = [row, ...prev.filter((x) => normalizePhone(x.phone) !== phone && x.phone.replace(/\D/g, '').slice(-10) !== phoneKey)]
    stateOk = await withTimeout(saveRegRequests(next), 6000).catch(() => false)
  } catch (e) {
    console.warn('[reg] app_state:', e)
  }

  if (tableOk || stateOk) {
    rememberMyRequest(phone)
    return { ok: true }
  }
  return { ok: false, error: 'save' }
}

/** Remove all approved (and optionally rejected) requests from both table and app_state. */
export async function cleanProcessedRegistrationRequests(keepPending = true): Promise<number> {
  const all = await listRegistrationRequests()
  const toRemove = all.filter((r) => r.status !== 'pending' || !keepPending)
  const remaining = all.filter((r) => !toRemove.some((x) => x.id === r.id))
  await saveRegRequests(remaining)

  const sb = getSupabase()
  if (sb && toRemove.length) {
    const ids = toRemove.map((r) => r.id).filter(Boolean)
    if (ids.length) {
      void Promise.resolve(sb.from('registration_requests').delete().in('id', ids)).then(() => {}).catch(() => {})
    }
  }
  return toRemove.length
}

export async function listRegistrationRequests(): Promise<RegistrationRequest[]> {
  const fromState: RegistrationRequest[] = await loadRegRequests().catch(() => [])

  let fromTable: RegistrationRequest[] = []
  const sb = getSupabase()
  if (sb) {
    try {
      const { data, error } = await withTimeout(
        sb.from('registration_requests').select('*').order('created_at', { ascending: false }).limit(200),
        6000,
      )
      if (!error && Array.isArray(data)) {
        fromTable = data.map((r: Record<string, unknown>) => ({
          id: String(r.id || ''),
          full_name: String(r.full_name || ''),
          phone: String(r.phone || ''),
          category: (r.category as string) || null,
          branch: (r.branch as string) || null,
          status: (r.status as RegistrationRequest['status']) || 'pending',
          created_at: String(r.created_at || new Date().toISOString()),
          reviewed_at: (r.reviewed_at as string) || null,
          note: (r.note as string) || null,
        }))
      }
    } catch (e) {
      console.warn('[reg] table list:', e)
    }
  }

  const byPhone = new Map<string, RegistrationRequest>()
  for (const r of [...fromState, ...fromTable]) {
    if (!r.phone) continue
    const key = normalizePhone(r.phone)
    const prev = byPhone.get(key)
    if (!prev || (r.created_at || '') > (prev.created_at || '')) byPhone.set(key, r)
  }
  return [...byPhone.values()].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export async function setRegistrationRequestStatus(
  id: string,
  status: 'approved' | 'rejected',
  note?: string,
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

export async function approveRegistrationRequest(
  req: RegistrationRequest,
): Promise<{ ok: true; tempPassword: string } | { ok: false; error: string }> {
  const phone = normalizePhone(req.phone)
  const name = req.full_name.trim()
  if (!name || phone.length < 10) return { ok: false, error: 'invalid' }

  const phoneKey = phone.replace(/\D/g, '').slice(-10)

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
    ...remoteStudents.filter((s) => s.id !== student.id && normalizePhone(s.phone) !== phone),
    student,
  ]

  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  const notice = {
    id: `n_reg_${created.accountId}_${Date.now().toString(36)}`,
    kind: 'info' as const,
    title: { ru: 'Заявка одобрена', kk: 'Өтініш мақұлданды' },
    body: {
      ru: `Заявка одобрена! Ваши данные: Имя и фамилия: ${name}. Логин (телефон): ${phone}. Временный пароль: ${tempPassword}. Войдите с этими данными. Чтобы сменить пароль — нажмите «Забыли пароль?» или «Проверить статус заявки» → «Задать пароль».`,
      kk: `Өтініш мақұлданды! Деректеріңіз: Аты-жөні: ${name}. Логин (телефон): ${phone}. Уақытша құпия сөз: ${tempPassword}. Осы деректермен кіріңіз. Құпия сөзді өзгерту үшін — «Құпия сөзді ұмыттыңыз ба?» немесе «Өтініш статусын тексеру» → «Құпия сөз қою».`,
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

  await Promise.all([
    saveSharedKey('accounts', listAccounts()),
    saveSharedKey('students', nextStudents),
    saveSharedKey('notices', nextNotices),
    saveSharedKey('regCredentials', credMap),
    saveRegRequests(nextReqs),
  ])

  const sb = getSupabase()
  if (sb) {
    void Promise.resolve(
      sb.from('registration_requests').update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        note: `temp:${tempPassword}`,
      }).eq('id', req.id),
    ).catch(() => {})
  }

  return { ok: true, tempPassword }
}

const LOCAL_REQ_KEY = 'avtoemir.myRegRequest.v1'

export function rememberMyRequest(phone: string) {
  if (typeof window === 'undefined') return
  try {
    const key = phoneKeyOf(phone)
    if (key.length < 10) return
    localStorage.setItem(LOCAL_REQ_KEY, JSON.stringify({ phoneKey: key, at: Date.now() }))
  } catch { /* ignore */ }
}

export function isMyRequestPhone(phone: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(LOCAL_REQ_KEY)
    if (!raw) return false
    const saved = JSON.parse(raw) as { phoneKey?: string }
    return saved?.phoneKey === phoneKeyOf(phone)
  } catch {
    return false
  }
}

function phoneKeyOf(phone: string) {
  return normalizePhone(phone).replace(/\D/g, '').slice(-10)
}

export async function isRegistrationApprovedByPhone(
  phone: string,
): Promise<{ fullName: string; phone: string } | null> {
  const ph = normalizePhone(phone)
  const key = phoneKeyOf(ph)
  if (key.length < 10) return null

  try {
    const cloud = await withTimeout(loadSharedKeys(['regCredentials', 'registrationRequests']), 5000)
    if (cloud?.regCredentials?.[key]) {
      return { fullName: cloud.regCredentials[key].fullName || '', phone: ph }
    }
    const list = Array.isArray(cloud?.registrationRequests) ? cloud.registrationRequests : []
    const hit = list.find((r: { phone?: string; status?: string }) => phoneKeyOf(r.phone || '') === key && r.status === 'approved')
    if (hit) return { fullName: hit.full_name || '', phone: ph }
  } catch (e) {
    console.warn('[reg] status check:', e)
  }

  const sb = getSupabase()
  if (sb) {
    try {
      const { data, error } = await withTimeout(
        sb.from('registration_requests').select('full_name, phone, status').eq('status', 'approved').limit(200),
        5000,
      )
      if (!error && Array.isArray(data)) {
        for (const r of data as { full_name?: string; phone?: string; status?: string }[]) {
          if (phoneKeyOf(r.phone || '') === key) return { fullName: r.full_name || '', phone: ph }
        }
      }
    } catch { /* ignore */ }
  }
  return null
}

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
