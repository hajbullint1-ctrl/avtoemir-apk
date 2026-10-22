import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Admin password check on the server so the secret is not required
 * to be baked into the client bundle at build time.
 * Accepts NEXT_PUBLIC_ADMIN_PASSWORD or ADMIN_PASSWORD from Vercel env.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const password = typeof body?.password === 'string' ? body.password.trim() : ''
    const expected = (
      process.env.ADMIN_PASSWORD?.trim() ||
      process.env.NEXT_PUBLIC_ADMIN_PASSWORD?.trim() ||
      ''
    )
    if (!expected) {
      return NextResponse.json(
        { ok: false, error: 'not_configured' },
        { status: 503 },
      )
    }
    if (!password || password !== expected) {
      return NextResponse.json({ ok: false, error: 'invalid' }, { status: 401 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'error' }, { status: 500 })
  }
}
