import { expect, test } from 'vitest'
import { MODELS } from '@/src/lib/models'

test('model ids are pinned', () => {
  expect(MODELS.chat).toBe('claude-sonnet-4-6')
  expect(MODELS.review).toBe('claude-opus-4-8')
})
