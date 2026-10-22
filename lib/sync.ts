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
  maintenanceMode?: boolean
}

const KEYS = [
  'school', 'instructors', 'notices', 'students', 'theory', 'questions', 'reviews',
  'messages', 'bookings', 'accounts', 'recovery', 'results', 'learnedSigns', 'profiles',
  'theoryProgress', 'roadSigns', 'presence', 'droppedMessageIds', 'studentMistakes',
  'deletedStudentIds', 'deletedAccountIds', 'maintenanceMode',
] as const

export type SharedKey = (typeof KEYS)[number]

function normalizeInstructors(list: Instructor[]): Instructor[] {
  return list.map((i) => ({ ...i, phone: typeof i.phone === 'string' ? i.phone : '' }))
}

function isLegacyDemoStudent(s: Student): boolean {
  const n = (s.name || '').toLowerCase()
  return s.id === 'me' || n.includes('айдана') || n.includes('aidana')
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

const STATUS_RANK: Record<string, number> = { draft: 0, pending: 1, rejected: 1, approved: 2 }

export function mergeStudents(a: Student[], b: Student[], deleted: string[] = []): Student[] {
  const ban = new Set(['me', ...deleted])
  const map = new Map<string, Student>()
  for (const list of [a, b]) {
    for (const s of list) {
      if (!s?.id || ban.has(s.id) || isLegacyDemoStudent(s)) continue
      const prev = map.get(s.id)
      if (!prev) { map.set(s.id, s); continue }
      const docs = { ...prev.docs }
      for (const k of Object.keys(s.docs || {}) as (keyof Student['docs'])[]) {
        if (s.docs[k]) docs[k] = s.docs[k]
      }
      const rankS = STATUS_RANK[s.status] ?? 0
      const rankP = STATUS_RANK[prev.status] ?? 0
      map.set(s.id, {
        ...prev, ...s, docs,
        readyDate: s.readyDate || prev.readyDate,
        submittedAt: s.submittedAt || prev.submittedAt,
        status: rankS >= rankP ? s.status : prev.status,
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
    case 'maintenanceMode':
      out.maintenanceMode = d === true || (d && typeof d === 'object' && (d as { enabled?: boolean }).enabled === true)
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

export async function saveSharedKey(key: SharedKey, data: unknown): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  try {
    const { error } = await sb.from('app_state').upsert(
      { key, data, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
    if (error) { console.warn(`[sync] save ${key}:`, error.message); return false }
    return true
  } catch (e) {
    console.warn(`[sync] save ${key} exception:`, e)
    return false
  }
}

export async function saveMergedById<T extends { id: string }>(key: SharedKey, local: T[]): Promise<T[]> {
  const cloud = await loadSharedKeys([key])
  const remote = (cloud?.[key as keyof SharedSlice] as T[] | undefined) || []
  const merged =
    key === 'students'
      ? (mergeStudents(remote as unknown as Student[], local as unknown as Student[]) as unknown as T[])
      : mergeById(remote as T[], local)
  await saveSharedKey(key, merged)
  return merged
}

export const LIVE_KEYS: SharedKey[] = [
  'students', 'notices', 'messages', 'droppedMessageIds', 'presence', 'accounts',
  'recovery', 'bookings', 'results', 'deletedStudentIds', 'deletedAccountIds', 'maintenanceMode',
]

export const CONTENT_KEYS: SharedKey[] = [
  'school', 'instructors', 'theory', 'questions', 'reviews', 'roadSigns',
  'learnedSigns', 'profiles', 'theoryProgress', 'studentMistakes',
]

export async function saveSharedToCloud(slice: SharedSlice): Promise<void> {
  if (!isSupabaseConfigured) return
  const tasks: Promise<unknown>[] = []
  if (slice.school) tasks.push(saveSharedKey('school', slice.school))
  if (slice.instructors) tasks.push(saveSharedKey('instructors', slice.instructors))
  if (slice.notices) tasks.push(saveSharedKey('notices', slice.notices))
  if (slice.students) tasks.push(saveMergedById('students', slice.students))
  if (slice.theory) tasks.push(saveMergedById('theory', slice.theory))
  if (slice.questions) tasks.push(saveMergedById('questions', slice.questions))
  if (slice.reviews) tasks.push(saveSharedKey('reviews', slice.reviews))
  if (slice.messages) tasks.push(saveSharedKey('messages', slice.messages))
  if (slice.bookings) tasks.push(saveMergedById('bookings', slice.bookings))
  if (slice.accounts) tasks.push(saveSharedKey('accounts', slice.accounts))
  if (slice.recovery) tasks.push(saveSharedKey('recovery', slice.recovery))
  if (slice.results) tasks.push(saveMergedById('results', slice.results))
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
  if (slice.roadSigns) tasks.push(saveMergedById('roadSigns', slice.roadSigns))
  if (slice.presence) tasks.push(saveSharedKey('presence', slice.presence))
  if (slice.droppedMessageIds) tasks.push(saveSharedKey('droppedMessageIds', slice.droppedMessageIds))
  if (slice.studentMistakes) {
    tasks.push((async () => {
      const cloud = await loadSharedKeys(['studentMistakes'])
      await saveSharedKey('studentMistakes', mergeMistakeMaps(cloud?.studentMistakes || {}, slice.studentMistakes || {}))
    })())
  }
  if (slice.maintenanceMode !== undefined) tasks.push(saveSharedKey('maintenanceMode', slice.maintenanceMode))
  await Promise.all(tasks)
}

export { isSupabaseConfigured }
