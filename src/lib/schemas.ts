import { z } from 'zod'

// Fixed value domains — single source of truth, reused by Zod, the DB pgEnums
// (db/schema.ts), and the Anthropic tool schemas.
export const SCENARIOS = ['pitch', 'negotiation', 'technical', 'networking'] as const
export const CORRECTION_TYPES = ['grammar', 'word-choice', 'naturalness'] as const

// ─── LLM output (tool_use) schemas — validated with safeParse → 502 ───────────

export const ReviewSchema = z.object({
  corrections: z.array(
    z.object({
      original: z.string(),
      corrected: z.string(),
      explanation: z.string(),
      type: z.enum(CORRECTION_TYPES),
    }),
  ),
  expressions: z.array(
    z.object({
      text: z.string(),
      meaning: z.string(),
      example: z.string(),
    }),
  ),
})
export type ReviewResult = z.infer<typeof ReviewSchema>

export const TranslateSchema = z.object({
  english: z.string(),
  example: z.string(),
})
export type TranslateResult = z.infer<typeof TranslateSchema>

export const TopicSchema = z.object({
  scenario: z.enum(SCENARIOS),
  title: z.string(),
  seedQuestions: z.array(z.string()).min(3),
  targetExpressions: z.array(z.string()).min(5),
})
export type TopicResult = z.infer<typeof TopicSchema>

// ─── Request-body schemas — validated with safeParse → 400 ────────────────────
// Bounds cap LLM token cost and DB write size; never trust the client.

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(4000),
})
export type Message = z.infer<typeof MessageSchema>

export const ChatRequestSchema = z.object({
  topic: z.object({ title: z.string().max(300), scenario: z.string().max(40) }),
  messages: z.array(MessageSchema).min(1).max(100),
})

export const ReviewRequestSchema = z.object({
  userUtterances: z.array(z.string().max(2000)).min(1).max(100),
})

export const TranslateRequestSchema = z.object({
  korean: z.string().min(1).max(500),
})

export const SessionRequestSchema = z.object({
  topicId: z.string().uuid(),
  transcript: z.array(MessageSchema).max(400),
  review: ReviewSchema,
})

export const LoginRequestSchema = z.object({
  passphrase: z.string().min(1).max(500),
})
