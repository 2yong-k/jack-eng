import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/src/lib/anthropic'
import { getOrCreateTopic, InvalidTopicError } from '@/src/lib/topics'
import { tomorrowKST } from '@/src/lib/datetime'
import { secretEquals } from '@/src/lib/auth'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'cron not configured' }, { status: 500 })
  }
  const got = req.headers.get('authorization') ?? ''
  if (!(await secretEquals(got, `Bearer ${secret}`))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const topic = await getOrCreateTopic(anthropic, tomorrowKST())
    return NextResponse.json({ ok: true, topicId: topic.id })
  } catch (err) {
    const status = err instanceof InvalidTopicError ? 502 : 500
    return NextResponse.json({ error: 'topic generation failed' }, { status })
  }
}
