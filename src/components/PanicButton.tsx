'use client'
import { useState } from 'react'

export function PanicButton() {
  const [open, setOpen] = useState(false)
  const [ko, setKo] = useState('')
  const [ans, setAns] = useState<{ english: string; example: string } | null>(null)

  async function ask() {
    const r = await fetch('/api/translate', {
      method: 'POST',
      body: JSON.stringify({ korean: ko }),
    })
    setAns((await r.json()) as { english: string; example: string })
  }

  if (!open) {
    return (
      <button className="text-sm underline" onClick={() => setOpen(true)}>
        🆘 이거 영어로?
      </button>
    )
  }
  return (
    <div className="flex flex-col gap-2 rounded border p-3">
      <input
        value={ko}
        onChange={(e) => setKo(e.target.value)}
        placeholder="한국어로 입력"
        className="rounded border px-2 py-1"
      />
      <button className="rounded bg-black px-3 py-1 text-sm text-white" onClick={ask}>
        물어보기
      </button>
      {ans && (
        <div className="text-sm">
          <b>{ans.english}</b>
          <br />
          <span className="text-neutral-500">{ans.example}</span>
        </div>
      )}
    </div>
  )
}
