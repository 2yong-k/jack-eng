export function StreakBadge({ streak }: { streak: number }) {
  if (streak <= 0) {
    return (
      <span className="text-muted bg-surface-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm">
        아직 시작 전
      </span>
    )
  }
  return (
    <span
      className="bg-accent-soft text-accent inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
      aria-label={`${streak}일 연속 학습 중`}
    >
      <span aria-hidden="true">🔥</span>
      <span className="tabular-nums">{streak}</span>일 연속
    </span>
  )
}
