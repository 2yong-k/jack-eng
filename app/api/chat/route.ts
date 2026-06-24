import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/src/lib/anthropic'
import { MODELS } from '@/src/lib/models'
import { buildChatSystemPrompt } from '@/src/lib/prompts'
import { ChatRequestSchema } from '@/src/lib/schemas'
import { enforceRateLimit } from '@/src/lib/rateLimit'

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req, { bucket: 'chat', limit: 120, windowMs: 60_000 })
  if (limited) return limited

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const parsed = ChatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  const { topic, messages } = parsed.data

  // Wrapper try/catch (not a bare .catch) also covers a synchronous throw from
  // the lazy anthropic proxy, e.g. a missing ANTHROPIC_API_KEY → 502 (not 500).
  const stream = await (async () => {
    try {
      return await anthropic.messages.create({
        model: MODELS.chat,
        max_tokens: 512,
        stream: true,
        system: buildChatSystemPrompt(topic),
        messages,
      })
    } catch {
      return null
    }
  })()
  if (!stream) {
    return NextResponse.json({ error: 'upstream model error' }, { status: 502 })
  }

  const encoder = new TextEncoder()
  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        controller.close()
      } catch (err) {
        // Surface mid-stream failures deterministically so the client's reader rejects.
        controller.error(err)
      }
    },
  })
  return new Response(body$, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
