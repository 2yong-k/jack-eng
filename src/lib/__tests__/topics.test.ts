import { expect, test, vi } from 'vitest'
import { generateTopicInput } from '@/src/lib/topics'

test('generateTopicInput validates model output against TopicSchema', async () => {
  const fakeAnthropic = {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            name: 'submit_topic',
            input: {
              scenario: 'pitch',
              title: 'Pitching tokenomics to a VC',
              seedQuestions: ['q1', 'q2', 'q3'],
              targetExpressions: ['e1', 'e2', 'e3', 'e4', 'e5'],
            },
          },
        ],
      }),
    },
  }
  const result = await generateTopicInput(fakeAnthropic as never)
  expect(result.scenario).toBe('pitch')
  expect(result.targetExpressions).toHaveLength(5)
})
