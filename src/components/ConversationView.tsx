'use client'
import { useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSpeech } from '@/src/hooks/useSpeech'
import { PanicButton } from '@/src/components/PanicButton'
import { ReviewReport } from '@/src/components/ReviewReport'
import { ReviewSchema, type ReviewResult } from '@/src/lib/schemas'
import type { Topic } from '@/db/schema'

type Msg = { id: string; role: 'user' | 'assistant'; content: string }

export function ConversationView({ topic }: { topic: Topic }) {
  const router = useRouter()
  const speech = useSpeech()
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [review, setReview] = useState<ReviewResult | null>(null)
  const [streak, setStreak] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef(0)
  const draftId = useId()
  const newId = () => `m${idRef.current++}`

  const wire = (list: Msg[]) => list.map(({ role, content }) => ({ role, content }))

  async function send(text: string) {
    const value = text.trim()
    if (!value || sending) return
    const userMsg: Msg = { id: newId(), role: 'user', content: value }
    const next = [...messages, userMsg]
    setMessages(next)
    setDraft('')
    speech.setTranscript('')
    speech.clearError()
    setError(null)
    setSending(true)
    let assistantId: string | null = null
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ topic: { title: topic.title, scenario: topic.scenario }, messages: wire(next) }),
      })
      if (!res.ok || !res.body) throw new Error('chat failed')
      assistantId = newId()
      const aId = assistantId
      setMessages((m) => [...m, { id: aId, role: 'assistant', content: '' }])
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let acc = ''
      for (;;) {
        const { done, value: chunk } = await reader.read()
        if (done) break
        acc += dec.decode(chunk, { stream: true })
        setMessages((m) => m.map((x) => (x.id === aId ? { ...x, content: acc } : x)))
      }
      acc += dec.decode()
      setMessages((m) => m.map((x) => (x.id === aId ? { ...x, content: acc } : x)))
      if (acc) speech.speak(acc)
    } catch {
      // Roll back the optimistic turn and let the user retry with their text restored.
      const discard = new Set([userMsg.id, assistantId].filter(Boolean) as string[])
      setMessages((m) => m.filter((x) => !discard.has(x.id)))
      // Restore the text where the user will see it: transcript (voice) or draft (text).
      if (speech.mode === 'voice') speech.setTranscript(value)
      else setDraft(value)
      setError('답변을 받지 못했어요. 다시 시도해 주세요.')
    } finally {
      setSending(false)
    }
  }

  async function endSession() {
    if (reviewing) return
    const userUtterances = messages.filter((m) => m.role === 'user').map((m) => m.content)
    if (userUtterances.length === 0) {
      setError('먼저 한 마디 이상 말해 주세요.')
      return
    }
    setReviewing(true)
    setError(null)
    try {
      const res = await fetch('/api/review', { method: 'POST', body: JSON.stringify({ userUtterances }) })
      if (!res.ok) throw new Error('review failed')
      const parsed = ReviewSchema.safeParse(await res.json())
      if (!parsed.success) throw new Error('invalid review')
      const save = await fetch('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ topicId: topic.id, transcript: wire(messages), review: parsed.data }),
      })
      if (save.ok) {
        const { streak: s } = (await save.json()) as { streak: number }
        setStreak(s)
        router.refresh() // refresh the server-rendered StreakBadge in the header
      }
      setReview(parsed.data)
    } catch {
      setError('리뷰 생성에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setReviewing(false)
    }
  }

  if (review) return <ReviewReport review={review} streak={streak ?? undefined} />

  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 ? (
        <p className="text-muted bg-surface-muted rounded-[var(--radius)] p-4 text-sm">
          <span aria-hidden="true">🎙️ </span>버튼을 누르고 첫 질문에 영어로 답해보세요
          {topic.seedQuestions[0] && (
            <>
              {' — '}
              <span lang="en" className="text-fg/80">
                “{topic.seedQuestions[0]}”
              </span>
            </>
          )}
        </p>
      ) : (
        <ul className="flex flex-col gap-3" role="log" aria-live="polite" aria-relevant="additions text">
          {messages.map((m) => (
            <li key={m.id} className={m.role === 'user' ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
              <span className="text-muted mb-0.5 px-1 text-xs">{m.role === 'user' ? '나' : '튜터'}</span>
              <span
                lang="en"
                className={
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground max-w-[85%] whitespace-pre-wrap break-words rounded-[var(--radius)] px-4 py-2'
                    : 'bg-surface-muted text-fg border-border max-w-[85%] whitespace-pre-wrap break-words rounded-[var(--radius)] border px-4 py-2'
                }
              >
                {m.content || (m.role === 'assistant' && sending ? <span className="text-muted">…</span> : null)}
              </span>
              {m.role === 'assistant' && m.content && speech.support.tts && (
                <button
                  type="button"
                  onClick={() => speech.speak(m.content, 0.75)}
                  aria-label="천천히 다시 듣기 (섀도잉)"
                  className="text-accent mt-1 inline-flex h-8 items-center gap-1 rounded-full px-2 text-xs font-medium"
                >
                  <span aria-hidden="true">🔁</span> 따라하기
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {speech.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {speech.error}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {speech.mode === 'voice' ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
            disabled={sending || speech.speaking}
            aria-pressed={speech.listening}
            aria-label={speech.listening ? '녹음 멈추기' : '말하기 시작'}
            className="bg-primary text-primary-foreground inline-flex h-12 items-center gap-2 rounded-full px-5 font-medium disabled:opacity-40"
          >
            <span aria-hidden="true">{speech.listening ? '⏹' : '🎙️'}</span>
            {speech.listening ? '멈추기' : '말하기'}
          </button>
          <span className="text-muted min-w-0 flex-1 truncate text-sm" lang="en" aria-live="polite" role="status">
            {speech.transcript}
          </span>
          {speech.transcript && !speech.listening && (
            <button
              type="button"
              onClick={() => send(speech.transcript)}
              disabled={sending}
              className="bg-surface-muted hover:bg-border inline-flex h-11 items-center rounded-[var(--radius)] px-4 text-sm font-medium transition-colors disabled:opacity-40"
            >
              보내기
            </button>
          )}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
          }}
          className="flex gap-2"
        >
          <label htmlFor={draftId} className="sr-only">
            답장 입력
          </label>
          <input
            id={draftId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="답장을 입력하세요…"
            autoComplete="off"
            lang="en"
            disabled={sending}
            className="bg-surface border-border focus-visible:border-accent min-w-0 flex-1 rounded-[var(--radius)] border px-3 py-2 text-sm outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="bg-primary text-primary-foreground inline-flex h-11 items-center rounded-[var(--radius)] px-4 text-sm font-medium disabled:opacity-40"
          >
            보내기
          </button>
        </form>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanicButton />
        <button
          type="button"
          onClick={endSession}
          disabled={reviewing || messages.length === 0}
          className="bg-surface-muted hover:bg-border inline-flex h-11 items-center rounded-[var(--radius)] px-4 text-sm font-medium transition-colors disabled:opacity-40"
        >
          {reviewing ? '리뷰 만드는 중…' : '세션 종료 후 리뷰 →'}
        </button>
      </div>
    </div>
  )
}
