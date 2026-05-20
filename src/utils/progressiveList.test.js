import assert from 'node:assert/strict'
import test from 'node:test'
import { getProgressiveLimit } from './progressiveList.js'

test('getProgressiveLimit grows in batches until it reaches total', () => {
  assert.equal(getProgressiveLimit({ current: 0, total: 100, initial: 24, step: 24 }), 24)
  assert.equal(getProgressiveLimit({ current: 24, total: 100, initial: 24, step: 24 }), 48)
  assert.equal(getProgressiveLimit({ current: 96, total: 100, initial: 24, step: 24 }), 100)
})
