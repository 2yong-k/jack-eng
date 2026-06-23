import type { Topic } from '@/db/schema'

export function TopicCard({ topic }: { topic: Topic }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border p-5">
      <span className="text-xs uppercase tracking-wide text-neutral-500">{topic.scenario}</span>
      <h1 className="text-xl font-bold">{topic.title}</h1>
      <ul className="list-disc pl-5 text-sm text-neutral-600">
        {topic.seedQuestions.map((q, i) => (
          <li key={i}>{q}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {topic.targetExpressions.map((e, i) => (
          <span key={i} className="rounded-full bg-neutral-100 px-3 py-1 text-xs">
            {e}
          </span>
        ))}
      </div>
    </div>
  )
}
