import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthCookie } from '@/src/lib/auth'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/login') ||
    pathname.startsWith('/api/cron')
  ) {
    return NextResponse.next()
  }
  if (!(await verifyAuthCookie(req.cookies.get('auth')?.value, process.env.APP_PASSPHRASE))) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
