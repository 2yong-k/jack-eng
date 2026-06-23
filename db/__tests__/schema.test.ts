import { expect, test } from 'vitest'
import { topics, sessions, corrections, expressions, dailyProgress } from '@/db/schema'

test('tables expose expected columns', () => {
  expect(Object.keys(topics)).toEqual(
    expect.arrayContaining(['id', 'date', 'scenario', 'title', 'seedQuestions', 'targetExpressions']),
  )
  expect(Object.keys(sessions)).toEqual(
    expect.arrayContaining(['id', 'topicId', 'transcript', 'startedAt']),
  )
  expect(Object.keys(corrections)).toEqual(
    expect.arrayContaining(['id', 'sessionId', 'original', 'corrected', 'explanation', 'type']),
  )
  expect(Object.keys(expressions)).toEqual(
    expect.arrayContaining(['id', 'text', 'meaning', 'example']),
  )
  expect(Object.keys(dailyProgress)).toEqual(
    expect.arrayContaining(['date', 'completed', 'streakCount']),
  )
})
