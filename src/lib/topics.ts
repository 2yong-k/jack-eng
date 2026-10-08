import type Anthropic from '@anthropic-ai/sdk'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { topics } from '@/db/schema'
import { MODELS } from '@/src/lib/models'
import { TopicSchema, type TopicResult } from '@/src/lib/schemas'

/** Thrown when the model's topic tool output is missing or fails validation. */
export class InvalidTopicError extends Error {}

const tool: Anthropic.Tool = {
  name: 'submit_topic',
  description: 'Submit a daily English practice topic for a blockchain CTO.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      scenario: { type: 'string', enum: ['pitch', 'negotiation', 'technical', 'networking'] },
      title: { type: 'string' },
      seedQuestions: { type: 'array', items: { type: 'string' } },
      targetExpressions: { type: 'array', items: { type: 'string' } },
    },
    required: ['scenario', 'title', 'seedQuestions', 'targetExpressions'],
    additionalProperties: false,
  },
}

export async function generateTopicInput(client: Anthropic): Promise<TopicResult> {
  // Sonnet 5.5 rejects a forced tool_choice (400), so the prompt names the tool and the
  // caller treats a missing tool_use block as a failure. Thinking is on by default and
  // counts toward max_tokens; once-a-day generation can afford medium effort.
  const msg = await client.messages.create({
    model: MODELS.chat,
    max_tokens: 2048,
    output_config: { effort: 'medium' },
    tools: [tool],
    messages: [
      {
        role: 'user',
        content:
          'Create ONE English conversation practice topic for a Korean blockchain CTO who free-talks with foreign investors. Rotate scenarios across pitch/negotiation/technical/networking. Give 3 seed questions and 5 target expressions. Submit it by calling the submit_topic tool.',
      },
    ],
  })
  const block = msg.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new InvalidTopicError('no topic tool output')
  const parsed = TopicSchema.safeParse(block.input)
  if (!parsed.success) throw new InvalidTopicError('topic output failed schema validation')
  return parsed.data
}

export async function getOrCreateTopic(client: Anthropic, isoDate: string) {
  const existing = await db.select().from(topics).where(eq(topics.date, isoDate)).limit(1)
  if (existing[0]) return existing[0]
  const input = await generateTopicInput(client)
  const inserted = await db
    .insert(topics)
    .values({ date: isoDate, ...input })
    .onConflictDoNothing()
    .returning()
  if (inserted[0]) return inserted[0]
  const reRead = await db.select().from(topics).where(eq(topics.date, isoDate)).limit(1)
  return reRead[0]!
}
