import { expect, test } from 'vitest'
import { buildChatSystemPrompt } from '@/src/lib/prompts'

test('system prompt embeds topic + stays-on-topic instruction', () => {
  const p = buildChatSystemPrompt({ title: 'Series A pitch', scenario: 'pitch' })
  expect(p).toContain('Series A pitch')
  expect(p.toLowerCase()).toContain('one follow-up')
})
