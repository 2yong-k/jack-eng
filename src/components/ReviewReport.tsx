import Link from 'next/link'
import type { ReviewResult } from '@/src/lib/schemas'

const TYPE_LABEL: Record<string, string> = {
  grammar: '문법',
  'word-choice': '단어 선택',
  naturalness: '자연스러움',
}

export function ReviewReport({ review, streak }: { review: ReviewResult; streak?: number }) {
  const { corrections, expressions } = review
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">오늘의 리뷰</h1>
        {typeof streak === 'number' && streak > 0 && (
          <span className="text-accent text-sm font-medium" aria-label={`${streak}일 연속`}>
            <span aria-hidden="true">🔥</span> <span className="tabular-nums">{streak}</span>일 연속
          </span>
        )}
      </div>

      <section aria-labelledby="rev-corrections">
        <h2 id="rev-corrections" className="mb-2 text-sm font-semibold">
          교정 <span className="text-muted tabular-nums">({corrections.length})</span>
        </h2>
        {corrections.length === 0 ? (
          <p className="text-muted text-sm">교정할 부분이 없었어요. 좋아요!</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {corrections.map((c, i) => (
              <li
                key={`${c.original}-${i}`}
                className="bg-surface border-border rounded-[var(--radius)] border p-3 text-sm"
              >
                <p className="text-muted line-through" lang="en">
                  {c.original}
                </p>
                <p className="font-medium" lang="en">
                  {c.corrected}
                </p>
                <p className="text-muted mt-1">
                  {c.explanation}{' '}
                  <span className="bg-surface-muted ml-1 rounded px-1.5 py-0.5 text-xs">
                    {TYPE_LABEL[c.type] ?? c.type}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="rev-expressions">
        <h2 id="rev-expressions" className="mb-2 text-sm font-semibold">
          표현 <span className="text-muted tabular-nums">({expressions.length})</span>
        </h2>
        <ul className="flex flex-col gap-2">
          {expressions.map((e, i) => (
            <li
              key={`${e.text}-${i}`}
              className="bg-surface border-border rounded-[var(--radius)] border p-3 text-sm"
            >
              <strong lang="en">{e.text}</strong> — {e.meaning}
              <p className="text-muted mt-0.5" lang="en">
                {e.example}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/"
        className="bg-surface-muted hover:bg-border inline-flex h-11 items-center justify-center rounded-[var(--radius)] px-4 text-sm font-medium transition-colors"
      >
        홈으로
      </Link>
    </div>
  )
}
