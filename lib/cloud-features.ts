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

function compressImage(file: File, maxSide = 960, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const blobUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
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
      resolve(canvas.toDataURL('image/jpeg', quality))
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

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',')
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'image/jpeg'
  const bin = atob(body)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

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

/** Compress → /api/upload-doc → Storage. Falls back to data URL only if all fail. */
export async function uploadStudentDocument(studentId: string, docKey: string, file: File): Promise<string> {
  let body: Blob | File = file
  let filename = file.name || 'doc.jpg'
  if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || '')) {
    try {
      const dataUrl = await compressImage(file, 960, 0.6)
      body = dataUrlToBlob(dataUrl)
      filename = (file.name || 'doc').replace(/\.[^.]+$/, '') + '.jpg'
    } catch {
      /* keep original */
    }
  }

  try {
    const fd = new FormData()
    fd.append('studentId', studentId || 'student')
    fd.append('docKey', docKey)
    fd.append('file', body, filename)
    const res = await fetch('/api/upload-doc', { method: 'POST', body: fd })
    const json = await res.json().catch(() => ({}))
    if (res.ok && json?.ok && typeof json.url === 'string' && json.url.startsWith('http')) {
      return json.url as string
    }
    console.warn('[upload] api failed', json?.error || res.status)
  } catch (e) {
    console.warn('[upload] api exception', e)
  }

  const sb = getSupabase()
  if (sb) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '') || 'doc.jpg'
    const path = `${studentId || 'student'}/${docKey}-${Date.now()}-${safe}`
    const { error } = await sb.storage.from('student-docs').upload(path, body, {
      cacheControl: '3600',
      upsert: true,
      contentType: body.type || 'image/jpeg',
    })
    if (!error) {
      const { data } = sb.storage.from('student-docs').getPublicUrl(path)
      if (data?.publicUrl) return data.publicUrl
    } else {
      console.warn('[storage] student-docs', error.message)
    }
  }

  return durableFileUrl(file)
}
