import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/**
 * Server-side document upload — more reliable on mobile than browser → Storage direct.
 * POST multipart: studentId, docKey, file
 */
export async function POST(req: Request) {
  try {
    const sb = getClient()
    if (!sb) {
      return NextResponse.json({ ok: false, error: 'no_supabase' }, { status: 503 })
    }

    const form = await req.formData()
    const studentId = String(form.get('studentId') || 'student').replace(/[^\w-]/g, '').slice(0, 64)
    const docKey = String(form.get('docKey') || 'doc').replace(/[^\w-]/g, '').slice(0, 32)
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, error: 'no_file' }, { status: 400 })
    }

    const blob = file as File
    if (blob.size > 20 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: 'too_large' }, { status: 400 })
    }

    const safe = (blob.name || 'doc').replace(/[^a-zA-Z0-9._-]/g, '') || 'doc.jpg'
    const path = `${studentId}/${docKey}-${Date.now()}-${safe}`

    await sb.storage.createBucket('student-docs', { public: true }).catch(() => null)

    const { error } = await sb.storage.from('student-docs').upload(path, blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: blob.type || 'image/jpeg',
    })
    if (error) {
      console.warn('[upload-doc]', error.message)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    const { data } = sb.storage.from('student-docs').getPublicUrl(path)
    if (!data?.publicUrl) {
      return NextResponse.json({ ok: false, error: 'no_url' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, url: data.publicUrl, name: safe })
  } catch (e) {
    console.warn('[upload-doc] exception', e)
    return NextResponse.json({ ok: false, error: 'exception' }, { status: 500 })
  }
}
