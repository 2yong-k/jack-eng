import { expect, test } from 'vitest'
import { ReviewSchema, TranslateSchema } from '@/src/lib/schemas'

test('accepts well-formed review', () => {
  const ok = {
    corrections: [
      {
        original: 'I go store',
        corrected: 'I went to the store',
        explanation: 'past tense + article',
        type: 'grammar',
      },
    ],
    expressions: [
      { text: 'circle back', meaning: '다시 논의하다', example: "Let's circle back on this." },
    ],
  }
  expect(ReviewSchema.parse(ok)).toEqual(ok)
})

test('rejects malformed review (bad type enum)', () => {
  const bad = {
    corrections: [{ original: 'x', corrected: 'y', explanation: 'z', type: 'wrong' }],
    expressions: [],
  }
  expect(() => ReviewSchema.parse(bad)).toThrow()
})

test('translate result requires english + example', () => {
  expect(() => TranslateSchema.parse({ english: 'circle back' })).toThrow()
  expect(TranslateSchema.parse({ english: 'circle back', example: "Let's circle back." }).english).toBe(
    'circle back',
  )
})
