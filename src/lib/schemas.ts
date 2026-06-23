import { z } from 'zod'

export const ReviewSchema = z.object({
  corrections: z.array(
    z.object({
      original: z.string(),
      corrected: z.string(),
      explanation: z.string(),
      type: z.enum(['grammar', 'word-choice', 'naturalness']),
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
  scenario: z.enum(['pitch', 'negotiation', 'technical', 'networking']),
  title: z.string(),
  seedQuestions: z.array(z.string()).min(3),
  targetExpressions: z.array(z.string()).min(5),
})
export type TopicResult = z.infer<typeof TopicSchema>
