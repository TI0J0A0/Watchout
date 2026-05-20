import assert from 'node:assert/strict'
import test from 'node:test'
import { createCachedJsonFetcher } from './apiCache.js'

test('createCachedJsonFetcher dedupes in-flight requests for the same key', async () => {
  let calls = 0
  const fetcher = createCachedJsonFetcher({
    ttlMs: 1000,
    fetchImpl: async () => {
      calls += 1
      return { ok: true, json: async () => ({ calls }) }
    },
  })

  const [first, second] = await Promise.all([
    fetcher('/anime/1'),
    fetcher('/anime/1'),
  ])

  assert.deepEqual(first, { calls: 1 })
  assert.deepEqual(second, { calls: 1 })
  assert.equal(calls, 1)
})

test('createCachedJsonFetcher uses ttl cache then refetches after expiry', async () => {
  let now = 100
  let calls = 0
  const fetcher = createCachedJsonFetcher({
    ttlMs: 10,
    now: () => now,
    fetchImpl: async () => {
      calls += 1
      return { ok: true, json: async () => ({ calls }) }
    },
  })

  assert.deepEqual(await fetcher('/top'), { calls: 1 })
  now = 105
  assert.deepEqual(await fetcher('/top'), { calls: 1 })
  now = 120
  assert.deepEqual(await fetcher('/top'), { calls: 2 })
})

test('createCachedJsonFetcher throws on failed response without caching failure', async () => {
  let calls = 0
  const fetcher = createCachedJsonFetcher({
    fetchImpl: async () => {
      calls += 1
      return calls === 1
        ? { ok: false, status: 500, json: async () => ({}) }
        : { ok: true, json: async () => ({ ok: true }) }
    },
  })

  await assert.rejects(() => fetcher('/bad'), /Request failed/)
  assert.deepEqual(await fetcher('/bad'), { ok: true })
  assert.equal(calls, 2)
})
