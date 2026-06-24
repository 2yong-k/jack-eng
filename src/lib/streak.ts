export function nextStreak(prev: number, prevDate: string | null, today: string): number {
  if (!prevDate) return 1
  if (prevDate === today) return prev
  const diff = (Date.parse(today) - Date.parse(prevDate)) / 86_400_000
  return diff === 1 ? prev + 1 : 1
}

/**
 * Streak to DISPLAY on read, given the last recorded day. The persisted value
 * only decays when a new session saves; this re-applies the day math so the
 * badge never over-reports a streak the user has already broken.
 */
export function displayStreak(streakCount: number, lastDate: string | null, today: string): number {
  if (!lastDate) return 0
  if (lastDate === today) return streakCount
  const diff = (Date.parse(today) - Date.parse(lastDate)) / 86_400_000
  return diff === 1 ? streakCount : 0 // still live only if last practice was yesterday
}
