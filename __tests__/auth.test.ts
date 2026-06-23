import { expect, test } from 'vitest'
import { isAuthed } from '@/src/lib/auth'

test('authed only with matching cookie', () => {
  expect(isAuthed('secret123', 'secret123')).toBe(true)
  expect(isAuthed('wrong', 'secret123')).toBe(false)
  expect(isAuthed(undefined, 'secret123')).toBe(false)
})
