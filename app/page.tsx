import { desc } from 'drizzle-orm'
import { db } from '@/db/client'
import { dailyProgress } from '@/db/schema'
import { anthropic } from '@/src/lib/anthropic'
import { getOrCreateTopic } from '@/src/lib/topics'
import { TopicCard } from '@/src/components/TopicCard'
import { StreakBadge } from '@/src/components/StreakBadge'
import { ConversationView } from '@/src/components/ConversationView'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const today = new Date().toISOString().slice(0, 10)
  const topic = await getOrCreateTopic(anthropic, today)
  const prog = await db.select().from(dailyProgress).orderBy(desc(dailyProgress.date)).limit(1)
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold">오늘의 영어</h1>
        <StreakBadge streak={prog[0]?.streakCount ?? 0} />
      </div>
      <TopicCard topic={topic} />
      <ConversationView topic={topic} />
    </main>
  )
}
