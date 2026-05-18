export function shouldTreatPointerAsTap(start, end, threshold = 10) {
  if (!start || !end) return true

  return Math.abs(end.x - start.x) <= threshold && Math.abs(end.y - start.y) <= threshold
}
