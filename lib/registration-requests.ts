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
import { saveSharedKey } from './sync'
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
  const sb = getSupabase()
  if (!sb) return []
  try {
    const { data, error } = await withTimeout(
      sb.from('app_state').select('data').eq('key', 'registrationRequests').maybeSingle(),
      8000,
    )
    if (error || !data?.data) return []
    return Array.isArray(data.data) ? (data.data as RegistrationRequest[]) : []
  } catch {
    return []
  }
}

async function saveRegRequests(list: RegistrationRequest[]): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  try {
    const { error } = await withTimeout(
      sb.from('app_state').upsert(
        { key: 'registrationRequests', data: list, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      ),
      8000,
    )
    return !error
  } catch {
    return false
  }
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

  // Temporary password so the account exists; student should use "Забыли пароль?"
  const tempPassword = `Emir${Math.floor(1000 + Math.random() * 9000)}`

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
  const { loadSharedKeys, saveStudentsLocalWins } = await import('./sync')
  const cloud = await loadSharedKeys(['students'])
  const remote = (cloud?.students || []) as Student[]
  const nextStudents = [...remote.filter((s) => s.id !== student.id && s.phone !== phone), student]
  await saveStudentsLocalWins(nextStudents)

  await setRegistrationRequestStatus(req.id, 'approved')
  return { ok: true, tempPassword }
}
