import { desc } from 'drizzle-orm'
import { db } from '@/db/client'
import { dailyProgress } from '@/db/schema'
import { anthropic } from '@/src/lib/anthropic'
import { getOrCreateTopic } from '@/src/lib/topics'
import { todayKST } from '@/src/lib/datetime'
import { TopicCard } from '@/src/components/TopicCard'
import { StreakBadge } from '@/src/components/StreakBadge'
import { ConversationView } from '@/src/components/ConversationView'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const today = todayKST()

  let topic: Awaited<ReturnType<typeof getOrCreateTopic>> | null = null
  let streak = 0
  try {
    const [t, prog] = await Promise.all([
      getOrCreateTopic(anthropic, today),
      db.select().from(dailyProgress).orderBy(desc(dailyProgress.date)).limit(1),
    ])
    topic = t
    streak = prog[0]?.streakCount ?? 0
  } catch {
    return (
      <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <h1 className="text-xl font-bold">오늘의 토픽을 불러오지 못했어요</h1>
        <p className="text-muted text-sm">잠시 후 새로고침해 주세요. 문제가 계속되면 API 키/DB 설정을 확인하세요.</p>
      </main>
    )
  }

  return (
    <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">오늘의 영어</h1>
        <StreakBadge streak={streak} />
      </header>
      <TopicCard topic={topic} />
      <ConversationView topic={topic} />
    </main>
  )
}
