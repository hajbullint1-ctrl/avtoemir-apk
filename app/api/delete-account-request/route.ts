import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '').replace(/^8/, '+7')
}

/**
 * Public deletion request for Play Store compliance (web path outside the app).
 * Stores request in app_state key `deletionRequests`.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const phone = normalizePhone(typeof body?.phone === 'string' ? body.phone : '')
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : ''
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 400) : ''
    if (phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ ok: false, error: 'phone' }, { status: 400 })
    }

    const sb = getAdminClient()
    if (!sb) {
      return NextResponse.json({ ok: true, stored: false })
    }

    const { data: row } = await sb.from('app_state').select('data').eq('key', 'deletionRequests').maybeSingle()
    const prev = Array.isArray(row?.data) ? row!.data : []
    const item = {
      id: `del_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      phone,
      name,
      note,
      createdAt: new Date().toISOString(),
      status: 'pending',
    }
    const next = [item, ...prev].slice(0, 200)
    await sb.from('app_state').upsert(
      { key: 'deletionRequests', data: next, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )

    return NextResponse.json({ ok: true, stored: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'error' }, { status: 500 })
  }
}
