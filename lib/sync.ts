/**
 * Sync shared app state with Supabase (app_state table).
 * Content arrays are merged by id so a short client never wipes the cloud.
 */

import { getSupabase, isSupabaseConfigured } from './supabase'
import type {
  Booking, Instructor, Message, Notice, Question, Review, School, Student, TestResult, TheoryTopic, RoadSign,
} from './data'
import type { Account, PasswordRecoveryRequest } from './auth'
import type { ProfileRow } from './cloud-features'

export type SharedSlice = {
  school?: School
  instructors?: Instructor[]
  notices?: Notice[]
  students?: Student[]
  theory?: TheoryTopic[]
  questions?: Question[]
  reviews?: Review[]
  messages?: Message[]
  bookings?: Booking[]
  accounts?: Account[]
  recovery?: PasswordRecoveryRequest[]
  results?: TestResult[]
  learnedSigns?: string[]
  profiles?: ProfileRow[]
  theoryProgress?: Record<string, string[]>
  roadSigns?: RoadSign[]
  presence?: Record<string, string>
  droppedMessageIds?: string[]
  studentMistakes?: Record<string, string[]>
  deletedStudentIds?: string[]
  deletedAccountIds?: string[]
  /** Full snapshots for restore in admin */
  deletedRecords?: DeletedRecord[]
  maintenanceMode?: boolean
}

export type DeletedRecord = {
  id: string
  deletedAt: string
  student: Student | null
  account: Account | null
}

const KEYS = [
  'school', 'instructors', 'notices', 'students', 'theory', 'questions', 'reviews',
  'messages', 'bookings', 'accounts', 'recovery', 'results', 'learnedSigns', 'profiles',
  'theoryProgress', 'roadSigns', 'presence', 'droppedMessageIds', 'studentMistakes',
  'deletedStudentIds', 'deletedAccountIds', 'deletedRecords', 'maintenanceMode',
] as const

export type SharedKey = (typeof KEYS)[number]

function normalizeInstructors(list: Instructor[]): Instructor[] {
  return list.map((i) => ({ ...i, phone: typeof i.phone === 'string' ? i.phone : '' }))
}

function isLegacyDemoStudent(s: Student): boolean {
  const n = (s.name || '').toLowerCase()
  return s.id === 'me' || n.includes('aidana')
}

export function mergeById<T extends { id: string; imageUrl?: string | null }>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>()
  for (const list of [a, b]) {
    for (const item of list) {
      if (!item?.id) continue
      const prev = map.get(item.id)
      if (!prev) { map.set(item.id, item); continue }
      const imageUrl = item.imageUrl || prev.imageUrl || null
      map.set(item.id, { ...prev, ...item, imageUrl })
    }
  }
  return [...map.values()]
}

const STATUS_RANK: Record<string, number> = { draft: 0, pending: 1, rejected: 2, approved: 3 }

function preferDoc(
  a: Student['docs'][keyof Student['docs']] | null | undefined,
  b: Student['docs'][keyof Student['docs']] | null | undefined,
): Student['docs'][keyof Student['docs']] | null {
  const score = (d: typeof a) => {
    if (!d?.url) return 0
    if (d.url.startsWith('http')) return 3
    if (d.url.startsWith('data:')) return 2
    if (d.url.startsWith('blob:')) return 1
    return 0
  }
  return score(a) >= score(b) ? (a ?? null) : (b ?? null)
}

function hasAnyDoc(s: Student): boolean {
  const d = s.docs
  return !!(d?.idFront?.url || d?.idBack?.url || d?.psycho?.url || d?.narco?.url)
}

function isDocsReset(s: Student): boolean {
  return s.status === 'draft' && !s.submittedAt && !hasAnyDoc(s)
}

export function mergeStudents(
  a: Student[],
  b: Student[],
  deleted: string[] = [],
  preferSecondStatus = false,
): Student[] {
  const ban = new Set(['me', ...deleted])
  const map = new Map<string, Student>()
  for (const list of [a, b]) {
    for (const s of list) {
      if (!s?.id || ban.has(s.id) || isLegacyDemoStudent(s)) continue
      const prev = map.get(s.id)
      if (!prev) {
        map.set(s.id, {
          ...s,
          docs: {
            idFront: s.docs?.idFront ?? null,
            idBack: s.docs?.idBack ?? null,
            psycho: s.docs?.psycho ?? null,
            narco: s.docs?.narco ?? null,
          },
        })
        continue
      }

      const rankS = STATUS_RANK[s.status] ?? 0
      const rankP = STATUS_RANK[prev.status] ?? 0
      const intentionalEmpty =
        isDocsReset(s) && (preferSecondStatus || rankP >= 1)

      let docs: Student['docs']
      if (intentionalEmpty) {
        docs = { idFront: null, idBack: null, psycho: null, narco: null }
      } else {
        docs = {
          idFront: preferDoc(s.docs?.idFront, prev.docs?.idFront),
          idBack: preferDoc(s.docs?.idBack, prev.docs?.idBack),
          psycho: preferDoc(s.docs?.psycho, prev.docs?.psycho),
          narco: preferDoc(s.docs?.narco, prev.docs?.narco),
        }
      }

      let status: Student['status']
      if (intentionalEmpty) status = 'draft'
      else if (rankS > rankP) status = s.status
      else if (rankS < rankP) status = prev.status
      else status = preferSecondStatus ? s.status : prev.status

      let submittedAt = intentionalEmpty ? null : (s.submittedAt || prev.submittedAt)
      let readyDate = intentionalEmpty ? null : (s.readyDate || prev.readyDate)
      if (s.status === 'rejected' && preferSecondStatus) {
        status = 'rejected'
        readyDate = null
      }

      const tS = Date.parse(s.updatedAt || '') || 0
      const tP = Date.parse(prev.updatedAt || '') || 0
      if (tS > tP && tS > 0) {
        docs = {
          idFront: s.docs?.idFront ?? null,
          idBack: s.docs?.idBack ?? null,
          psycho: s.docs?.psycho ?? null,
          narco: s.docs?.narco ?? null,
        }
        status = s.status
        submittedAt = s.submittedAt ?? null
        readyDate = s.readyDate ?? null
      } else if (tP > tS && tP > 0) {
        docs = {
          idFront: prev.docs?.idFront ?? null,
          idBack: prev.docs?.idBack ?? null,
          psycho: prev.docs?.psycho ?? null,
          narco: prev.docs?.narco ?? null,
        }
        status = prev.status
        submittedAt = prev.submittedAt ?? null
        readyDate = prev.readyDate ?? null
      }

      map.set(s.id, {
        ...prev,
        ...s,
        docs,
        readyDate,
        submittedAt,
        status,
        updatedAt: tS >= tP ? (s.updatedAt || prev.updatedAt) : (prev.updatedAt || s.updatedAt),
        name: s.name || prev.name,
        phone: s.phone || prev.phone,
        category: s.category || prev.category,
      })
    }
  }
  return [...map.values()]
}

export function mergeStringLists(a: string[], b: string[]): string[] {
  return [...new Set([...(a || []), ...(b || [])])]
}

export function mergeProgressMaps(
  a: Record<string, string[]> = {},
  b: Record<string, string[]> = {},
): Record<string, string[]> {
  const out: Record<string, string[]> = { ...a }
  for (const [sid, lessons] of Object.entries(b)) {
    out[sid] = mergeStringLists(out[sid] || [], lessons || [])
  }
  return out
}

export function mergeMistakeMaps(
  a: Record<string, string[]> = {},
  b: Record<string, string[]> = {},
): Record<string, string[]> {
  return mergeProgressMaps(a, b)
}

function parseRow(out: SharedSlice, key: string, d: unknown) {
  switch (key) {
    case 'school':
      if (d && typeof d === 'object' && !Array.isArray(d) && (d as School).name) out.school = d as School
      break
    case 'instructors':
      if (Array.isArray(d) && d.length) out.instructors = normalizeInstructors(d as Instructor[])
      break
    case 'notices':
      if (Array.isArray(d)) out.notices = d as Notice[]
      break
    case 'students':
      if (Array.isArray(d) && d.length) out.students = d as Student[]
      break
    case 'theory':
      if (Array.isArray(d) && d.length) out.theory = d as TheoryTopic[]
      break
    case 'questions':
      if (Array.isArray(d) && d.length) out.questions = d as Question[]
      break
    case 'reviews':
      if (Array.isArray(d)) out.reviews = d as Review[]
      break
    case 'messages':
      if (Array.isArray(d)) out.messages = d as Message[]
      break
    case 'bookings':
      if (Array.isArray(d)) out.bookings = d as Booking[]
      break
    case 'accounts':
      if (Array.isArray(d)) out.accounts = d as Account[]
      break
    case 'recovery':
      if (Array.isArray(d)) out.recovery = d as PasswordRecoveryRequest[]
      break
    case 'results':
      if (Array.isArray(d)) out.results = d as TestResult[]
      break
    case 'learnedSigns':
      if (Array.isArray(d)) out.learnedSigns = d as string[]
      break
    case 'profiles':
      if (Array.isArray(d)) out.profiles = d as ProfileRow[]
      break
    case 'theoryProgress':
      if (d && typeof d === 'object' && !Array.isArray(d)) out.theoryProgress = d as Record<string, string[]>
      break
    case 'roadSigns':
      if (Array.isArray(d)) out.roadSigns = d as RoadSign[]
      break
    case 'presence':
      if (d && typeof d === 'object' && !Array.isArray(d)) out.presence = d as Record<string, string>
      break
    case 'droppedMessageIds':
      if (Array.isArray(d)) out.droppedMessageIds = d.filter((id) => typeof id === 'string') as string[]
      break
    case 'studentMistakes':
      if (d && typeof d === 'object' && !Array.isArray(d)) out.studentMistakes = d as Record<string, string[]>
      break
    case 'deletedStudentIds':
      if (Array.isArray(d)) out.deletedStudentIds = d.filter((id) => typeof id === 'string') as string[]
      break
    case 'deletedAccountIds':
      if (Array.isArray(d)) out.deletedAccountIds = d.filter((id) => typeof id === 'string') as string[]
      break
    case 'deletedRecords':
      if (Array.isArray(d)) {
        out.deletedRecords = d
          .filter((x) => x && typeof x === 'object' && typeof (x as DeletedRecord).id === 'string')
          .map((x) => x as DeletedRecord)
      }
      break
    case 'maintenanceMode':
      out.maintenanceMode = Boolean(d === true || (d && typeof d === 'object' && (d as { enabled?: boolean }).enabled === true))
      break
  }
}

export async function loadSharedFromCloud(): Promise<SharedSlice | null> {
  const sb = getSupabase()
  if (!sb) return null
  try {
    const { data, error } = await sb.from('app_state').select('key, data').in('key', [...KEYS])
    if (error) { console.warn('[sync] load error:', error.message); return null }
    if (!data?.length) return null
    const out: SharedSlice = {}
    for (const row of data) parseRow(out, row.key, row.data)
    return out
  } catch (e) {
    console.warn('[sync] load exception:', e)
    return null
  }
}

export async function loadSharedKeys(keys: SharedKey[]): Promise<SharedSlice | null> {
  const sb = getSupabase()
  if (!sb) return null
  try {
    const { data, error } = await sb.from('app_state').select('key, data').in('key', keys)
    if (error) { console.warn('[sync] load keys:', error.message); return null }
    const out: SharedSlice = {}
    for (const row of data ?? []) parseRow(out, row.key, row.data)
    return out
  } catch (e) {
    console.warn('[sync] load keys exception:', e)
    return null
  }
}

export async function loadMessagesBundle(): Promise<{ messages: Message[]; droppedMessageIds: string[] } | null> {
  const sb = getSupabase()
  if (!sb) return { messages: [], droppedMessageIds: [] }
  try {
    const { data, error } = await sb.from('app_state').select('key, data').in('key', ['messages', 'droppedMessageIds'])
    if (error) { console.warn('[sync] messages load:', error.message); return null }
    let messages: Message[] = []
    let droppedMessageIds: string[] = []
    for (const row of data ?? []) {
      if (row.key === 'messages' && Array.isArray(row.data)) messages = row.data as Message[]
      if (row.key === 'droppedMessageIds' && Array.isArray(row.data)) {
        droppedMessageIds = (row.data as unknown[]).filter((id) => typeof id === 'string') as string[]
      }
    }
    return { messages, droppedMessageIds }
  } catch (e) {
    console.warn('[sync] messages load exception:', e)
    return null
  }
}

function sanitizeStudentsForCloud(list: unknown): unknown {
  if (!Array.isArray(list)) return list
  return list.map((raw) => {
    const s = raw as Student
    if (!s || typeof s !== 'object') return raw
    const docsIn = s.docs || ({} as Student['docs'])
    const clean = (d: Student['docs'][keyof Student['docs']] | null | undefined) => {
      if (!d?.url) return null
      if (d.url.startsWith('http')) return d
      if (d.url.startsWith('data:') && d.url.length < 400_000) return d
      return null
    }
    return {
      ...s,
      docs: {
        idFront: clean(docsIn.idFront),
        idBack: clean(docsIn.idBack),
        psycho: clean(docsIn.psycho),
        narco: clean(docsIn.narco),
      },
    }
  })
}

export async function saveSharedKey(key: SharedKey, data: unknown): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const payload = key === 'students' ? sanitizeStudentsForCloud(data) : data
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { error } = await sb.from('app_state').upsert(
        { key, data: payload, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      )
      if (!error) return true
      console.warn(`[sync] save ${key} attempt ${attempt + 1}:`, error.message)
    } catch (e) {
      console.warn(`[sync] save ${key} exception attempt ${attempt + 1}:`, e)
    }
    await new Promise((r) => setTimeout(r, 250 * (attempt + 1)))
  }
  return false
}

/** Merge tombstones + snapshots and write all three keys to Supabase together. */
export async function saveDeletedBundle(opts: {
  addIds?: string[]
  removeIds?: string[]
  addRecords?: DeletedRecord[]
  removeRecordIds?: string[]
  replaceRecords?: DeletedRecord[]
}): Promise<{ ok: boolean; records: DeletedRecord[]; deletedIds: string[] }> {
  const cloud = await loadSharedKeys(['deletedAccountIds', 'deletedStudentIds', 'deletedRecords'])
  const del = new Set<string>([...(cloud?.deletedAccountIds || []), ...(cloud?.deletedStudentIds || [])])
  for (const id of opts.addIds || []) if (id) del.add(id)
  for (const id of opts.removeIds || []) del.delete(id)

  let records: DeletedRecord[]
  if (opts.replaceRecords) {
    records = opts.replaceRecords
  } else {
    const map = new Map<string, DeletedRecord>()
    for (const r of cloud?.deletedRecords || []) {
      if (r?.id) map.set(r.id, r)
    }
    for (const r of opts.addRecords || []) {
      if (r?.id) map.set(r.id, r)
    }
    for (const id of opts.removeRecordIds || []) map.delete(id)
    for (const id of opts.removeIds || []) map.delete(id)
    records = [...map.values()]
      .sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''))
      .slice(0, 200)
  }

  for (const r of records) if (r?.id) del.add(r.id)

  const deletedIds = [...del]
  const [a, b, c] = await Promise.all([
    saveSharedKey('deletedAccountIds', deletedIds),
    saveSharedKey('deletedStudentIds', deletedIds),
    saveSharedKey('deletedRecords', records),
  ])
  return { ok: a && b && c, records, deletedIds }
}

/** Subscribe to app_state changes (Supabase Realtime). Returns unsubscribe. */
export function subscribeAppState(
  keys: SharedKey[],
  onChange: (changedKey: string) => void,
): () => void {
  const sb = getSupabase()
  if (!sb) return () => {}
  const keySet = new Set<string>(keys)
  const channel = sb
    .channel(`app_state_${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_state' },
      (payload) => {
        const row = (payload.new || payload.old) as { key?: string } | null
        const k = row?.key
        if (k && keySet.has(k)) onChange(k)
      },
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') console.warn('[sync] realtime channel error')
    })
  return () => {
    void sb.removeChannel(channel)
  }
}

/** Save school without letting a stale empty website/instagram wipe cloud values. */
export async function saveSchoolMerged(local: School): Promise<School> {
  const cloud = await loadSharedKeys(['school'])
  const remote = cloud?.school
  const merged: School = remote
    ? {
        ...remote,
        ...local,
        website: (local.website ?? '').trim() || remote.website || '',
        instagram: (local.instagram ?? '').trim() || remote.instagram || '',
        phoneEnrollment: (local.phoneEnrollment ?? '').trim() || remote.phoneEnrollment || '',
        phoneSupport: (local.phoneSupport ?? '').trim() || remote.phoneSupport || '',
        phones: Array.isArray(local.phones) && local.phones.length ? local.phones : (remote.phones || []),
        branches: Array.isArray(local.branches) && local.branches.length ? local.branches : (remote.branches || []),
        name: (local.name || '').trim() || remote.name,
        about: local.about?.ru || local.about?.kk ? local.about : remote.about,
        hours: local.hours?.ru || local.hours?.kk ? local.hours : remote.hours,
        examAddress: local.examAddress?.ru || local.examAddress?.kk ? local.examAddress : remote.examAddress,
        routes: Array.isArray(local.routes) && local.routes.length ? local.routes : remote.routes,
      }
    : local
  const ok = await saveSharedKey('school', merged)
  if (!ok) console.warn('[sync] saveSchoolMerged failed to write school')
  return merged
}

export async function saveStudentsLocalWins(local: Student[]): Promise<Student[]> {
  const cloud = await loadSharedKeys(['students'])
  const remote = (cloud?.students || []) as Student[]
  const map = new Map<string, Student>()
  for (const s of remote) {
    if (s?.id) map.set(s.id, s)
  }
  for (const s of local) {
    if (!s?.id || s.id === 'me') continue
    const prev = map.get(s.id)
    if (!prev) {
      map.set(s.id, { ...s, updatedAt: s.updatedAt || new Date().toISOString() })
      continue
    }
    const tLocal = Date.parse(s.updatedAt || '') || 0
    const tPrev = Date.parse(prev.updatedAt || '') || 0
    const rankL = STATUS_RANK[s.status] ?? 0
    const rankR = STATUS_RANK[prev.status] ?? 0
    const localWins =
      tLocal > tPrev ||
      (tLocal === tPrev && tLocal > 0) ||
      (tLocal === 0 && tPrev === 0 && rankL >= rankR)

    if (localWins) {
      map.set(s.id, {
        ...prev,
        ...s,
        docs: s.docs ?? prev.docs,
        status: s.status,
        readyDate: s.readyDate ?? null,
        submittedAt: s.submittedAt ?? null,
        updatedAt: s.updatedAt || (tLocal ? s.updatedAt : new Date().toISOString()),
        name: s.name || prev.name,
        phone: s.phone || prev.phone,
        category: s.category || prev.category,
      })
    } else {
      map.set(s.id, {
        ...prev,
        name: prev.name || s.name,
        phone: prev.phone || s.phone,
        category: prev.category || s.category,
      })
    }
  }
  const merged = [...map.values()].filter((s) => s.id !== 'me')
  await saveSharedKey('students', merged)
  return merged
}

/** Local list is source of truth for which booking IDs exist (supports cancel). */
export async function saveBookingsMerged(local: Booking[], removedIds: string[] = []): Promise<Booking[]> {
  const cloud = await loadSharedKeys(['bookings'])
  const remote = (cloud?.bookings || []) as Booking[]
  const localIds = new Set(local.map((b) => b.id))
  const removed = new Set(removedIds)
  const map = new Map<string, Booking>()
  for (const b of local) if (b?.id && !removed.has(b.id)) map.set(b.id, b)
  for (const b of remote) {
    if (!b?.id || removed.has(b.id) || localIds.has(b.id)) continue
    map.set(b.id, b)
  }
  const merged = [...map.values()]
  await saveSharedKey('bookings', merged)
  return merged
}


/** Merge messages so new local messages are not lost; respect dropped IDs. */
export async function saveMessagesMerged(local: Message[], droppedExtra: string[] = []): Promise<{ messages: Message[]; droppedMessageIds: string[] }> {
  const cloud = await loadSharedKeys(['messages', 'droppedMessageIds'])
  const remote = (cloud?.messages || []) as Message[]
  const dropped = new Set([...(cloud?.droppedMessageIds || []), ...droppedExtra])
  const map = new Map<string, Message>()
  for (const m of remote) if (m?.id && !dropped.has(m.id)) map.set(m.id, m)
  for (const m of local) if (m?.id && !dropped.has(m.id)) map.set(m.id, m)
  const merged = [...map.values()]
  const droppedArr = [...dropped]
  await Promise.all([
    saveSharedKey('messages', merged),
    saveSharedKey('droppedMessageIds', droppedArr),
  ])
  return { messages: merged, droppedMessageIds: droppedArr }
}


/** Notices: local list is source of truth for which IDs exist. */
export async function saveNoticesMerged(local: Notice[], removedIds: string[] = []): Promise<Notice[]> {
  const cloud = await loadSharedKeys(['notices'])
  const remote = (cloud?.notices || []) as Notice[]
  const localIds = new Set(local.map((n) => n.id))
  const removed = new Set(removedIds)
  const map = new Map<string, Notice>()
  for (const n of local) if (n?.id && !removed.has(n.id)) map.set(n.id, n)
  for (const n of remote) {
    if (!n?.id || removed.has(n.id) || localIds.has(n.id)) continue
    map.set(n.id, n)
  }
  const merged = [...map.values()]
  await saveSharedKey('notices', merged)
  return merged
}

export async function forceSaveResults(list: TestResult[]): Promise<void> {
  await saveSharedKey('results', list)
}

export async function saveMergedById<T extends { id: string }>(key: SharedKey, local: T[]): Promise<T[]> {
  const cloud = await loadSharedKeys([key])
  const remote = ((cloud?.[key] || []) as unknown) as T[]
  const merged = mergeById(remote as any, local as any) as T[]
  await saveSharedKey(key, merged)
  return merged
}

export async function saveInstructorsSafe(local: Instructor[]): Promise<Instructor[]> {
  return saveMergedById('instructors', local)
}

export async function saveContentListSafe<T extends { id: string }>(key: SharedKey, local: T[]): Promise<T[]> {
  if (!local.length) {
    await saveSharedKey(key, local)
    return local
  }
  const cloud = await loadSharedKeys([key])
  const remote = ((cloud?.[key] || []) as unknown) as T[]
  if (local.length <= remote.length) {
    await saveSharedKey(key, local)
    return local
  }
  const localMap = new Map(local.map((i) => [i.id, i]))
  const result = remote.map((r) => {
    const l = localMap.get(r.id)
    return l ? { ...r, ...l } : r
  })
  await saveSharedKey(key, result)
  return result
}

export const LIVE_KEYS: SharedKey[] = [
  'students', 'notices', 'messages', 'droppedMessageIds', 'presence', 'accounts',
  'recovery', 'bookings', 'results', 'deletedStudentIds', 'deletedAccountIds', 'deletedRecords',
  'maintenanceMode', 'instructors', 'theory', 'questions', 'reviews', 'roadSigns',
]

export const CONTENT_KEYS: SharedKey[] = [
  'school', 'instructors', 'theory', 'questions', 'reviews', 'roadSigns',
  'learnedSigns', 'profiles', 'theoryProgress', 'studentMistakes',
]

export async function saveSharedToCloud(slice: SharedSlice): Promise<void> {
  if (!isSupabaseConfigured) return
  const tasks: Promise<unknown>[] = []
  if (slice.school) tasks.push(saveSchoolMerged(slice.school))
  if (slice.instructors) tasks.push(saveInstructorsSafe(slice.instructors))
  if (slice.notices) tasks.push(saveContentListSafe('notices', slice.notices))
  if (slice.students) tasks.push(saveStudentsLocalWins(slice.students))
  if (slice.theory) tasks.push(saveContentListSafe('theory', slice.theory))
  if (slice.questions) tasks.push(saveContentListSafe('questions', slice.questions))
  if (slice.reviews) tasks.push(saveContentListSafe('reviews', slice.reviews))
  if (slice.messages) tasks.push(saveSharedKey('messages', slice.messages))
  if (slice.bookings) tasks.push(saveSharedKey('bookings', slice.bookings))
  if (slice.accounts) tasks.push(saveSharedKey('accounts', slice.accounts))
  if (slice.recovery) tasks.push(saveSharedKey('recovery', slice.recovery))
  if (slice.learnedSigns) {
    tasks.push((async () => {
      const cloud = await loadSharedKeys(['learnedSigns'])
      await saveSharedKey('learnedSigns', mergeStringLists(cloud?.learnedSigns || [], slice.learnedSigns || []))
    })())
  }
  if (slice.profiles) tasks.push(saveSharedKey('profiles', slice.profiles))
  if (slice.theoryProgress) {
    tasks.push((async () => {
      const cloud = await loadSharedKeys(['theoryProgress'])
      await saveSharedKey('theoryProgress', mergeProgressMaps(cloud?.theoryProgress || {}, slice.theoryProgress || {}))
    })())
  }
  if (slice.roadSigns) tasks.push(saveContentListSafe('roadSigns', slice.roadSigns))
  if (slice.presence) tasks.push(saveSharedKey('presence', slice.presence))
  if (slice.droppedMessageIds) tasks.push(saveSharedKey('droppedMessageIds', slice.droppedMessageIds))
  if (slice.studentMistakes) {
    tasks.push((async () => {
      const cloud = await loadSharedKeys(['studentMistakes'])
      await saveSharedKey('studentMistakes', mergeMistakeMaps(cloud?.studentMistakes || {}, slice.studentMistakes || {}))
    })())
  }
  if (slice.maintenanceMode !== undefined) tasks.push(saveSharedKey('maintenanceMode', slice.maintenanceMode))
  // deleted* keys are written only via saveDeletedBundle (atomic merge) — never overwrite here
  await Promise.all(tasks)
}

export { isSupabaseConfigured }
