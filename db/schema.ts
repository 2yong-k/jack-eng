import { pgTable, uuid, text, jsonb, timestamp, boolean, integer, date } from 'drizzle-orm/pg-core'

export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: date('date').notNull().unique(),
  scenario: text('scenario').notNull(), // 'pitch' | 'negotiation' | 'technical' | 'networking'
  title: text('title').notNull(),
  seedQuestions: jsonb('seed_questions').$type<string[]>().notNull(),
  targetExpressions: jsonb('target_expressions').$type<string[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').references(() => topics.id),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  endedAt: timestamp('ended_at'),
  transcript: jsonb('transcript')
    .$type<{ role: 'user' | 'assistant'; content: string }[]>()
    .notNull()
    .default([]),
})

export const corrections = pgTable('corrections', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id')
    .references(() => sessions.id)
    .notNull(),
  original: text('original').notNull(),
  corrected: text('corrected').notNull(),
  explanation: text('explanation').notNull(),
  type: text('type').notNull(), // 'grammar' | 'word-choice' | 'naturalness'
})

export const expressions = pgTable('expressions', {
  id: uuid('id').defaultRandom().primaryKey(),
  text: text('text').notNull(),
  meaning: text('meaning').notNull(),
  example: text('example').notNull(),
  sourceSessionId: uuid('source_session_id').references(() => sessions.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const dailyProgress = pgTable('daily_progress', {
  date: date('date').primaryKey(),
  completed: boolean('completed').notNull().default(false),
  streakCount: integer('streak_count').notNull().default(0),
})

export type Topic = typeof topics.$inferSelect
export type Session = typeof sessions.$inferSelect
export type Correction = typeof corrections.$inferSelect
export type Expression = typeof expressions.$inferSelect
export type DailyProgress = typeof dailyProgress.$inferSelect
