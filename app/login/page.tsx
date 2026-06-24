'use client'
import { useId, useState } from 'react'

export default function Login() {
  const [v, setV] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!v || loading) return
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ passphrase: v }),
      })
      if (r.ok) {
        location.href = '/'
        return
      }
      setError(r.status === 401 ? '암호가 올바르지 않아요.' : '로그인에 실패했어요.')
    } catch {
      setError('네트워크 오류가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main id="main" className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="flex w-72 flex-col gap-3">
        <h1 className="text-lg font-bold">오늘의 영어</h1>
        <label htmlFor={inputId} className="text-muted text-sm">
          암호
        </label>
        <input
          id={inputId}
          type="password"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="암호를 입력하세요…"
          autoComplete="current-password"
          autoFocus
          className="bg-surface border-border focus-visible:border-accent rounded-[var(--radius)] border px-3 py-2 outline-none"
        />
        <button
          type="submit"
          disabled={loading || !v}
          className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center rounded-[var(--radius)] px-3 font-medium disabled:opacity-40"
        >
          {loading ? '확인 중…' : '들어가기'}
        </button>
        <p aria-live="polite" className="min-h-5 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      </form>
    </main>
  )
}
