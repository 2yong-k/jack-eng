export function nextStreak(prev: number, prevDate: string | null, today: string): number {
  if (!prevDate) return 1
  if (prevDate === today) return prev
  const diff = (Date.parse(today) - Date.parse(prevDate)) / 86_400_000
  return diff === 1 ? prev + 1 : 1
}
