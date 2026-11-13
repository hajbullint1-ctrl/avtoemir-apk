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

  // Fast path: only app_state (table checks used to wait up to 8s+6s and freeze the button)
  try {
    const prev = await withTimeout(loadRegRequests(), 8000).catch(() => [] as RegistrationRequest[])
    if (
      prev.some(
        (r) =>
          r.status === 'pending' &&
          (normalizePhone(r.phone) === phone || r.phone.replace(/\D/g, '').slice(-10) === phoneKey),
      )
    ) {
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

    const next = [
      row,
      ...prev.filter(
        (x) =>
          x.id !== row.id &&
          normalizePhone(x.phone) !== phone &&
          x.phone.replace(/\D/g, '').slice(-10) !== phoneKey,
      ),
    ]
    const ok = await withTimeout(saveRegRequests(next), 8000)
    if (!ok) {
      console.warn('[reg] save failed, retrying once')
      const ok2 = await withTimeout(saveRegRequests(next), 8000).catch(() => false)
      if (!ok2) return { ok: false, error: 'save' }
    }
  } catch (e) {
    console.warn('[reg] submit app_state:', e)
    return { ok: false, error: 'save' }
  }

  // Optional table write — never block UI
  const sb = getSupabase()
  if (sb) {
    void Promise.resolve(
      sb.from('registration_requests').insert({
        full_name: name,
        phone,
        category: input.category || null,
        branch: input.branch || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      }),
    ).catch((e) => console.warn('[reg] table insert skipped:', e))
  }

  return { ok: true }
}
