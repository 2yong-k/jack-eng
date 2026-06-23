import { expect, test } from 'vitest'
import { nextStreak } from '@/src/lib/streak'

test('consecutive day increments', () => {
  expect(nextStreak(3, '2026-06-22', '2026-06-23')).toBe(4)
})
test('gap resets to 1', () => {
  expect(nextStreak(3, '2026-06-20', '2026-06-23')).toBe(1)
})
test('same day keeps streak', () => {
  expect(nextStreak(3, '2026-06-23', '2026-06-23')).toBe(3)
})
test('no prior streak starts at 1', () => {
  expect(nextStreak(0, null, '2026-06-23')).toBe(1)
})
