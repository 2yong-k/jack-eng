import { expect, test } from 'vitest'
import { scenarioEnum, correctionTypeEnum } from '@/db/schema'
import { SCENARIOS, CORRECTION_TYPES, ReviewSchema } from '@/src/lib/schemas'

// Real contract test (not struct-assembly): the DB enum domain and the Zod
// enum domain are the only two enforcement points; if they diverge, an invalid
// value could pass one and fail the other. Lock them to the shared source.
test('DB scenario enum matches the Zod scenario domain', () => {
  expect([...scenarioEnum.enumValues]).toEqual([...SCENARIOS])
})

test('DB correction_type enum matches the Zod correction-type domain', () => {
  expect([...correctionTypeEnum.enumValues]).toEqual([...CORRECTION_TYPES])
})

test('ReviewSchema rejects a correction type outside the enum', () => {
  const bad = {
    corrections: [{ original: 'a', corrected: 'b', explanation: 'c', type: 'invalid' }],
    expressions: [],
  }
  expect(ReviewSchema.safeParse(bad).success).toBe(false)
})
