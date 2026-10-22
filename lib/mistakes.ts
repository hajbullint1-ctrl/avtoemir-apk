/**
 * Work-on-mistakes: localStorage + Supabase app_state.studentMistakes
 * Cloud is source of truth when available; local is offline cache.
 * Always merge so concurrent devices don't wipe each other.
 */

import { getSupabase, isSupabaseConfigured } from './supabase'
import { mergeMistakeMaps } from './sync'

const LS_KEY = 'avtoemir_student_mistakes'

type MistakeMap = Record<string, string[]>

function readLocal(): MistakeMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as MistakeMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeLocal(map: MistakeMap) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

async function loadCloud(): Promise<MistakeMap> {
  if (!isSupabaseConfigured) return {}
  const sb = getSupabase()
  if (!sb) return {}
  try {
    const { data, error } = await sb.from('app_state').select('data').eq('key', 'studentMistakes').maybeSingle()
    if (error || !data?.data || typeof data.data !== 'object' || Array.isArray(data.data)) return {}
    return data.data as MistakeMap
  } catch {
    return {}
  }
}

async function saveCloud(map: MistakeMap): Promise<void> {
  if (!isSupabaseConfigured) return
  const sb = getSupabase()
  if (!sb) return
  try {
    const remote = await loadCloud()
    const merged = mergeMistakeMaps(remote, map)
    writeLocal(merged)
    await sb.from('app_state').upsert(
      { key: 'studentMistakes', data: merged, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
  } catch (e) {
    console.warn('[mistakes] save cloud', e)
  }
}

/** Sync local cache with cloud (call on app ready / tab open). */
export async function hydrateMistakes(): Promise<MistakeMap> {
  const local = readLocal()
  const remote = await loadCloud()
  const merged = mergeMistakeMaps(local, remote)
  writeLocal(merged)
  if (isSupabaseConfigured && Object.keys(merged).length) {
    void saveCloud(merged)
  }
  return merged
}

export function getMistakeIds(studentId: string): string[] {
  const map = readLocal()
  return Array.isArray(map[studentId]) ? [...map[studentId]] : []
}

/** Alias used by tab-tests */
export async function fetchUnresolvedMistakeIds(studentId: string): Promise<string[]> {
  await hydrateMistakes()
  return getMistakeIds(studentId)
}

export function recordMistake(studentId: string, questionId: string) {
  if (!studentId || !questionId) return
  const map = readLocal()
  const list = new Set(map[studentId] ?? [])
  list.add(questionId)
  map[studentId] = [...list]
  writeLocal(map)
  void saveCloud(map)
}

export function resolveMistake(studentId: string, questionId: string) {
  if (!studentId || !questionId) return
  const map = readLocal()
  map[studentId] = (map[studentId] ?? []).filter((id) => id !== questionId)
  writeLocal(map)
  void saveCloud(map)
}
