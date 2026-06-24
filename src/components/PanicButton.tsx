'use client'
import { useId, useState } from 'react'
import type { TranslateResult } from '@/src/lib/schemas'

export function PanicButton() {
  const [open, setOpen] = useState(false)
  const [ko, setKo] = useState('')
  const [ans, setAns] = useState<TranslateResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    if (!ko.trim() || loading) return
    setLoading(true)
    setError(null)
    setAns(null)
    try {
      const r = await fetch('/api/translate', {
        method: 'POST',
        body: JSON.stringify({ korean: ko.trim() }),
      })
      if (!r.ok) throw new Error('bad response')
      setAns((await r.json()) as TranslateResult)
    } catch {
      setError('번역을 가져오지 못했어요. 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-surface-muted hover:bg-border inline-flex h-11 items-center gap-1.5 rounded-[var(--radius)] px-3 text-sm font-medium transition-colors"
      >
        <span aria-hidden="true">🆘</span> 이거 영어로?
      </button>
    )
  }

  return (
    <form onSubmit={ask} className="bg-surface border-border flex w-full flex-col gap-2 rounded-[var(--radius)] border p-3">
      <label htmlFor={inputId} className="text-muted text-xs font-medium">
        막힌 표현을 한국어로 입력하세요
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          value={ko}
          onChange={(e) => setKo(e.target.value)}
          placeholder="예: 다시 논의하시죠…"
          autoComplete="off"
          autoFocus
          className="bg-bg border-border focus-visible:border-accent min-w-0 flex-1 rounded-[var(--radius)] border px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={loading || !ko.trim()}
          aria-label="한국어를 영어로 번역"
          className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center rounded-[var(--radius)] px-4 text-sm font-medium disabled:opacity-40"
        >
          {loading ? '…' : '물어보기'}
        </button>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {ans && (
          <div className="text-sm">
            <strong lang="en">{ans.english}</strong>
            <p className="text-muted mt-0.5" lang="en">
              {ans.example}
            </p>
          </div>
        )}
      </div>
    </form>
  )
}
