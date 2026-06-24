import { NextRequest, NextResponse } from 'next/server'
import { desc } from 'drizzle-orm'
import { db } from '@/db/client'
import { sessions, corrections, expressions, dailyProgress } from '@/db/schema'
import { nextStreak } from '@/src/lib/streak'
import { todayKST } from '@/src/lib/datetime'
import { SessionRequestSchema } from '@/src/lib/schemas'

export async function POST(req: NextRequest) {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const parsed = SessionRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 })
  }
  const { topicId, transcript, review } = parsed.data
  const today = todayKST()

  try {
    // All writes (session + corrections + expressions + progress) commit or roll
    // back together — no partially-applied session rows.
    const streak = await db.transaction(async (tx) => {
      const [session] = await tx
        .insert(sessions)
        .values({ topicId, transcript, endedAt: new Date() })
        .returning()
      if (!session) throw new Error('session insert failed')

      if (review.corrections.length) {
        await tx.insert(corrections).values(review.corrections.map((c) => ({ sessionId: session.id, ...c })))
      }
      if (review.expressions.length) {
        await tx
          .insert(expressions)
          .values(review.expressions.map((e) => ({ sourceSessionId: session.id, ...e })))
      }

      const prior = await tx.select().from(dailyProgress).orderBy(desc(dailyProgress.date)).limit(1)
      const count = nextStreak(prior[0]?.streakCount ?? 0, prior[0]?.date ?? null, today)
      await tx
        .insert(dailyProgress)
        .values({ date: today, completed: true, streakCount: count })
        .onConflictDoUpdate({ target: dailyProgress.date, set: { completed: true, streakCount: count } })

      return { sessionId: session.id, count }
    })

    return NextResponse.json({ sessionId: streak.sessionId, streak: streak.count })
  } catch {
    return NextResponse.json({ error: 'failed to save session' }, { status: 500 })
  }
}
