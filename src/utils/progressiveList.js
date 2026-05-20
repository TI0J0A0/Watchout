export function getProgressiveLimit({ current, total, initial = 24, step = 24 }) {
  if (total <= 0) return 0
  const next = current > 0 ? current + step : initial
  return Math.min(total, next)
}
