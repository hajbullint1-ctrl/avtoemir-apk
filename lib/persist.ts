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

export function savePersisted(slice: PersistedSlice) {
  if (typeof window === 'undefined') return
  try {
    const payload = { ...slice, updatedAt: Date.now() }
    localStorage.setItem(STORE_KEY, JSON.stringify(payload))
  } catch {
    // quota exceeded — ignore
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
