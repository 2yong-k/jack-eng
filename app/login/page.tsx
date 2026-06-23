'use client'
import { useState } from 'react'

export default function Login() {
  const [v, setV] = useState('')
  async function submit() {
    const r = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ passphrase: v }),
    })
    if (r.ok) location.href = '/'
  }
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex w-72 flex-col gap-3">
        <input
          type="password"
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="passphrase"
          className="rounded border px-3 py-2"
        />
        <button onClick={submit} className="rounded bg-black px-3 py-2 text-white">
          Enter
        </button>
      </div>
    </main>
  )
}
