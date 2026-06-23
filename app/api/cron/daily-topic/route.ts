import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/src/lib/anthropic'
import { getOrCreateTopic } from '@/src/lib/topics'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  const topic = await getOrCreateTopic(anthropic, tomorrow)
  return NextResponse.json({ ok: true, topicId: topic.id })
}
