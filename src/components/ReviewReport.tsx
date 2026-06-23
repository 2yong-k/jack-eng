import Link from 'next/link'
import type { ReviewResult } from '@/src/lib/schemas'

export function ReviewReport({ review }: { review: ReviewResult }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
      <section>
        <h2 className="mb-2 font-bold">교정</h2>
        {review.corrections.map((c, i) => (
          <div key={i} className="border-b py-2 text-sm">
            <div className="text-neutral-400 line-through">{c.original}</div>
            <div className="font-medium">{c.corrected}</div>
            <div className="text-neutral-500">
              {c.explanation} <span className="text-xs">({c.type})</span>
            </div>
          </div>
        ))}
      </section>
      <section>
        <h2 className="mb-2 font-bold">표현</h2>
        {review.expressions.map((e, i) => (
          <div key={i} className="border-b py-2 text-sm">
            <b>{e.text}</b> — {e.meaning}
            <br />
            <span className="text-neutral-500">{e.example}</span>
          </div>
        ))}
      </section>
      <Link href="/" className="text-sm underline">
        홈으로
      </Link>
    </div>
  )
}
