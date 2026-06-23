import { NextRequest, NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { anthropic } from '@/src/lib/anthropic'
import { MODELS } from '@/src/lib/models'
import { ReviewSchema } from '@/src/lib/schemas'

const tool: Anthropic.Tool = {
  name: 'submit_review',
  description: 'Submit the correction report for the user English utterances.',
  input_schema: {
    type: 'object',
    properties: {
      corrections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            original: { type: 'string' },
            corrected: { type: 'string' },
            explanation: { type: 'string' },
            type: { type: 'string', enum: ['grammar', 'word-choice', 'naturalness'] },
          },
          required: ['original', 'corrected', 'explanation', 'type'],
        },
      },
      expressions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            meaning: { type: 'string' },
            example: { type: 'string' },
          },
          required: ['text', 'meaning', 'example'],
        },
      },
    },
    required: ['corrections', 'expressions'],
  },
}

export async function POST(req: NextRequest) {
  const { userUtterances } = (await req.json()) as { userUtterances: string[] }
  const msg = await anthropic.messages.create({
    model: MODELS.review,
    max_tokens: 2048,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_review' },
    messages: [
      {
        role: 'user',
        content: `You are an English tutor for a Korean blockchain CTO. Analyze ONLY these user utterances. Give grammar/word-choice/naturalness corrections and 5 useful expressions (meaning in Korean). Utterances:\n${userUtterances
          .map((u, i) => `${i + 1}. ${u}`)
          .join('\n')}`,
      },
    ],
  })
  const block = msg.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') {
    return NextResponse.json({ error: 'no tool output' }, { status: 502 })
  }
  const parsed = ReviewSchema.safeParse(block.input)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid review', issues: parsed.error.issues }, { status: 502 })
  }
  return NextResponse.json(parsed.data)
}
