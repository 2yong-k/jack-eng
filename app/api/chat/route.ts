import { NextRequest } from 'next/server'
import { anthropic } from '@/src/lib/anthropic'
import { MODELS } from '@/src/lib/models'
import { buildChatSystemPrompt } from '@/src/lib/prompts'

export async function POST(req: NextRequest) {
  const { topic, messages } = (await req.json()) as {
    topic: { title: string; scenario: string }
    messages: { role: 'user' | 'assistant'; content: string }[]
  }
  const stream = await anthropic.messages.create({
    model: MODELS.chat,
    max_tokens: 512,
    stream: true,
    system: buildChatSystemPrompt(topic),
    messages,
  })
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(event.delta.text))
        }
      }
      controller.close()
    },
  })
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
