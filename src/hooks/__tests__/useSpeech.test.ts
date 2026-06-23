import { expect, test, vi, beforeEach } from 'vitest'
import { detectSpeechSupport } from '@/src/lib/speech-support'

beforeEach(() => {
  vi.unstubAllGlobals()
})

test('reports text mode when STT unsupported', () => {
  vi.stubGlobal('window', {})
  const s = detectSpeechSupport()
  expect(s.stt).toBe(false)
})

test('reports stt support when SpeechRecognition present', () => {
  vi.stubGlobal('window', { SpeechRecognition: function () {}, speechSynthesis: {} })
  const s = detectSpeechSupport()
  expect(s.stt).toBe(true)
  expect(s.tts).toBe(true)
})
