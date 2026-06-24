// The single user is in KST (UTC+9). All "calendar day" logic (today's topic,
// daily streak, daily_progress uniqueness) must use the KST date, NOT the UTC
// date that `new Date().toISOString().slice(0,10)` would give.

const KST = 'Asia/Seoul'

/** YYYY-MM-DD for the given instant in KST. `en-CA` formats as ISO-like. */
export function kstDate(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
}

/** Today's calendar date in KST. */
export function todayKST(): string {
  return kstDate(new Date())
}

/** Tomorrow's calendar date in KST (used by the daily-topic cron). */
export function tomorrowKST(): string {
  return kstDate(new Date(Date.now() + 86_400_000))
}
