export function createMetricDedupe({ windowMs = 5000, now = () => Date.now() } = {}) {
  const sentAt = new Map()
  return {
    shouldSend(key) {
      const previous = sentAt.get(key)
      const current = now()
      if (previous && current - previous < windowMs) return false
      sentAt.set(key, current)
      return true
    },
  }
}
