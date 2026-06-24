import { NextRequest, NextResponse } from 'next/server'
import { authToken, verifyPassphrase } from '@/src/lib/auth'
import { LoginRequestSchema } from '@/src/lib/schemas'

export async function POST(req: NextRequest) {
  const configured = process.env.APP_PASSPHRASE
  if (!configured) {
    return NextResponse.json({ ok: false, error: 'auth not configured' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  const parsed = LoginRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (!(await verifyPassphrase(parsed.data.passphrase, configured))) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  // Cookie stores a derived token, not the passphrase itself.
  res.cookies.set('auth', await authToken(configured), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
