'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { detectSpeechSupport } from '@/src/lib/speech-support'

// Minimal Web Speech API typings (not in TS lib.dom).
interface SpeechRecognitionResultLike {
  // A result can be empty (some engines emit empty interim results), so index 0
  // is optional — guard before reading .transcript.
  0?: { transcript: string }
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>
}
interface SpeechRecognitionErrorLike {
  error: string
}
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((e: SpeechRecognitionErrorLike) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function errorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return '마이크 권한이 거부됐어요. 텍스트로 입력하거나 권한을 허용해 주세요.'
    case 'no-speech':
      return '음성이 감지되지 않았어요. 다시 시도해 주세요.'
    case 'audio-capture':
      return '마이크를 찾을 수 없어요.'
    case 'network':
      return '음성 인식 네트워크 오류가 발생했어요.'
    default:
      return '음성 인식 중 문제가 발생했어요.'
  }
}

export function useSpeech() {
  const [support] = useState(detectSpeechSupport)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
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
        .map((res) => res[0]?.transcript ?? '')
        .join('')
      setTranscript(text)
    }
    r.onend = () => setListening(false)
    r.onerror = (e) => {
      setListening(false)
      setError(errorMessage(e.error))
    }
    recogRef.current = r
    return () => {
      r.onresult = null
      r.onend = null
      r.onerror = null
      try {
        r.abort()
      } catch {
        // ignore — already stopped
      }
      recogRef.current = null
    }
  }, [support.stt])

  // Stop any in-progress TTS when the component using this hook unmounts.
  useEffect(() => {
    if (!support.tts) return
    return () => window.speechSynthesis.cancel()
  }, [support.tts])

  const start = useCallback(() => {
    if (!recogRef.current) return
    setError(null)
    setTranscript('')
    try {
      recogRef.current.start()
      setListening(true)
    } catch {
      // start() throws if already started — ignore.
    }
  }, [])

  const stop = useCallback(() => {
    recogRef.current?.stop()
    setListening(false)
  }, [])

  const speak = useCallback(
    (text: string, rate = 1) => {
      if (!support.tts || !text) return
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'
      u.rate = rate
      u.onstart = () => setSpeaking(true)
      u.onend = () => setSpeaking(false)
      u.onerror = () => setSpeaking(false)
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
    },
    [support.tts],
  )

  return {
    mode: support.stt ? ('voice' as const) : ('text' as const),
    support,
    listening,
    speaking,
    transcript,
    error,
    setTranscript,
    clearError: useCallback(() => setError(null), []),
    start,
    stop,
    speak,
  }
}
