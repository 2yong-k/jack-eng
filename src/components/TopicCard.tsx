import type { Topic } from '@/db/schema'

const SCENARIO_LABEL: Record<string, string> = {
  pitch: '투자 피칭',
  negotiation: '협상',
  technical: '기술 설명',
  networking: '네트워킹',
}

export function TopicCard({ topic }: { topic: Topic }) {
  return (
    <section
      aria-labelledby="topic-title"
      className="bg-surface border-border flex flex-col gap-4 rounded-[var(--radius)] border p-5 shadow-sm"
    >
      <span className="text-accent text-xs font-semibold uppercase tracking-wide">
        {SCENARIO_LABEL[topic.scenario] ?? topic.scenario}
      </span>
      <h2 id="topic-title" lang="en" className="text-xl font-bold leading-snug">
        {topic.title}
      </h2>

      <div>
        <p className="text-muted mb-1.5 text-xs font-medium">시작 질문</p>
        <ul className="text-fg/90 flex list-disc flex-col gap-1 pl-5 text-sm" lang="en">
          {topic.seedQuestions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {topic.targetExpressions.map((e) => (
          <span
            key={e}
            lang="en"
            className="bg-surface-muted text-fg/80 rounded-full px-2.5 py-1 text-xs"
          >
            {e}
          </span>
        ))}
      </div>
    </section>
  )
}
