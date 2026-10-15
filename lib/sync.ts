/**
 * Sync shared slices (school, instructors, notices) with Supabase.
 * Falls back to local-only when NEXT_PUBLIC_SUPABASE_* env vars are missing.
 */

import { getSupabase, isSupabaseConfigured } from './supabase'
import type { Instructor, Notice, School } from './data'

export type SharedSlice = {
  school?: School
  instructors?: Instructor[]
  notices?: Notice[]
}

const KEYS = ['school', 'instructors', 'notices'] as const

/** Load shared data from Supabase. Returns null if not configured or on error. */
export async function loadSharedFromCloud(): Promise<SharedSlice | null> {
  const sb = getSupabase()
  if (!sb) return null

  try {
    const { data, error } = await sb.from('app_state').select('key, data').in('key', [...KEYS])
    if (error) {
      console.warn('[sync] load error:', error.message)
      return null
    }
    if (!data?.length) return null

    const out: SharedSlice = {}
    for (const row of data) {
      if (row.key === 'school' && row.data && typeof row.data === 'object' && !Array.isArray(row.data)) {
        const s = row.data as School
        if (s.name) out.school = s
      }
      if (row.key === 'instructors' && Array.isArray(row.data)) {
        out.instructors = (row.data as Instructor[]).map((i) => ({
          ...i,
          phone: typeof i.phone === 'string' ? i.phone : '',
        }))
      }
      if (row.key === 'notices' && Array.isArray(row.data)) {
        out.notices = row.data as Notice[]
      }
    }
    return out
  } catch (e) {
    console.warn('[sync] load exception:', e)
    return null
  }
}

/** Upsert one shared key. No-op if Supabase is not configured. */
export async function saveSharedKey(key: (typeof KEYS)[number], data: unknown): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false

  try {
    const { error } = await sb.from('app_state').upsert(
      { key, data, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
    if (error) {
      console.warn(`[sync] save ${key}:`, error.message)
      return false
    }
    return true
  } catch (e) {
    console.warn(`[sync] save ${key} exception:`, e)
    return false
  }
}

/** Push school + instructors + notices to the cloud. */
export async function saveSharedToCloud(slice: SharedSlice): Promise<void> {
  if (!isSupabaseConfigured) return
  const tasks: Promise<boolean>[] = []
  if (slice.school) tasks.push(saveSharedKey('school', slice.school))
  if (slice.instructors) tasks.push(saveSharedKey('instructors', slice.instructors))
  if (slice.notices) tasks.push(saveSharedKey('notices', slice.notices))
  await Promise.all(tasks)
}

export { isSupabaseConfigured }
