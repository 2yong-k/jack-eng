import { expect, test } from 'vitest'
import { authToken, verifyPassphrase, verifyAuthCookie, timingSafeEqual } from '@/src/lib/auth'

test('timingSafeEqual compares correctly', () => {
  expect(timingSafeEqual('abc', 'abc')).toBe(true)
  expect(timingSafeEqual('abc', 'abd')).toBe(false)
  expect(timingSafeEqual('abc', 'ab')).toBe(false)
})

test('authToken is derived (not the passphrase) and deterministic', async () => {
  const t = await authToken('secret123')
  expect(t).not.toBe('secret123')
  expect(t).toMatch(/^[0-9a-f]{64}$/)
  expect(await authToken('secret123')).toBe(t)
  expect(await authToken('other')).not.toBe(t)
})

test('verifyPassphrase matches only the configured value', async () => {
  expect(await verifyPassphrase('secret123', 'secret123')).toBe(true)
  expect(await verifyPassphrase('wrong', 'secret123')).toBe(false)
  expect(await verifyPassphrase('x', undefined)).toBe(false)
  expect(await verifyPassphrase('', '')).toBe(false)
})

test('verifyAuthCookie matches the derived token, not the raw passphrase', async () => {
  const cfg = 'secret123'
  const token = await authToken(cfg)
  expect(await verifyAuthCookie(token, cfg)).toBe(true)
  expect(await verifyAuthCookie('secret123', cfg)).toBe(false)
  expect(await verifyAuthCookie(undefined, cfg)).toBe(false)
  expect(await verifyAuthCookie(token, undefined)).toBe(false)
})
