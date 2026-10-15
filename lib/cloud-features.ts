import { getSupabase } from './supabase'

export type ProfileRow = { id: string; full_name: string; phone: string }

export async function fetchProfiles(): Promise<ProfileRow[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data, error } = await sb.from('profiles').select('id, full_name, phone')
  if (error) {
    console.warn('[profiles]', error.message)
    return []
  }
  return (data ?? []).map((r) => ({
    id: String(r.id),
    full_name: String(r.full_name ?? ''),
    phone: String(r.phone ?? ''),
  }))
}

export async function upsertProfile(row: ProfileRow): Promise<void> {
  const sb = getSupabase()
  if (!sb || !row.id) return
  const { error } = await sb.from('profiles').upsert(
    {
      id: row.id,
      full_name: row.full_name,
      phone: row.phone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (error) console.warn('[profiles] upsert', error.message)
}

export async function fetchTheoryProgress(): Promise<{ student_id: string; lesson_id: string }[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data, error } = await sb.from('theory_progress').select('student_id, lesson_id').eq('completed', true)
  if (error) {
    console.warn('[theory_progress]', error.message)
    return []
  }
  return (data ?? []).map((r) => ({
    student_id: String(r.student_id),
    lesson_id: String(r.lesson_id),
  }))
}

export async function upsertTheoryProgress(studentId: string, lessonId: string): Promise<void> {
  const sb = getSupabase()
  if (!sb || !studentId || !lessonId) return
  const { error } = await sb.from('theory_progress').upsert(
    {
      student_id: studentId,
      lesson_id: lessonId,
      completed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,lesson_id' },
  )
  if (error) console.warn('[theory_progress] upsert', error.message)
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Upload a theory lesson card to the public `theory-cards` bucket. Falls back to a data URL. */
export async function uploadTheoryCard(file: File): Promise<string> {
  const sb = getSupabase()
  if (!sb) return readFile(file)
  const safe = (file.name || 'card').replace(/[^a-zA-Z0-9._-]/g, '') || 'card.jpg'
  const path = `lessons/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`
  const { error } = await sb.storage.from('theory-cards').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  })
  if (error) {
    console.warn('[storage] theory-cards', error.message)
    return readFile(file)
  }
  const { data } = sb.storage.from('theory-cards').getPublicUrl(path)
  if (!data?.publicUrl) return readFile(file)
  return data.publicUrl
}
