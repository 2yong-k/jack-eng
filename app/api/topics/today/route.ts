import { NextResponse } from 'next/server'
import { anthropic } from '@/src/lib/anthropic'
import { getOrCreateTopic } from '@/src/lib/topics'

export async function GET() {
  const isoDate = new Date().toISOString().slice(0, 10)
  const topic = await getOrCreateTopic(anthropic, isoDate)
  return NextResponse.json(topic)
}
