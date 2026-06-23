import { NextRequest, NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { db } from '@/db/client'
import { sessions, corrections, expressions, dailyProgress } from '@/db/schema'
import { nextStreak } from '@/src/lib/streak'
import type { ReviewResult } from '@/src/lib/schemas'

export async function POST(req: NextRequest) {
  const { topicId, transcript, review } = (await req.json()) as {
    topicId: string
    transcript: { role: 'user' | 'assistant'; content: string }[]
    review: ReviewResult
  }
  const today = new Date().toISOString().slice(0, 10)
  const [session] = await db
    .insert(sessions)
    .values({ topicId, transcript, endedAt: new Date() })
    .returning()
  if (!session) return NextResponse.json({ error: 'insert failed' }, { status: 500 })

  if (review.corrections.length) {
    await db.insert(corrections).values(review.corrections.map((c) => ({ sessionId: session.id, ...c })))
  }
  if (review.expressions.length) {
    await db
      .insert(expressions)
      .values(review.expressions.map((e) => ({ sourceSessionId: session.id, ...e })))
  }

  const prior = await db.select().from(dailyProgress).orderBy(desc(dailyProgress.date)).limit(1)
  const streak = nextStreak(prior[0]?.streakCount ?? 0, prior[0]?.date ?? null, today)
  await db
    .insert(dailyProgress)
    .values({ date: today, completed: true, streakCount: streak })
    .onConflictDoUpdate({ target: dailyProgress.date, set: { completed: true, streakCount: streak } })

  return NextResponse.json({ sessionId: session.id, streak })
}
