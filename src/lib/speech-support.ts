export function detectSpeechSupport(): { stt: boolean; tts: boolean } {
  if (typeof window === 'undefined') return { stt: false, tts: false }
  const w = window as unknown as Record<string, unknown>
  const stt = 'SpeechRecognition' in w || 'webkitSpeechRecognition' in w
  const tts = 'speechSynthesis' in w
  return { stt, tts }
}
