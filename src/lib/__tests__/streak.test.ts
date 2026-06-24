import { expect, test } from 'vitest'
import { nextStreak, displayStreak } from '@/src/lib/streak'

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

test('displayStreak decays on read without a save', () => {
  expect(displayStreak(10, '2026-06-25', '2026-06-25')).toBe(10) // practiced today
  expect(displayStreak(10, '2026-06-24', '2026-06-25')).toBe(10) // yesterday — still live
  expect(displayStreak(10, '2026-06-23', '2026-06-25')).toBe(0) // 2+ days ago — broken
  expect(displayStreak(10, null, '2026-06-25')).toBe(0) // never practiced
})
