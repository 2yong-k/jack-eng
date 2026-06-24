import { expect, test } from 'vitest'
import {
  ReviewSchema,
  TranslateSchema,
  ReviewRequestSchema,
  TranslateRequestSchema,
  SessionRequestSchema,
  ChatRequestSchema,
} from '@/src/lib/schemas'

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

test('ReviewRequestSchema requires non-empty, bounded utterances', () => {
  expect(ReviewRequestSchema.safeParse({ userUtterances: [] }).success).toBe(false)
  expect(ReviewRequestSchema.safeParse({ userUtterances: ['hi'] }).success).toBe(true)
  expect(ReviewRequestSchema.safeParse({ userUtterances: Array(101).fill('x') }).success).toBe(false)
})

test('TranslateRequestSchema bounds the input length', () => {
  expect(TranslateRequestSchema.safeParse({ korean: '' }).success).toBe(false)
  expect(TranslateRequestSchema.safeParse({ korean: 'x'.repeat(600) }).success).toBe(false)
  expect(TranslateRequestSchema.safeParse({ korean: '다시 논의하시죠' }).success).toBe(true)
})

test('SessionRequestSchema requires a uuid topicId and a valid review', () => {
  const good = {
    topicId: '00000000-0000-0000-0000-000000000000',
    transcript: [],
    review: { corrections: [], expressions: [] },
  }
  expect(SessionRequestSchema.safeParse(good).success).toBe(true)
  expect(SessionRequestSchema.safeParse({ ...good, topicId: 'not-a-uuid' }).success).toBe(false)
})

test('ChatRequestSchema rejects roles other than user/assistant', () => {
  const good = { topic: { title: 't', scenario: 'pitch' }, messages: [{ role: 'user', content: 'hi' }] }
  expect(ChatRequestSchema.safeParse(good).success).toBe(true)
  expect(
    ChatRequestSchema.safeParse({ ...good, messages: [{ role: 'system', content: 'x' }] }).success,
  ).toBe(false)
})
