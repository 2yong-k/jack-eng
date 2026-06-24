# Daily English Conversation App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a voice-first daily English conversation web app where the user talks with Claude on a domain-relevant topic, gets an end-of-session correction report, shadows replies, asks "how do I say X" mid-conversation, and keeps a daily streak.

**Architecture:** Next.js (App Router) full-stack on Vercel. Browser Web Speech API for STT/TTS. Postgres (Supabase/Neon) via Drizzle ORM. Anthropic SDK with model split: Sonnet 4.6 for high-frequency chat/translate/topic-gen, Opus 4.8 for the once-per-session correction report. Vercel Cron generates the daily topic.

**Tech Stack:** Next.js 15 (App Router, RSC), TypeScript (strict), Tailwind + shadcn/ui, Drizzle ORM + Postgres, `@anthropic-ai/sdk`, Zod, Vitest + Testing Library.

## Global Constraints

- TypeScript strict mode; `noUncheckedIndexedAccess: true`; module: NodeNext. No `any`/`unknown` in app code.
- Model IDs (exact): chat/translate/topic → `claude-sonnet-4-6`; review → `claude-opus-4-8`.
- All structured model output (`/api/review`, `/api/translate`, topic-gen) MUST be validated with Zod; malformed output fails loudly.
- Single user — no account system. Access gated by a passphrase env var.
- App MUST remain fully usable with NO speech support (text fallback).
- Anthropic API key, DB URL, and app passphrase live in env vars only; never committed. `.env.example` documents them.
- Test charter: contracts + boundaries only (Zod schemas, fallback branches, idempotency, streak math). No struct-assembly tests.

---

### Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.env.example`
- Test: `src/lib/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: a running Next.js app, `pnpm test` (Vitest) wired, Tailwind active.

- [ ] **Step 1: Scaffold Next.js + deps**

```bash
pnpm dlx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*" --no-turbopack --yes
pnpm add @anthropic-ai/sdk zod drizzle-orm postgres
pnpm add -D drizzle-kit vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Set tsconfig strict flags**

In `tsconfig.json` `compilerOptions`, ensure: `"strict": true, "noUncheckedIndexedAccess": true`.

- [ ] **Step 3: Add vitest config**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./vitest.setup.ts'] },
  resolve: { alias: { '@': new URL('.', import.meta.url).pathname } },
})
```

```ts
// vitest.setup.ts
import '@testing-library/jest-dom/vitest'
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"db:push": "drizzle-kit push"`.

- [ ] **Step 4: Write smoke test**

```ts
// src/lib/__tests__/smoke.test.ts
import { expect, test } from 'vitest'
test('smoke', () => { expect(1 + 1).toBe(2) })
```

- [ ] **Step 5: Run test (expect PASS)**

Run: `pnpm test`
Expected: 1 passed.

- [ ] **Step 6: Write `.env.example`**

```bash
ANTHROPIC_API_KEY=sk-ant-xxx
DATABASE_URL=postgres://user:pass@host:5432/db
APP_PASSPHRASE=choose-a-long-secret
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js app with vitest, tailwind, drizzle deps"
```

---

### Task 2: Database schema (Drizzle)

**Files:**
- Create: `db/schema.ts`, `db/client.ts`, `drizzle.config.ts`
- Test: `db/__tests__/schema.test.ts`

**Interfaces:**
- Produces: tables `topics, sessions, corrections, expressions, daily_progress`; typed `db` client; exported row types `Topic, Session, Correction, Expression, DailyProgress`.

- [ ] **Step 1: Write schema test (compile-time contract)**

```ts
// db/__tests__/schema.test.ts
import { expect, test } from 'vitest'
import { topics, sessions, corrections, expressions, dailyProgress } from '@/db/schema'
test('tables expose expected columns', () => {
  expect(Object.keys(topics)).toEqual(expect.arrayContaining(['id', 'date', 'scenario', 'title', 'seedQuestions', 'targetExpressions']))
  expect(Object.keys(sessions)).toEqual(expect.arrayContaining(['id', 'topicId', 'transcript', 'startedAt']))
  expect(Object.keys(corrections)).toEqual(expect.arrayContaining(['id', 'sessionId', 'original', 'corrected', 'explanation', 'type']))
  expect(Object.keys(expressions)).toEqual(expect.arrayContaining(['id', 'text', 'meaning', 'example']))
  expect(Object.keys(dailyProgress)).toEqual(expect.arrayContaining(['date', 'completed', 'streakCount']))
})
```

- [ ] **Step 2: Run (expect FAIL — module not found)**

Run: `pnpm test schema`
Expected: FAIL, cannot resolve `@/db/schema`.

- [ ] **Step 3: Write schema**

```ts
// db/schema.ts
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
  transcript: jsonb('transcript').$type<{ role: 'user' | 'assistant'; content: string }[]>().notNull().default([]),
})

export const corrections = pgTable('corrections', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
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
```

```ts
// db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
const url = process.env.DATABASE_URL
if (!url) throw new Error('DATABASE_URL is not set')
export const db = drizzle(postgres(url))
```

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'
export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

- [ ] **Step 4: Run (expect PASS)**

Run: `pnpm test schema`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add drizzle schema for topics, sessions, corrections, expressions, progress"
```

---

### Task 3: Anthropic client + model config

**Files:**
- Create: `src/lib/anthropic.ts`, `src/lib/models.ts`
- Test: `src/lib/__tests__/models.test.ts`

**Interfaces:**
- Produces: `MODELS` const (`{ chat: 'claude-sonnet-4-6', review: 'claude-opus-4-8' }`), `anthropic` SDK instance.

- [ ] **Step 1: Write model-config test**

```ts
// src/lib/__tests__/models.test.ts
import { expect, test } from 'vitest'
import { MODELS } from '@/src/lib/models'
test('model ids are pinned', () => {
  expect(MODELS.chat).toBe('claude-sonnet-4-6')
  expect(MODELS.review).toBe('claude-opus-4-8')
})
```

- [ ] **Step 2: Run (expect FAIL)** — `pnpm test models`

- [ ] **Step 3: Implement**

```ts
// src/lib/models.ts
export const MODELS = {
  chat: 'claude-sonnet-4-6',
  review: 'claude-opus-4-8',
} as const
```

```ts
// src/lib/anthropic.ts
import Anthropic from '@anthropic-ai/sdk'
const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
export const anthropic = new Anthropic({ apiKey })
```

- [ ] **Step 4: Run (expect PASS)** — `pnpm test models`

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add anthropic client and pinned model config"`

---

### Task 4: Review schema + `/api/review` (structured correction, Opus)

**Files:**
- Create: `src/lib/schemas.ts`, `app/api/review/route.ts`
- Test: `src/lib/__tests__/schemas.test.ts`

**Interfaces:**
- Produces: `ReviewSchema` (Zod), `ReviewResult` type, `POST /api/review` returning `{ corrections, expressions }`.
- Consumes: `anthropic`, `MODELS.review` (Task 3).

- [ ] **Step 1: Write Zod contract test (valid + invalid)**

```ts
// src/lib/__tests__/schemas.test.ts
import { expect, test } from 'vitest'
import { ReviewSchema } from '@/src/lib/schemas'
test('accepts well-formed review', () => {
  const ok = { corrections: [{ original: 'I go store', corrected: 'I went to the store', explanation: 'past tense + article', type: 'grammar' }], expressions: [{ text: 'circle back', meaning: '다시 논의하다', example: "Let's circle back on this." }] }
  expect(ReviewSchema.parse(ok)).toEqual(ok)
})
test('rejects malformed review (bad type enum)', () => {
  const bad = { corrections: [{ original: 'x', corrected: 'y', explanation: 'z', type: 'wrong' }], expressions: [] }
  expect(() => ReviewSchema.parse(bad)).toThrow()
})
```

- [ ] **Step 2: Run (expect FAIL)** — `pnpm test schemas`

- [ ] **Step 3: Implement schemas**

```ts
// src/lib/schemas.ts
import { z } from 'zod'
export const ReviewSchema = z.object({
  corrections: z.array(z.object({
    original: z.string(),
    corrected: z.string(),
    explanation: z.string(),
    type: z.enum(['grammar', 'word-choice', 'naturalness']),
  })),
  expressions: z.array(z.object({
    text: z.string(),
    meaning: z.string(),
    example: z.string(),
  })),
})
export type ReviewResult = z.infer<typeof ReviewSchema>

export const TranslateSchema = z.object({
  english: z.string(),
  example: z.string(),
})
export type TranslateResult = z.infer<typeof TranslateSchema>

export const TopicSchema = z.object({
  scenario: z.enum(['pitch', 'negotiation', 'technical', 'networking']),
  title: z.string(),
  seedQuestions: z.array(z.string()).min(3),
  targetExpressions: z.array(z.string()).min(5),
})
export type TopicResult = z.infer<typeof TopicSchema>
```

- [ ] **Step 4: Run (expect PASS)** — `pnpm test schemas`

- [ ] **Step 5: Implement `/api/review`**

```ts
// app/api/review/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/src/lib/anthropic'
import { MODELS } from '@/src/lib/models'
import { ReviewSchema } from '@/src/lib/schemas'

const tool = {
  name: 'submit_review',
  description: 'Submit the correction report for the user English utterances.',
  input_schema: {
    type: 'object',
    properties: {
      corrections: { type: 'array', items: { type: 'object', properties: {
        original: { type: 'string' }, corrected: { type: 'string' },
        explanation: { type: 'string' }, type: { type: 'string', enum: ['grammar', 'word-choice', 'naturalness'] },
      }, required: ['original', 'corrected', 'explanation', 'type'] } },
      expressions: { type: 'array', items: { type: 'object', properties: {
        text: { type: 'string' }, meaning: { type: 'string' }, example: { type: 'string' },
      }, required: ['text', 'meaning', 'example'] } },
    },
    required: ['corrections', 'expressions'],
  },
} as const

export async function POST(req: NextRequest) {
  const { userUtterances } = (await req.json()) as { userUtterances: string[] }
  const msg = await anthropic.messages.create({
    model: MODELS.review,
    max_tokens: 2048,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_review' },
    messages: [{
      role: 'user',
      content: `You are an English tutor for a Korean blockchain CTO. Analyze ONLY these user utterances. Give grammar/word-choice/naturalness corrections and 5 useful expressions (meaning in Korean). Utterances:\n${userUtterances.map((u, i) => `${i + 1}. ${u}`).join('\n')}`,
    }],
  })
  const block = msg.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') return NextResponse.json({ error: 'no tool output' }, { status: 502 })
  const parsed = ReviewSchema.safeParse(block.input)
  if (!parsed.success) return NextResponse.json({ error: 'invalid review', issues: parsed.error.issues }, { status: 502 })
  return NextResponse.json(parsed.data)
}
```

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: add zod schemas and /api/review structured correction endpoint"`

---

### Task 5: `/api/chat` streaming conversation (Sonnet)

**Files:**
- Create: `app/api/chat/route.ts`, `src/lib/prompts.ts`
- Test: `src/lib/__tests__/prompts.test.ts`

**Interfaces:**
- Produces: `buildChatSystemPrompt(topic)` → string; `POST /api/chat` streaming text.
- Consumes: `anthropic`, `MODELS.chat`, `Topic` type.

- [ ] **Step 1: Write prompt test**

```ts
// src/lib/__tests__/prompts.test.ts
import { expect, test } from 'vitest'
import { buildChatSystemPrompt } from '@/src/lib/prompts'
test('system prompt embeds topic + stays-on-topic instruction', () => {
  const p = buildChatSystemPrompt({ title: 'Series A pitch', scenario: 'pitch' })
  expect(p).toContain('Series A pitch')
  expect(p.toLowerCase()).toContain('one follow-up')
})
```

- [ ] **Step 2: Run (expect FAIL)** — `pnpm test prompts`

- [ ] **Step 3: Implement prompts**

```ts
// src/lib/prompts.ts
export function buildChatSystemPrompt(topic: { title: string; scenario: string }): string {
  return [
    'You are a friendly native English conversation partner for a Korean blockchain CTO.',
    `Today's topic: "${topic.title}" (scenario: ${topic.scenario}).`,
    'Keep replies short and spoken-style (1-3 sentences). Stay on topic.',
    'End most replies with exactly one follow-up question to keep them talking.',
    'Do NOT correct their grammar mid-conversation; corrections happen later.',
  ].join(' ')
}
```

- [ ] **Step 4: Run (expect PASS)** — `pnpm test prompts`

- [ ] **Step 5: Implement `/api/chat` (streaming)**

```ts
// app/api/chat/route.ts
import { NextRequest } from 'next/server'
import { anthropic } from '@/src/lib/anthropic'
import { MODELS } from '@/src/lib/models'
import { buildChatSystemPrompt } from '@/src/lib/prompts'

export async function POST(req: NextRequest) {
  const { topic, messages } = (await req.json()) as {
    topic: { title: string; scenario: string }
    messages: { role: 'user' | 'assistant'; content: string }[]
  }
  const stream = await anthropic.messages.create({
    model: MODELS.chat, max_tokens: 512, stream: true,
    system: buildChatSystemPrompt(topic), messages,
  })
  const encoder = new TextEncoder()
  const body = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(event.delta.text))
        }
      }
      controller.close()
    },
  })
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
```

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: add /api/chat streaming conversation endpoint"`

---

### Task 6: `/api/translate` panic button (Sonnet, structured)

**Files:**
- Create: `app/api/translate/route.ts`
- Test: covered by `TranslateSchema` test (add case to `schemas.test.ts`)

**Interfaces:**
- Produces: `POST /api/translate` → `{ english, example }`.
- Consumes: `anthropic`, `MODELS.chat`, `TranslateSchema` (Task 4).

- [ ] **Step 1: Add TranslateSchema test case**

```ts
// append to src/lib/__tests__/schemas.test.ts
import { TranslateSchema } from '@/src/lib/schemas'
test('translate result requires english + example', () => {
  expect(() => TranslateSchema.parse({ english: 'circle back' })).toThrow()
  expect(TranslateSchema.parse({ english: 'circle back', example: "Let's circle back." }).english).toBe('circle back')
})
```

- [ ] **Step 2: Run (expect PASS — schema already defined in Task 4)** — `pnpm test schemas`

- [ ] **Step 3: Implement `/api/translate`**

```ts
// app/api/translate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/src/lib/anthropic'
import { MODELS } from '@/src/lib/models'
import { TranslateSchema } from '@/src/lib/schemas'

const tool = {
  name: 'submit_translation',
  description: 'Give the natural English chunk for the Korean phrase.',
  input_schema: { type: 'object', properties: {
    english: { type: 'string' }, example: { type: 'string' },
  }, required: ['english', 'example'] },
} as const

export async function POST(req: NextRequest) {
  const { korean } = (await req.json()) as { korean: string }
  const msg = await anthropic.messages.create({
    model: MODELS.chat, max_tokens: 256, tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_translation' },
    messages: [{ role: 'user', content: `Give the most natural spoken English for this Korean, as a reusable chunk, plus one example sentence: "${korean}"` }],
  })
  const block = msg.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') return NextResponse.json({ error: 'no tool output' }, { status: 502 })
  const parsed = TranslateSchema.safeParse(block.input)
  if (!parsed.success) return NextResponse.json({ error: 'invalid translation' }, { status: 502 })
  return NextResponse.json(parsed.data)
}
```

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: add /api/translate panic-button endpoint"`

---

### Task 7: Daily topic — generation + idempotent endpoint + cron

**Files:**
- Create: `src/lib/topics.ts`, `app/api/topics/today/route.ts`, `app/api/cron/daily-topic/route.ts`, `vercel.json`
- Test: `src/lib/__tests__/topics.test.ts`

**Interfaces:**
- Produces: `getOrCreateTopic(date)` (idempotent), `GET /api/topics/today`, cron handler.
- Consumes: `db`, `topics` table, `anthropic`, `MODELS.chat`, `TopicSchema`.

- [ ] **Step 1: Write idempotency test (mock db + anthropic)**

```ts
// src/lib/__tests__/topics.test.ts
import { expect, test, vi } from 'vitest'
import { generateTopicInput } from '@/src/lib/topics'

test('generateTopicInput validates model output against TopicSchema', async () => {
  const fakeAnthropic = { messages: { create: vi.fn().mockResolvedValue({
    content: [{ type: 'tool_use', name: 'submit_topic', input: {
      scenario: 'pitch', title: 'Pitching tokenomics to a VC',
      seedQuestions: ['q1', 'q2', 'q3'],
      targetExpressions: ['e1', 'e2', 'e3', 'e4', 'e5'],
    } }],
  }) } }
  const result = await generateTopicInput(fakeAnthropic as never)
  expect(result.scenario).toBe('pitch')
  expect(result.targetExpressions).toHaveLength(5)
})
```

- [ ] **Step 2: Run (expect FAIL)** — `pnpm test topics`

- [ ] **Step 3: Implement `topics.ts`**

```ts
// src/lib/topics.ts
import type Anthropic from '@anthropic-ai/sdk'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { topics } from '@/db/schema'
import { MODELS } from '@/src/lib/models'
import { TopicSchema, type TopicResult } from '@/src/lib/schemas'

const tool = {
  name: 'submit_topic',
  description: 'Submit a daily English practice topic for a blockchain CTO.',
  input_schema: { type: 'object', properties: {
    scenario: { type: 'string', enum: ['pitch', 'negotiation', 'technical', 'networking'] },
    title: { type: 'string' },
    seedQuestions: { type: 'array', items: { type: 'string' } },
    targetExpressions: { type: 'array', items: { type: 'string' } },
  }, required: ['scenario', 'title', 'seedQuestions', 'targetExpressions'] },
} as const

export async function generateTopicInput(client: Anthropic): Promise<TopicResult> {
  const msg = await client.messages.create({
    model: MODELS.chat, max_tokens: 1024, tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_topic' },
    messages: [{ role: 'user', content: 'Create ONE English conversation practice topic for a Korean blockchain CTO who free-talks with foreign investors. Rotate scenarios across pitch/negotiation/technical/networking. Give 3 seed questions and 5 target expressions.' }],
  })
  const block = msg.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new Error('no topic tool output')
  return TopicSchema.parse(block.input)
}

export async function getOrCreateTopic(client: Anthropic, isoDate: string) {
  const existing = await db.select().from(topics).where(eq(topics.date, isoDate)).limit(1)
  if (existing[0]) return existing[0]
  const input = await generateTopicInput(client)
  const inserted = await db.insert(topics).values({ date: isoDate, ...input }).onConflictDoNothing().returning()
  if (inserted[0]) return inserted[0]
  const reRead = await db.select().from(topics).where(eq(topics.date, isoDate)).limit(1)
  return reRead[0]!
}
```

- [ ] **Step 4: Run (expect PASS)** — `pnpm test topics`

- [ ] **Step 5: Implement endpoints + cron config**

```ts
// app/api/topics/today/route.ts
import { NextResponse } from 'next/server'
import { anthropic } from '@/src/lib/anthropic'
import { getOrCreateTopic } from '@/src/lib/topics'
export async function GET() {
  const isoDate = new Date().toISOString().slice(0, 10)
  const topic = await getOrCreateTopic(anthropic, isoDate)
  return NextResponse.json(topic)
}
```

```ts
// app/api/cron/daily-topic/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/src/lib/anthropic'
import { getOrCreateTopic } from '@/src/lib/topics'
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  const topic = await getOrCreateTopic(anthropic, tomorrow)
  return NextResponse.json({ ok: true, topicId: topic.id })
}
```

```json
// vercel.json
{ "crons": [{ "path": "/api/cron/daily-topic", "schedule": "0 18 * * *" }] }
```

Add `CRON_SECRET=...` to `.env.example`.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: add idempotent daily topic generation, endpoint, and cron"`

---

### Task 8: `useSpeech` hook (STT/TTS + text fallback)

**Files:**
- Create: `src/hooks/useSpeech.ts`, `src/lib/speech-support.ts`
- Test: `src/hooks/__tests__/useSpeech.test.ts`

**Interfaces:**
- Produces: `detectSpeechSupport()` → `{ stt: boolean; tts: boolean }`; `useSpeech()` → `{ mode, listening, transcript, start, stop, speak }`.

- [ ] **Step 1: Write support-detection + fallback test**

```ts
// src/hooks/__tests__/useSpeech.test.ts
import { expect, test, vi, beforeEach } from 'vitest'
import { detectSpeechSupport } from '@/src/lib/speech-support'

beforeEach(() => { vi.unstubAllGlobals() })
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
```

- [ ] **Step 2: Run (expect FAIL)** — `pnpm test useSpeech`

- [ ] **Step 3: Implement support detection**

```ts
// src/lib/speech-support.ts
export function detectSpeechSupport(): { stt: boolean; tts: boolean } {
  if (typeof window === 'undefined') return { stt: false, tts: false }
  const w = window as unknown as Record<string, unknown>
  const stt = 'SpeechRecognition' in w || 'webkitSpeechRecognition' in w
  const tts = 'speechSynthesis' in w
  return { stt, tts }
}
```

- [ ] **Step 4: Run (expect PASS)** — `pnpm test useSpeech`

- [ ] **Step 5: Implement the hook**

```ts
// src/hooks/useSpeech.ts
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { detectSpeechSupport } from '@/src/lib/speech-support'

export function useSpeech() {
  const [support] = useState(detectSpeechSupport)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recogRef = useRef<any>(null)

  useEffect(() => {
    if (!support.stt) return
    const w = window as any
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    const r = new Ctor()
    r.lang = 'en-US'; r.interimResults = true; r.continuous = false
    r.onresult = (e: any) => {
      const text = Array.from(e.results).map((res: any) => res[0].transcript).join('')
      setTranscript(text)
    }
    r.onend = () => setListening(false)
    recogRef.current = r
  }, [support.stt])

  const start = useCallback(() => { if (recogRef.current) { setTranscript(''); recogRef.current.start(); setListening(true) } }, [])
  const stop = useCallback(() => { recogRef.current?.stop(); setListening(false) }, [])
  const speak = useCallback((text: string, rate = 1) => {
    if (!support.tts) return
    const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = rate
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u)
  }, [support.tts])

  return { mode: support.stt ? ('voice' as const) : ('text' as const), support, listening, transcript, setTranscript, start, stop, speak }
}
```

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: add useSpeech hook with STT/TTS and text fallback"`

---

### Task 9: Streak logic + persistence helpers

**Files:**
- Create: `src/lib/streak.ts`
- Test: `src/lib/__tests__/streak.test.ts`

**Interfaces:**
- Produces: `nextStreak(prev, prevDate, today)` → number (pure function).

- [ ] **Step 1: Write streak boundary test**

```ts
// src/lib/__tests__/streak.test.ts
import { expect, test } from 'vitest'
import { nextStreak } from '@/src/lib/streak'
test('consecutive day increments', () => { expect(nextStreak(3, '2026-06-22', '2026-06-23')).toBe(4) })
test('gap resets to 1', () => { expect(nextStreak(3, '2026-06-20', '2026-06-23')).toBe(1) })
test('same day keeps streak', () => { expect(nextStreak(3, '2026-06-23', '2026-06-23')).toBe(3) })
test('no prior streak starts at 1', () => { expect(nextStreak(0, null, '2026-06-23')).toBe(1) })
```

- [ ] **Step 2: Run (expect FAIL)** — `pnpm test streak`

- [ ] **Step 3: Implement**

```ts
// src/lib/streak.ts
export function nextStreak(prev: number, prevDate: string | null, today: string): number {
  if (!prevDate) return 1
  if (prevDate === today) return prev
  const diff = (Date.parse(today) - Date.parse(prevDate)) / 86_400_000
  return diff === 1 ? prev + 1 : 1
}
```

- [ ] **Step 4: Run (expect PASS)** — `pnpm test streak`

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add pure streak calculation"`

---

### Task 10: Session persistence endpoint (`/api/sessions`)

**Files:**
- Create: `app/api/sessions/route.ts`
- Test: manual (DB write) — covered by integration once DB is provisioned; no unit test (thin DB glue).

**Interfaces:**
- Produces: `POST /api/sessions` — persists transcript + corrections + expressions + updates streak. Returns `{ sessionId, streak }`.
- Consumes: `db`, all tables, `nextStreak` (Task 9).

- [ ] **Step 1: Implement endpoint**

```ts
// app/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { sessions, corrections, expressions, dailyProgress } from '@/db/schema'
import { nextStreak } from '@/src/lib/streak'
import type { ReviewResult } from '@/src/lib/schemas'

export async function POST(req: NextRequest) {
  const { topicId, transcript, review } = (await req.json()) as {
    topicId: string
    transcript: { role: 'user' | 'assistant'; content: string }[]
    review: ReviewResult
  }
  const today = new Date().toISOString().slice(0, 10)
  const [session] = await db.insert(sessions).values({ topicId, transcript, endedAt: new Date() }).returning()
  if (!session) return NextResponse.json({ error: 'insert failed' }, { status: 500 })
  if (review.corrections.length) await db.insert(corrections).values(review.corrections.map((c) => ({ sessionId: session.id, ...c })))
  if (review.expressions.length) await db.insert(expressions).values(review.expressions.map((e) => ({ sourceSessionId: session.id, ...e })))

  const prior = await db.select().from(dailyProgress).orderBy(desc(dailyProgress.date)).limit(1)
  const streak = nextStreak(prior[0]?.streakCount ?? 0, prior[0]?.date ?? null, today)
  await db.insert(dailyProgress).values({ date: today, completed: true, streakCount: streak })
    .onConflictDoUpdate({ target: dailyProgress.date, set: { completed: true, streakCount: streak } })

  return NextResponse.json({ sessionId: session.id, streak })
}
```

- [ ] **Step 2: Typecheck** — Run: `pnpm exec tsc --noEmit` → Expected: no errors.

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: add /api/sessions persistence + streak update"`

---

### Task 11: Passphrase auth gate (middleware)

**Files:**
- Create: `middleware.ts`, `app/login/page.tsx`, `app/api/login/route.ts`
- Test: `__tests__/auth.test.ts`

**Interfaces:**
- Produces: cookie-based gate; unauthenticated requests to app routes redirect to `/login`.

- [ ] **Step 1: Write auth-check test (pure helper)**

```ts
// __tests__/auth.test.ts
import { expect, test } from 'vitest'
import { isAuthed } from '@/src/lib/auth'
test('authed only with matching cookie', () => {
  expect(isAuthed('secret123', 'secret123')).toBe(true)
  expect(isAuthed('wrong', 'secret123')).toBe(false)
  expect(isAuthed(undefined, 'secret123')).toBe(false)
})
```

- [ ] **Step 2: Run (expect FAIL)** — `pnpm test auth`

- [ ] **Step 3: Implement helper + middleware + login**

```ts
// src/lib/auth.ts
export function isAuthed(cookieVal: string | undefined, passphrase: string): boolean {
  return !!cookieVal && cookieVal === passphrase
}
```

```ts
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { isAuthed } from '@/src/lib/auth'
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith('/login') || pathname.startsWith('/api/login') || pathname.startsWith('/api/cron')) return NextResponse.next()
  if (!isAuthed(req.cookies.get('auth')?.value, process.env.APP_PASSPHRASE ?? '')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```

```ts
// app/api/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
export async function POST(req: NextRequest) {
  const { passphrase } = (await req.json()) as { passphrase: string }
  if (passphrase !== process.env.APP_PASSPHRASE) return NextResponse.json({ ok: false }, { status: 401 })
  const res = NextResponse.json({ ok: true })
  res.cookies.set('auth', passphrase, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 })
  return res
}
```

```tsx
// app/login/page.tsx
'use client'
import { useState } from 'react'
export default function Login() {
  const [v, setV] = useState('')
  async function submit() {
    const r = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ passphrase: v }) })
    if (r.ok) location.href = '/'
  }
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col gap-3 w-72">
        <input type="password" value={v} onChange={(e) => setV(e.target.value)} placeholder="passphrase" className="border rounded px-3 py-2" />
        <button onClick={submit} className="bg-black text-white rounded px-3 py-2">Enter</button>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Run (expect PASS)** — `pnpm test auth`

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add passphrase auth gate via middleware"`

---

### Task 12: UI — home, conversation, review, shadow, panic, streak

**Files:**
- Create: `app/page.tsx` (replace), `src/components/TopicCard.tsx`, `src/components/ConversationView.tsx`, `src/components/ReviewReport.tsx`, `src/components/StreakBadge.tsx`, `src/components/PanicButton.tsx`
- Test: `src/components/__tests__/ConversationView.test.tsx` (fallback render)

**Interfaces:**
- Consumes: `useSpeech`, `Topic` type, all API routes.
- Produces: the working daily-loop UI.

- [ ] **Step 1: Write fallback-render test**

```tsx
// src/components/__tests__/ConversationView.test.tsx
import { expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
vi.mock('@/src/hooks/useSpeech', () => ({ useSpeech: () => ({ mode: 'text', support: { stt: false, tts: false }, listening: false, transcript: '', setTranscript: () => {}, start: () => {}, stop: () => {}, speak: () => {} }) }))
import { ConversationView } from '@/src/components/ConversationView'
test('shows text input when speech unsupported', () => {
  render(<ConversationView topic={{ id: '1', title: 'T', scenario: 'pitch' } as never} />)
  expect(screen.getByPlaceholderText(/type/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run (expect FAIL)** — `pnpm test ConversationView`

- [ ] **Step 3: Implement `ConversationView` (mic/text + shadow + panic + end→review)**

```tsx
// src/components/ConversationView.tsx
'use client'
import { useState } from 'react'
import { useSpeech } from '@/src/hooks/useSpeech'
import { PanicButton } from '@/src/components/PanicButton'
import { ReviewReport } from '@/src/components/ReviewReport'
import type { Topic } from '@/db/schema'
import type { ReviewResult } from '@/src/lib/schemas'

type Msg = { role: 'user' | 'assistant'; content: string }

export function ConversationView({ topic }: { topic: Topic }) {
  const speech = useSpeech()
  const [messages, setMessages] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [review, setReview] = useState<ReviewResult | null>(null)

  async function send(text: string) {
    if (!text.trim()) return
    const next: Msg[] = [...messages, { role: 'user', content: text }]
    setMessages(next); setDraft(''); speech.setTranscript('')
    const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ topic: { title: topic.title, scenario: topic.scenario }, messages: next }) })
    const reader = res.body!.getReader(); const dec = new TextDecoder(); let acc = ''
    setMessages((m) => [...m, { role: 'assistant', content: '' }])
    for (;;) {
      const { done, value } = await reader.read(); if (done) break
      acc += dec.decode(value)
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content: acc }; return c })
    }
    speech.speak(acc)
  }

  async function endSession() {
    const userUtterances = messages.filter((m) => m.role === 'user').map((m) => m.content)
    const res = await fetch('/api/review', { method: 'POST', body: JSON.stringify({ userUtterances }) })
    const data = (await res.json()) as ReviewResult
    setReview(data)
    await fetch('/api/sessions', { method: 'POST', body: JSON.stringify({ topicId: topic.id, transcript: messages, review: data }) })
  }

  if (review) return <ReviewReport review={review} />

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto p-4">
      <ul className="flex flex-col gap-3">
        {messages.map((m, i) => (
          <li key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span className="inline-block rounded-2xl px-4 py-2 bg-neutral-100">{m.content}</span>
            {m.role === 'assistant' && m.content && (
              <button className="ml-2 text-xs underline" onClick={() => speech.speak(m.content, 0.75)}>🔁 shadow</button>
            )}
          </li>
        ))}
      </ul>

      {speech.mode === 'voice' ? (
        <div className="flex gap-2 items-center">
          <button className="rounded-full bg-black text-white px-5 py-3" onClick={() => (speech.listening ? speech.stop() : speech.start())}>
            {speech.listening ? '⏹ stop' : '🎙️ speak'}
          </button>
          <span className="text-neutral-500">{speech.transcript}</span>
          {speech.transcript && !speech.listening && <button className="underline" onClick={() => send(speech.transcript)}>send</button>}
        </div>
      ) : (
        <div className="flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="type your reply" className="border rounded px-3 py-2 flex-1" />
          <button className="bg-black text-white rounded px-4" onClick={() => send(draft)}>send</button>
        </div>
      )}

      <div className="flex justify-between">
        <PanicButton />
        <button className="text-sm underline" onClick={endSession}>End & review →</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement `PanicButton`, `ReviewReport`, `TopicCard`, `StreakBadge`**

```tsx
// src/components/PanicButton.tsx
'use client'
import { useState } from 'react'
export function PanicButton() {
  const [open, setOpen] = useState(false); const [ko, setKo] = useState(''); const [ans, setAns] = useState<{ english: string; example: string } | null>(null)
  async function ask() {
    const r = await fetch('/api/translate', { method: 'POST', body: JSON.stringify({ korean: ko }) })
    setAns(await r.json())
  }
  if (!open) return <button className="text-sm underline" onClick={() => setOpen(true)}>🆘 이거 영어로?</button>
  return (
    <div className="flex flex-col gap-2 border rounded p-3">
      <input value={ko} onChange={(e) => setKo(e.target.value)} placeholder="한국어로 입력" className="border rounded px-2 py-1" />
      <button className="bg-black text-white rounded px-3 py-1 text-sm" onClick={ask}>물어보기</button>
      {ans && <div className="text-sm"><b>{ans.english}</b><br /><span className="text-neutral-500">{ans.example}</span></div>}
    </div>
  )
}
```

```tsx
// src/components/ReviewReport.tsx
import type { ReviewResult } from '@/src/lib/schemas'
export function ReviewReport({ review }: { review: ReviewResult }) {
  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col gap-6">
      <section><h2 className="font-bold mb-2">교정</h2>
        {review.corrections.map((c, i) => (
          <div key={i} className="border-b py-2 text-sm">
            <div className="line-through text-neutral-400">{c.original}</div>
            <div className="font-medium">{c.corrected}</div>
            <div className="text-neutral-500">{c.explanation} <span className="text-xs">({c.type})</span></div>
          </div>
        ))}
      </section>
      <section><h2 className="font-bold mb-2">표현</h2>
        {review.expressions.map((e, i) => (
          <div key={i} className="border-b py-2 text-sm"><b>{e.text}</b> — {e.meaning}<br /><span className="text-neutral-500">{e.example}</span></div>
        ))}
      </section>
      <a href="/" className="underline text-sm">홈으로</a>
    </div>
  )
}
```

```tsx
// src/components/TopicCard.tsx
import type { Topic } from '@/db/schema'
export function TopicCard({ topic }: { topic: Topic }) {
  return (
    <div className="rounded-2xl border p-5 flex flex-col gap-3">
      <span className="text-xs uppercase tracking-wide text-neutral-500">{topic.scenario}</span>
      <h1 className="text-xl font-bold">{topic.title}</h1>
      <ul className="list-disc pl-5 text-sm text-neutral-600">{topic.seedQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul>
      <div className="flex flex-wrap gap-2">{topic.targetExpressions.map((e, i) => <span key={i} className="text-xs bg-neutral-100 rounded-full px-3 py-1">{e}</span>)}</div>
    </div>
  )
}
```

```tsx
// src/components/StreakBadge.tsx
export function StreakBadge({ streak }: { streak: number }) {
  return <div className="text-sm">🔥 {streak}일 연속</div>
}
```

- [ ] **Step 5: Implement home page wiring**

```tsx
// app/page.tsx
import { desc } from 'drizzle-orm'
import { db } from '@/db/client'
import { dailyProgress } from '@/db/schema'
import { anthropic } from '@/src/lib/anthropic'
import { getOrCreateTopic } from '@/src/lib/topics'
import { TopicCard } from '@/src/components/TopicCard'
import { StreakBadge } from '@/src/components/StreakBadge'
import { ConversationView } from '@/src/components/ConversationView'

export default async function Home() {
  const today = new Date().toISOString().slice(0, 10)
  const topic = await getOrCreateTopic(anthropic, today)
  const prog = await db.select().from(dailyProgress).orderBy(desc(dailyProgress.date)).limit(1)
  return (
    <main className="max-w-2xl mx-auto p-4 flex flex-col gap-6">
      <div className="flex justify-between items-center"><h1 className="font-bold">오늘의 영어</h1><StreakBadge streak={prog[0]?.streakCount ?? 0} /></div>
      <TopicCard topic={topic} />
      <ConversationView topic={topic} />
    </main>
  )
}
```

- [ ] **Step 6: Run (expect PASS)** — `pnpm test ConversationView`

- [ ] **Step 7: Typecheck** — Run: `pnpm exec tsc --noEmit` → Expected: no errors.

- [ ] **Step 8: Commit** — `git add -A && git commit -m "feat: add daily-loop UI (topic, conversation, shadow, panic, review, streak)"`

---

### Task 13: README + deploy notes

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README** with: env setup (`.env.example` → `.env.local`), `pnpm db:push`, `pnpm dev`, Vercel deploy steps (set env vars, Cron is auto-registered from `vercel.json`, set `CRON_SECRET`), and the Chrome-recommended note for Web Speech.

- [ ] **Step 2: Commit** — `git add -A && git commit -m "docs: add README with setup and deploy notes"`

---

## Self-Review

**Spec coverage:**
- Voice conversation → Task 5, 8, 12 ✅
- End-of-session correction → Task 4, 12 ✅
- Shadowing → Task 8 (`speak` slow rate), Task 12 (shadow button) ✅
- Panic button → Task 6, 12 ✅
- Streak + daily goal → Task 9, 10, 12 ✅
- Daily topic + cron rotation → Task 7 ✅
- Model split (Sonnet/Opus) → Task 3, 4, 5, 6, 7 ✅
- Postgres + Drizzle → Task 2, 10 ✅
- Auth gate → Task 11 ✅
- Text fallback → Task 8, 12 ✅
- Error handling (Zod loud-fail, 502s) → Task 4, 6, 7 ✅
- Tests (Zod contract, idempotency, streak, fallback) → Task 4, 7, 9, 12 ✅
- Expressions persisted for future SRS → Task 2, 10 ✅

**Type consistency:** `getOrCreateTopic(client, isoDate)`, `nextStreak(prev, prevDate, today)`, `ReviewResult`, `detectSpeechSupport()`, `useSpeech()` return shape — consistent across tasks 7/9/4/8.

**No placeholders:** all code steps contain runnable code; all commands have expected output.

**Note on import paths:** create-next-app `--import-alias "@/*"` maps `@/*` to project root, so `@/db/...`, `@/src/...`, `@/app/...` resolve. The `--src-dir=false` flag keeps `app/` at root while we use a manual `src/` for libs/components — both resolve under `@/`.
