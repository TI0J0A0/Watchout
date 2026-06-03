import test from 'node:test'
import assert from 'node:assert/strict'
import {
  NEWS_PAGE_TABS,
  NEWS_PAGE_DEFAULT_TAB,
  annotateNewTrailers,
} from './newsPageState.js'

test('news page defaults to trailers and has no news tab', () => {
  assert.equal(NEWS_PAGE_DEFAULT_TAB, 'trailers')
  assert.deepEqual(NEWS_PAGE_TABS.map(tab => tab.id), ['trailers', 'onair', 'upcoming'])
  assert.equal(NEWS_PAGE_TABS.some(tab => tab.id === 'news'), false)
})

test('never-seen trailers are flagged new and recorded', () => {
  const now = 1_000_000
  const { annotated, nextSeen } = annotateNewTrailers([{ id: 1 }, { id: 2 }], {}, now)
  assert.deepEqual(annotated.map(t => t.isNew), [true, true])
  assert.deepEqual(nextSeen, { 1: now, 2: now })
})

test('trailers seen long ago are no longer new but stay tracked', () => {
  const now = 1_000_000_000
  const old = now - 49 * 60 * 60 * 1000 // 49h ago, past the 48h window
  const { annotated, nextSeen } = annotateNewTrailers([{ id: 7 }], { 7: old }, now)
  assert.equal(annotated[0].isNew, false)
  assert.equal(nextSeen[7], old)
})

test('stale ids not in the current feed are dropped from the seen map', () => {
  const now = 5_000
  const { nextSeen } = annotateNewTrailers([{ id: 1 }], { 1: now, 99: now - 1 }, now)
  assert.deepEqual(nextSeen, { 1: now })
})
