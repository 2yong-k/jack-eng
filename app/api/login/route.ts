import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { passphrase } = (await req.json()) as { passphrase: string }
  if (passphrase !== process.env.APP_PASSPHRASE) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set('auth', passphrase, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
