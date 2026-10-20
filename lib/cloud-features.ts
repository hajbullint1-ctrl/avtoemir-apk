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

/** Shrink ID photos so they survive sync if Storage is unavailable. */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const max = 1600
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const width = Math.max(1, Math.round(img.width * scale))
      const height = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(blobUrl)
        reject(new Error('canvas'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(blobUrl)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      reject(new Error('image'))
    }
    img.src = blobUrl
  })
}

async function durableFileUrl(file: File): Promise<string> {
  if (file.type.startsWith('image/')) {
    try {
      return await compressImage(file)
    } catch {
      /* keep original */
    }
  }
  return readFile(file)
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

/** Upload a student document so the admin can open it on another device. */
export async function uploadStudentDocument(studentId: string, docKey: string, file: File): Promise<string> {
  const sb = getSupabase()
  if (!sb) return durableFileUrl(file)
  const safe = (file.name || 'doc').replace(/[^a-zA-Z0-9._-]/g, '') || 'doc'
  const path = `${studentId || 'student'}/${docKey}-${Date.now()}-${safe}`
  const { error } = await sb.storage.from('student-docs').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  })
  if (error) {
    console.warn('[storage] student-docs', error.message)
    return durableFileUrl(file)
  }
  const { data } = sb.storage.from('student-docs').getPublicUrl(path)
  if (!data?.publicUrl) return durableFileUrl(file)
  return data.publicUrl
}
