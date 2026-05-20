export function createCachedJsonFetcher({
  ttlMs = 5 * 60 * 1000,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
} = {}) {
  const cache = new Map()
  const inFlight = new Map()

  return async function cachedJson(url, options) {
    const key = `${url}|${options?.method ?? 'GET'}|${options?.body ?? ''}`
    const cached = cache.get(key)
    if (cached && cached.expiresAt > now()) return cached.value
    if (inFlight.has(key)) return inFlight.get(key)

    const promise = Promise.resolve(fetchImpl(url, options))
      .then(async res => {
        if (!res?.ok) throw new Error(`Request failed ${res?.status ?? ''}`.trim())
        const value = await res.json()
        cache.set(key, { value, expiresAt: now() + ttlMs })
        return value
      })
      .finally(() => inFlight.delete(key))

    inFlight.set(key, promise)
    return promise
  }
}
