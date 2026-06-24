import { expect, test } from 'vitest'
import { kstDate } from '@/src/lib/datetime'

// Locks the timezone fix: naive UTC `toISOString().slice(0,10)` would return the
// wrong day in the 00:00–09:00 KST window. kstDate must roll over at KST midnight.
test('kstDate maps a UTC instant to the KST calendar day', () => {
  // 20:00Z = 05:00 KST next day (UTC slice would wrongly say 06-24)
  expect(kstDate(new Date('2026-06-24T20:00:00Z'))).toBe('2026-06-25')
  // 14:00Z = 23:00 KST same day
  expect(kstDate(new Date('2026-06-24T14:00:00Z'))).toBe('2026-06-24')
  // 15:00Z = exactly 00:00 KST next day (boundary)
  expect(kstDate(new Date('2026-06-24T15:00:00Z'))).toBe('2026-06-25')
})
