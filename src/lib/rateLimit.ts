import { NextRequest, NextResponse } from 'next/server'

// Fixed-window limiter. In-memory → per serverless instance (best-effort), which
// is enough of a cost-abuse guard for this single-user app. For hard global
// limits, back this with Postgres/Redis. Keyed by auth cookie (falls back to IP).

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) }
  }
  b.count += 1
  return { ok: true, retryAfter: 0 }
}

function clientKey(req: NextRequest): string {
  // Prefer the auth token, then the platform-set x-real-ip (Vercel), and only
  // then the client-spoofable x-forwarded-for. The IP fallback is best-effort.
  return (
    req.cookies.get('auth')?.value ??
    req.headers.get('x-real-ip')?.trim() ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'anon'
  )
}

/**
 * Guard an LLM route. Returns a 429 NextResponse when over budget, else null.
 * `bucket` namespaces the window so e.g. Opus reviews can be capped separately.
 */
export function enforceRateLimit(
  req: NextRequest,
  opts: { bucket: string; limit: number; windowMs: number },
): NextResponse | null {
  const { ok, retryAfter } = rateLimit(`${opts.bucket}:${clientKey(req)}`, opts.limit, opts.windowMs)
  if (ok) return null
  return NextResponse.json(
    { error: 'rate limited' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}
