# jack-eng-talking

A personal, voice-first daily English conversation app for a Korean blockchain CTO.
Talk with Claude on a domain-relevant topic, get an end-of-session correction report,
shadow Claude's spoken replies, ask "how do I say X" mid-conversation, and keep a daily streak.

See the design and plan under `docs/superpowers/`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Drizzle ORM + Postgres ·
`@anthropic-ai/sdk` (Sonnet 5.5 for chat/translate/topic, Opus 5.5 for review) ·
browser Web Speech API (STT/TTS) · Vitest. Package manager: pnpm.

## Local setup

1. Install dependencies (uses pnpm):

   ```bash
   pnpm install
   ```

2. Copy env and fill values:

   ```bash
   cp .env.example .env.local
   ```

   - `ANTHROPIC_API_KEY` — your Anthropic API key.
   - `DATABASE_URL` — a Postgres connection string (Supabase or Neon free tier is plenty).
   - `APP_PASSPHRASE` — the secret you type on `/login` to access the app.
   - `CRON_SECRET` — bearer secret the daily-topic cron must send.

3. Push the schema to your database:

   ```bash
   pnpm db:push
   ```

4. Run the dev server:

   ```bash
   pnpm dev
   ```

   Open http://localhost:3000, enter your passphrase, and start talking.

## Tests

```bash
pnpm test       # vitest run (contracts + boundaries)
pnpm typecheck  # tsc --noEmit
```

## Deploy (Vercel)

1. Import the repo into Vercel.
2. Set env vars: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `APP_PASSPHRASE`, `CRON_SECRET`.
3. The daily-topic cron is registered automatically from `vercel.json`
   (runs `/api/cron/daily-topic` at 18:00 UTC). The route checks
   `Authorization: Bearer $CRON_SECRET`.
4. Run `pnpm db:push` against the production `DATABASE_URL` once.

## Notes

- **Browser support:** Web Speech (STT/TTS) is best on Chrome (desktop / Android). On
  browsers without speech support the app falls back to a text input — fully usable, just
  without voice. iOS Safari support is partial.
- **Cost / abuse:** single-user daily usage is a few dollars/month at most (Sonnet for chat,
  one Opus review per session). LLM routes are rate-limited (best-effort, per instance) and
  all request bodies are Zod-validated to cap token cost.
- **Day boundary:** "today" is computed in KST (`src/lib/datetime.ts`), so the daily topic and
  streak roll over at local midnight, not UTC.
- **Security:** passphrase gate via middleware; the auth cookie stores a derived SHA-256 token
  (not the passphrase). Security headers + CSP are set in `next.config.ts`.
- **Roadmap (not built yet):** SRS flashcards over saved expressions, Whisper-based
  pronunciation scoring, daily curated video recommendations.
