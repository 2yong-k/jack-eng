import { NextRequest, NextResponse } from 'next/server'
import { isAuthed } from '@/src/lib/auth'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/api/cron')
  ) {
    return NextResponse.next()
  }
  if (!isAuthed(req.cookies.get('auth')?.value, process.env.APP_PASSPHRASE ?? '')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
