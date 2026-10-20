import { saveSharedKey } from './sync'
import { getSupabase } from './supabase'

/** Student is "online" if the app sent a heartbeat within this window. */
export const ONLINE_WINDOW_MS = 50_000

export function isOnline(lastSeen?: string | null, now = Date.now()): boolean {
  if (!lastSeen) return false
  const ts = Date.parse(lastSeen)
  return Number.isFinite(ts) && now - ts < ONLINE_WINDOW_MS
}

export function newerStamp(a?: string, b?: string): string {
  const ta = a ? Date.parse(a) : 0
  const tb = b ? Date.parse(b) : 0
  if (ta >= tb) return a || b || ''
  return b || a || ''
}

/** One row per student so devices do not overwrite each other. */
export async function touchPresence(ids: string[]): Promise<void> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter((id) => id && id !== 'me'))]
  if (!unique.length) return
  const sb = getSupabase()
  if (!sb) return
  const iso = new Date().toISOString()
  const { error } = await sb.from('presence').upsert(
    unique.map((id) => ({ id, last_seen: iso })),
    { onConflict: 'id' },
  )
  if (!error) return
  console.warn('[presence]', error.message)
  const { data } = await sb.from('app_state').select('data').eq('key', 'presence').maybeSingle()
  const prev =
    data?.data && typeof data.data === 'object' && !Array.isArray(data.data)
      ? (data.data as Record<string, string>)
      : {}
  const next = { ...prev }
  for (const id of unique) next[id] = iso
  await saveSharedKey('presence', next)
}

export async function fetchPresence(): Promise<Record<string, string>> {
  const sb = getSupabase()
  if (!sb) return {}
  const { data, error } = await sb.from('presence').select('id, last_seen')
  if (error || !data) return {}
  const out: Record<string, string> = {}
  for (const row of data) {
    if (row?.id && row.last_seen) out[String(row.id)] = String(row.last_seen)
  }
  return out
}
