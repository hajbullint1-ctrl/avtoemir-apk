/**
 * Sync shared app state with Supabase (app_state table).
 * Falls back to local-only when NEXT_PUBLIC_SUPABASE_* env vars are missing.
 */

import { getSupabase, isSupabaseConfigured } from './supabase'
import type {
  Booking,
  Instructor,
  Message,
  Notice,
  Question,
  Review,
  School,
  Student,
  TestResult,
  TheoryTopic,
  RoadSign,
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
}

const KEYS = [
  'school',
  'instructors',
  'notices',
  'students',
  'theory',
  'questions',
  'reviews',
  'messages',
  'bookings',
  'accounts',
  'recovery',
  'results',
  'learnedSigns',
  'profiles',
  'theoryProgress',
  'roadSigns',
] as const

export type SharedKey = (typeof KEYS)[number]

function normalizeInstructors(list: Instructor[]): Instructor[] {
  return list.map((i) => ({
    ...i,
    phone: typeof i.phone === 'string' ? i.phone : '',
  }))
}

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
      const d = row.data
      switch (row.key) {
        case 'school':
          if (d && typeof d === 'object' && !Array.isArray(d) && (d as School).name) {
            out.school = d as School
          }
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
      }
    }
    return out
  } catch (e) {
    console.warn('[sync] load exception:', e)
    return null
  }
}

/** Upsert one shared key. No-op if Supabase is not configured. */
export async function saveSharedKey(key: SharedKey, data: unknown): Promise<boolean> {
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

/** Push all provided shared slices to the cloud. */
export async function saveSharedToCloud(slice: SharedSlice): Promise<void> {
  if (!isSupabaseConfigured) return
  const tasks: Promise<boolean>[] = []
  if (slice.school) tasks.push(saveSharedKey('school', slice.school))
  if (slice.instructors) tasks.push(saveSharedKey('instructors', slice.instructors))
  if (slice.notices) tasks.push(saveSharedKey('notices', slice.notices))
  if (slice.students) tasks.push(saveSharedKey('students', slice.students))
  if (slice.theory) tasks.push(saveSharedKey('theory', slice.theory))
  if (slice.questions) tasks.push(saveSharedKey('questions', slice.questions))
  if (slice.reviews) tasks.push(saveSharedKey('reviews', slice.reviews))
  if (slice.messages) tasks.push(saveSharedKey('messages', slice.messages))
  if (slice.bookings) tasks.push(saveSharedKey('bookings', slice.bookings))
  if (slice.accounts) tasks.push(saveSharedKey('accounts', slice.accounts))
  if (slice.recovery) tasks.push(saveSharedKey('recovery', slice.recovery))
  if (slice.results) tasks.push(saveSharedKey('results', slice.results))
  if (slice.learnedSigns) tasks.push(saveSharedKey('learnedSigns', slice.learnedSigns))
  if (slice.profiles) tasks.push(saveSharedKey('profiles', slice.profiles))
  if (slice.theoryProgress) tasks.push(saveSharedKey('theoryProgress', slice.theoryProgress))
  if (slice.roadSigns) tasks.push(saveSharedKey('roadSigns', slice.roadSigns))
  await Promise.all(tasks)
}

export { isSupabaseConfigured }
