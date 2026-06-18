import assert from 'node:assert/strict'
import test from 'node:test'
import {
  airingDayKey,
  secondsUntil,
  hasAired,
  countdownParts,
  compareAiring,
} from './airingTime.js'

// A fixed reference instant: 2026-06-18T12:00:00Z (a Thursday in UTC).
const NOW = Date.UTC(2026, 5, 18, 12, 0, 0)
const nowSec = Math.floor(NOW / 1000)

test('airingDayKey returns a valid weekday key or null', () => {
  assert.equal(airingDayKey(null), null)
  const key = airingDayKey(nowSec)
  assert.ok(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].includes(key))
})

test('secondsUntil is positive for future, negative for past', () => {
  assert.equal(secondsUntil(null, NOW), null)
  assert.equal(secondsUntil(nowSec + 3600, NOW), 3600)
  assert.equal(secondsUntil(nowSec - 60, NOW), -60)
})

test('hasAired flips at the airing instant', () => {
  assert.equal(hasAired(nowSec - 1, NOW), true)
  assert.equal(hasAired(nowSec + 1, NOW), false)
  assert.equal(hasAired(null, NOW), false)
})

test('countdownParts buckets the time difference', () => {
  assert.equal(countdownParts(null, NOW), null)
  assert.deepEqual(countdownParts(nowSec - 10, NOW), { state: 'aired' })
  assert.deepEqual(countdownParts(nowSec + 600, NOW), { state: 'min', m: 10 })
  assert.deepEqual(countdownParts(nowSec + 3 * 3600 + 24 * 60, NOW), { state: 'hours', h: 3, m: 24 })
  assert.deepEqual(countdownParts(nowSec + 2 * 24 * 3600, NOW), { state: 'days', d: 2 })
})

test('compareAiring sorts timed first, then untimed alphabetically', () => {
  const items = [
    { title: 'Zeta', airingAt: null },
    { title: 'Beta', airingAt: nowSec + 7200 },
    { title: 'Alpha', airingAt: null },
    { title: 'Gamma', airingAt: nowSec + 3600 },
  ]
  const sorted = [...items].sort(compareAiring).map(i => i.title)
  assert.deepEqual(sorted, ['Gamma', 'Beta', 'Alpha', 'Zeta'])
})
