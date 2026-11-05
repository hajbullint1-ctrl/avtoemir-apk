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
  const { data: existing } = await sb
    .from('registration_requests')
    .select('id')
    .eq('phone', phone)
    .eq('status', 'pending')
    .limit(1)
  if (existing && existing.length > 0) return { ok: false, error: 'exists' }

  const row = {
    id: uid(),
    full_name: name,
    phone,
    category: input.category || null,
    branch: input.branch || null,
    status: 'pending' as const,
    created_at: new Date().toISOString(),
  }

  const { error } = await sb.from('registration_requests').insert(row)
  if (error) {
    console.warn('[reg] submit:', error.message)
    return { ok: false, error: 'save' }
  }
  return { ok: true }
}

export async function listRegistrationRequests(): Promise<RegistrationRequest[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data, error } = await sb
    .from('registration_requests')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[reg] list:', error.message)
    return []
  }
  return (data ?? []) as RegistrationRequest[]
}

export async function setRegistrationRequestStatus(
  id: string,
  status: 'approved' | 'rejected',
  note?: string,
): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { error } = await sb
    .from('registration_requests')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      note: note ?? null,
    })
    .eq('id', id)
  if (error) {
    console.warn('[reg] status:', error.message)
    return false
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
