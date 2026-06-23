'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { detectSpeechSupport } from '@/src/lib/speech-support'

// Minimal Web Speech API typings (not in TS lib.dom).
interface SpeechRecognitionResultLike {
  0: { transcript: string }
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>
}
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

export function useSpeech() {
  const [support] = useState(detectSpeechSupport)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recogRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    if (!support.stt) return
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Ctor) return
    const r = new Ctor()
    r.lang = 'en-US'
    r.interimResults = true
    r.continuous = false
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0].transcript)
        .join('')
      setTranscript(text)
    }
    r.onend = () => setListening(false)
    recogRef.current = r
  }, [support.stt])

  const start = useCallback(() => {
    if (recogRef.current) {
      setTranscript('')
      recogRef.current.start()
      setListening(true)
    }
  }, [])

  const stop = useCallback(() => {
    recogRef.current?.stop()
    setListening(false)
  }, [])

  const speak = useCallback(
    (text: string, rate = 1) => {
      if (!support.tts) return
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'
      u.rate = rate
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
    },
    [support.tts],
  )

  return {
    mode: support.stt ? ('voice' as const) : ('text' as const),
    support,
    listening,
    transcript,
    setTranscript,
    start,
    stop,
    speak,
  }
}
