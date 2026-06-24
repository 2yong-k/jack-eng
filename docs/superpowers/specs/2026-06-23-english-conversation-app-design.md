# Daily English Conversation + Correction App — Design Spec

**Date:** 2026-06-23
**Status:** Approved (pending final spec review)
**Owner:** Jack (single user)

## 1. Purpose

A personal, daily-use web app that builds English **listening and speaking** fluency for
a blockchain CTO who must free-talk with foreigners about investment and projects. The app
targets the user's specific weaknesses:

- Korean→English mental translation latency (slow, word-by-word assembly).
- Weak listening and weak spontaneous speaking.
- Limited domain vocabulary.

**Goal (realistic):** functional business fluency in 6–12 months of daily practice, NOT
"native level" (a multi-year goal). The app optimizes for **daily consistency over intensity**.

## 2. Scope

### In scope (MVP)
- Voice-first conversation with Claude on a daily, domain-relevant topic.
- End-of-session correction report (errors + more natural phrasings + key expressions).
- Shadowing button on Claude's spoken replies.
- "How do I say this in English?" panic button (Korean → English chunk, mid-conversation).
- Streak + daily goal (consistency driver).
- Daily auto-generated topic via scheduled job, rotating across real scenarios
  (investor pitch / negotiation / technical explanation / casual networking).

### Out of scope (deferred to later pillars)
- **Light SRS flashcards** (pillar B) — corrections still persist expressions to DB so this
  can grow later, but no review UI in MVP.
- **Precise pronunciation scoring / phoneme analysis** (pillar D) — impossible with the
  browser Web Speech API; requires Whisper. Adding a fake score now would be a lie.
- **Video recommendations** (separate pillar) — not in this spec.
- **Multi-user / accounts** — single user only.

## 3. Key Decisions (locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Interaction | Voice-first | Directly trains ears + mouth (the stated weakness). |
| Correction timing | **(A) End-of-session report only** | Keeps conversation flowing; matches immersion learning. A mid-conversation "explain this" button covers the rare need for instant help. |
| Hosting | Cloud (Vercel) + user's own Anthropic API key | Accessible from phone/laptop abroad; daily cron requires an always-on backend. |
| Stack | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 (plain components; shadcn considered, not adopted) | One repo for front + back; Vercel Cron for daily content. |
| Speech | Browser Web Speech API (STT + TTS) | Zero extra cost, instant. Quality varies (Chrome-optimal); acceptable for MVP, swappable later. |
| DB | Postgres (Supabase or Neon) + Drizzle ORM | Standard, typed, serverless-friendly. |
| Auth | Minimal passphrase gate / Vercel password protection | Single user; no account system needed. |

## 4. Model Strategy (cost-aware — this app runs daily)

- **Conversation turns → Claude Sonnet 4.6** (`claude-sonnet-4-6`): fast, cheap, a good
  conversational partner. This is the high-frequency path.
- **Correction report → Claude Opus 4.8** (`claude-opus-4-8`): deeper analysis, run once
  per session.
- **Panic-button translation → Sonnet 4.6**: low-latency single-shot.
- **Daily topic generation → Sonnet 4.6** (cron, once/day).

## 5. The Daily Loop (the product)

1. Open app → **Today's Topic Card** (auto-generated; title, 3 seed questions, 5 target
   expressions, scenario tag).
2. Tap 🎙️ → speak → Web Speech STT → transcript turn → `POST /api/chat` (streamed).
3. Claude replies → **TTS speaks it** + text shown → turn-by-turn dialogue, staying on topic
   with natural follow-up questions.
   - 🔁 **Shadow** button on each Claude reply: replay (optionally slower) + user repeats.
   - 🆘 **Panic** button anytime: ask in Korean "how do I say X?" → instant English chunk,
     auto-saved as an expression, does NOT pollute the main transcript.
4. End session → `POST /api/review` → structured correction report:
   - errors (grammar / word choice) with corrected form + short explanation,
   - more natural/native phrasings,
   - 5 key expressions to keep.
5. Persist session + corrections + expressions. Update streak.

## 6. Architecture

### Frontend (Next.js App Router)
- `app/page.tsx` — home: today's topic card + streak + "start" CTA.
- `TopicCard` — topic display (title, scenario, seed questions, target expressions).
- `ConversationView` — turn list, mic button, live STT transcript, per-reply shadow button,
  panic button.
- `useSpeech` hook — wraps Web Speech `SpeechRecognition` + `SpeechSynthesis`; owns
  permission handling, browser-support detection, and the text-input fallback toggle.
- `ReviewReport` — post-session corrections + expressions, with one-tap "save expression".
- `HistoryList` — past sessions (date, topic, # corrections).
- `StreakBadge` — current streak + today's goal state.

### Backend (Route Handlers / Server Actions)
- `POST /api/chat` — streams a conversation turn (Sonnet). System prompt: domain-aware
  partner, stays on topic, asks one natural follow-up, keeps replies short/spoken-style.
- `POST /api/review` — takes full user-utterance transcript, returns **structured JSON**
  (validated by Zod / Anthropic tool-use) for corrections + expressions (Opus).
- `POST /api/translate` — panic button: Korean phrase → English chunk + 1 example (Sonnet).
- `GET /api/topics/today` — returns today's topic (generates lazily if cron missed).
- `GET /api/cron/daily-topic` — Vercel Cron (daily): generate next day's topic, **idempotent**
  (skip if a topic for that date already exists).

### Data (Postgres + Drizzle)
- `topics` — `id, date (unique), scenario, title, seed_questions jsonb, target_expressions jsonb, created_at`
- `sessions` — `id, topic_id, started_at, ended_at, transcript jsonb`
- `corrections` — `id, session_id, original, corrected, explanation, type`
- `expressions` — `id, text, meaning, example, source_session_id, created_at` (feeds future SRS)
- `daily_progress` — `date (unique), completed bool, streak_count` (or derive streak from sessions)

## 7. Data Flow

```
mic ──STT──> transcript turn ──POST /api/chat (stream)──> render + TTS ──┐
   ^                                                                      │
   └──────────────────── turn-by-turn loop ─────────────────────────────┘
end session ──POST /api/review (Opus, structured)──> corrections + expressions ──> persist + update streak
panic ──POST /api/translate──> English chunk ──> save expression (side channel, not in transcript)
cron (daily) ──generate topic (idempotent)──> topics table
```

## 8. Error Handling & Degradation

- **STT unsupported / permission denied** → graceful fallback to a **text input box**
  (`useSpeech` detects support and exposes `mode: 'voice' | 'text'`). The app must remain
  fully usable without speech.
- **TTS unavailable** → render text only; shadow button disabled with a tooltip.
- **Chat/review API failure** → retry with backoff; the in-progress transcript is held in
  local state and never lost; show a non-blocking error.
- **Cron miss** → `GET /api/topics/today` generates lazily so the user is never blocked.
- **Network loss mid-session** → keep local transcript; persist on reconnect / session end.

## 9. Testing (contracts & boundaries only)

- `/api/review` structured output: **Zod schema contract test** — malformed model output
  must fail loudly, not silently produce a broken report.
- `/api/translate` response shape contract test.
- `useSpeech` support-detection + fallback branch (voice→text) unit test.
- Daily-topic cron **idempotency** test (no duplicate topic for the same date).
- Streak calculation boundary test (consecutive days, gap resets, same-day double session).

## 10. Roadmap Beyond MVP (informs data model now, not built now)

1. **Pillar B — SRS review queue** over the `expressions` already being persisted.
2. **Pillar D — Pronunciation scoring** via Whisper (replaces browser STT on an opt-in path).
3. **Video recommendations** pillar (daily curated, shadowing source).
4. Difficulty adaptation: tune conversation complexity from accumulated correction history.

## 11. Open Questions / Assumptions

- Assumes Chrome (desktop or Android) as primary client for best Web Speech support; iOS
  Safari support is partial — text fallback covers it.
- Assumes Supabase free tier is sufficient for single-user volume (it is, by a wide margin).
- API cost assumption: a single user's daily usage on Sonnet + one Opus review/day is a few
  dollars/month at most.

## 12. Post-MVP hardening pass (2026-06-25)

Applied after a multi-dimensional audit (58 confirmed findings). Highlights:

- **Correctness:** day boundaries computed in **KST** (`src/lib/datetime.ts`), fixing a
  UTC off-by-one in streak/topic/`daily_progress`. Client `send`/`endSession` now have full
  error handling (`res.ok`, try/catch, optimistic-turn rollback, empty-transcript guard);
  `useSpeech` handles `onerror`/cleanup/abort and cancels TTS on unmount; `TextDecoder` uses
  `{ stream: true }`.
- **Security:** all request bodies Zod-validated (400); auth cookie holds a derived SHA-256
  token (not the passphrase) with constant-time compare (Web Crypto, Edge-safe); cron secret
  compared constant-time with empty-secret guard; per-instance rate limiting on LLM routes;
  CSP + security headers in `next.config.ts`; route handlers wrapped in try/catch (typed
  errors, no `issues` leak in prod).
- **Data:** `scenario`/`correction_type` are `pgEnum` (DB-level domain), sharing `SCENARIOS`/
  `CORRECTION_TYPES` with the Zod layer; `/api/sessions` re-validates the client-returned
  review and writes session+corrections+expressions+progress in a single transaction.
- **UI/UX & a11y:** design-token system (light/dark) replaces hardcoded colors; forms submit
  on Enter with labeled inputs; loading/error/empty states; `aria-live`/`aria-pressed`/skip
  link/focus-visible; distinct user/tutor bubbles; 44px touch targets; streak refresh via
  `router.refresh()`.
