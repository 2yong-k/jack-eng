// The auth cookie stores a token DERIVED from the passphrase (SHA-256 over a
// labeled input), never the passphrase itself — so a leaked cookie is not the
// reusable master credential. All comparisons are constant-time. Uses Web
// Crypto so it works on the Edge runtime (middleware).

const LABEL = 'jack-eng-talking/auth/v1'

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Constant-time string compare (length leak is acceptable for these hashes). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** The cookie token for a given passphrase. */
export function authToken(passphrase: string): Promise<string> {
  return sha256Hex(`${LABEL}:${passphrase}`)
}

/** Constant-time equality for secrets of any length (hash-compared, no length leak). */
export async function secretEquals(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256Hex(a), sha256Hex(b)])
  return timingSafeEqual(ha, hb)
}

/** Submitted passphrase matches the configured one (constant-time, hash-compared). */
export async function verifyPassphrase(input: string, configured: string | undefined): Promise<boolean> {
  if (!configured) return false
  const [a, b] = await Promise.all([sha256Hex(input), sha256Hex(configured)])
  return timingSafeEqual(a, b)
}

/** Cookie token matches the token for the configured passphrase (constant-time). */
export async function verifyAuthCookie(
  cookieVal: string | undefined,
  configured: string | undefined,
): Promise<boolean> {
  if (!cookieVal || !configured) return false
  return timingSafeEqual(cookieVal, await authToken(configured))
}
