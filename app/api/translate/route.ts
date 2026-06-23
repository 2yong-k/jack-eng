import { NextRequest, NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { anthropic } from '@/src/lib/anthropic'
import { MODELS } from '@/src/lib/models'
import { TranslateSchema } from '@/src/lib/schemas'

const tool: Anthropic.Tool = {
  name: 'submit_translation',
  description: 'Give the natural English chunk for the Korean phrase.',
  input_schema: {
    type: 'object',
    properties: {
      english: { type: 'string' },
      example: { type: 'string' },
    },
    required: ['english', 'example'],
  },
}

export async function POST(req: NextRequest) {
  const { korean } = (await req.json()) as { korean: string }
  const msg = await anthropic.messages.create({
    model: MODELS.chat,
    max_tokens: 256,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_translation' },
    messages: [
      {
        role: 'user',
        content: `Give the most natural spoken English for this Korean, as a reusable chunk, plus one example sentence: "${korean}"`,
      },
    ],
  })
  const block = msg.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') {
    return NextResponse.json({ error: 'no tool output' }, { status: 502 })
  }
  const parsed = TranslateSchema.safeParse(block.input)
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid translation' }, { status: 502 })
  }
  return NextResponse.json(parsed.data)
}
