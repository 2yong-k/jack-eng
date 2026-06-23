'use client'
import { useState } from 'react'
import { useSpeech } from '@/src/hooks/useSpeech'
import { PanicButton } from '@/src/components/PanicButton'
import { ReviewReport } from '@/src/components/ReviewReport'
import type { Topic } from '@/db/schema'
import type { ReviewResult } from '@/src/lib/schemas'

type Msg = { role: 'user' | 'assistant'; content: string }

export function ConversationView({ topic }: { topic: Topic }) {
  const speech = useSpeech()
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [review, setReview] = useState<ReviewResult | null>(null)

  async function send(text: string) {
    if (!text.trim()) return
    const next: Msg[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setDraft('')
    speech.setTranscript('')
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        topic: { title: topic.title, scenario: topic.scenario },
        messages: next,
      }),
    })
    if (!res.body) return
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let acc = ''
    setMessages((m) => [...m, { role: 'assistant', content: '' }])
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      acc += dec.decode(value)
      setMessages((m) => {
        const c = [...m]
        c[c.length - 1] = { role: 'assistant', content: acc }
        return c
      })
    }
    speech.speak(acc)
  }

  async function endSession() {
    const userUtterances = messages.filter((m) => m.role === 'user').map((m) => m.content)
    const res = await fetch('/api/review', {
      method: 'POST',
      body: JSON.stringify({ userUtterances }),
    })
    const data = (await res.json()) as ReviewResult
    setReview(data)
    await fetch('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ topicId: topic.id, transcript: messages, review: data }),
    })
  }

  if (review) return <ReviewReport review={review} />

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <ul className="flex flex-col gap-3">
        {messages.map((m, i) => (
          <li key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span className="inline-block rounded-2xl bg-neutral-100 px-4 py-2">{m.content}</span>
            {m.role === 'assistant' && m.content && (
              <button className="ml-2 text-xs underline" onClick={() => speech.speak(m.content, 0.75)}>
                🔁 shadow
              </button>
            )}
          </li>
        ))}
      </ul>

      {speech.mode === 'voice' ? (
        <div className="flex items-center gap-2">
          <button
            className="rounded-full bg-black px-5 py-3 text-white"
            onClick={() => (speech.listening ? speech.stop() : speech.start())}
          >
            {speech.listening ? '⏹ stop' : '🎙️ speak'}
          </button>
          <span className="text-neutral-500">{speech.transcript}</span>
          {speech.transcript && !speech.listening && (
            <button className="underline" onClick={() => send(speech.transcript)}>
              send
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="type your reply"
            className="flex-1 rounded border px-3 py-2"
          />
          <button className="rounded bg-black px-4 text-white" onClick={() => send(draft)}>
            send
          </button>
        </div>
      )}

      <div className="flex justify-between">
        <PanicButton />
        <button className="text-sm underline" onClick={endSession}>
          End &amp; review →
        </button>
      </div>
    </div>
  )
}
