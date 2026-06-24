import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))
vi.mock('@/src/hooks/useSpeech', () => ({
  useSpeech: () => ({
    mode: 'text',
    support: { stt: false, tts: false },
    listening: false,
    speaking: false,
    transcript: '',
    error: null,
    setTranscript: () => {},
    clearError: () => {},
    start: () => {},
    stop: () => {},
    speak: () => {},
  }),
}))

import { ConversationView } from '@/src/components/ConversationView'
import type { Topic } from '@/db/schema'

const topic = {
  id: '1',
  title: 'T',
  scenario: 'pitch',
  seedQuestions: ['Q1'],
  targetExpressions: [],
} as unknown as Topic

test('falls back to a labeled text input when speech is unsupported', () => {
  render(<ConversationView topic={topic} />)
  expect(screen.getByLabelText('답장 입력')).toBeInTheDocument()
})
