import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/src/hooks/useSpeech', () => ({
  useSpeech: () => ({
    mode: 'text',
    support: { stt: false, tts: false },
    listening: false,
    transcript: '',
    setTranscript: () => {},
    start: () => {},
    stop: () => {},
    speak: () => {},
  }),
}))

import { ConversationView } from '@/src/components/ConversationView'
import type { Topic } from '@/db/schema'

const topic = { id: '1', title: 'T', scenario: 'pitch' } as unknown as Topic

test('shows text input when speech unsupported', () => {
  render(<ConversationView topic={topic} />)
  expect(screen.getByPlaceholderText(/type/i)).toBeInTheDocument()
})
