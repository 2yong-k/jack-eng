import { NextResponse } from 'next/server'
import { anthropic } from '@/src/lib/anthropic'
import { getOrCreateTopic, InvalidTopicError } from '@/src/lib/topics'
import { todayKST } from '@/src/lib/datetime'

export async function GET() {
  try {
    const topic = await getOrCreateTopic(anthropic, todayKST())
    return NextResponse.json(topic)
  } catch (err) {
    const status = err instanceof InvalidTopicError ? 502 : 500
    return NextResponse.json({ error: 'failed to load topic' }, { status })
  }
}
