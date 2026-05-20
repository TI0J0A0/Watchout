import assert from 'node:assert/strict'
import test from 'node:test'
import { createMetricDedupe } from './metricsThrottle.js'

test('createMetricDedupe blocks duplicate event keys inside a time window', () => {
  let now = 1000
  const dedupe = createMetricDedupe({ windowMs: 5000, now: () => now })

  assert.equal(dedupe.shouldSend('player_buffering:1:2'), true)
  assert.equal(dedupe.shouldSend('player_buffering:1:2'), false)
  now = 7001
  assert.equal(dedupe.shouldSend('player_buffering:1:2'), true)
})
