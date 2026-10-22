/** Offline-first persistence with cross-tab "real-time" sync via storage events. */

const STORE_KEY = 'avtoemir.store.v2'

export type PersistedSlice = {
  students?: unknown
  school?: unknown
  theory?: unknown
  questions?: unknown
  instructors?: unknown
  reviews?: unknown
  messages?: unknown
  notices?: unknown
  bookings?: unknown
  results?: unknown
  learnedSigns?: unknown
  profiles?: unknown
  theoryProgress?: unknown
  roadSigns?: unknown
  updatedAt?: number
}

export function loadPersisted(): PersistedSlice | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedSlice
  } catch {
    return null
  }
}

function stripDataUrlsDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripDataUrlsDeep)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if ((k === 'imageUrl' || k === 'url') && typeof v === 'string' && v.startsWith('data:')) {
        out[k] = null
        continue
      }
      out[k] = stripDataUrlsDeep(v)
    }
    return out
  }
  return value
}

export function savePersisted(slice: PersistedSlice) {
  if (typeof window === 'undefined') return
  try {
    const payload = { ...(stripDataUrlsDeep(slice) as PersistedSlice), updatedAt: Date.now() }
    localStorage.setItem(STORE_KEY, JSON.stringify(payload))
  } catch {
    try {
      const light = {
        students: slice.students,
        school: slice.school,
        instructors: slice.instructors,
        notices: slice.notices,
        bookings: slice.bookings,
        results: slice.results,
        learnedSigns: slice.learnedSigns,
        profiles: slice.profiles,
        theoryProgress: slice.theoryProgress,
        updatedAt: Date.now(),
      }
      localStorage.setItem(STORE_KEY, JSON.stringify(light))
    } catch {
      /* ignore */
    }
  }
}

/** Subscribe to changes from other tabs (real-time-ish sync without a server). */
export function onPersistedChange(cb: (data: PersistedSlice) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: StorageEvent) => {
    if (e.key !== STORE_KEY || !e.newValue) return
    try {
      cb(JSON.parse(e.newValue) as PersistedSlice)
    } catch {
      /* ignore */
    }
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
