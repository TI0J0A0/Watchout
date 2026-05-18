import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldTreatPointerAsTap } from './mobileInteraction.js'

test('shouldTreatPointerAsTap allows small finger movement', () => {
  assert.equal(shouldTreatPointerAsTap({ x: 10, y: 10 }, { x: 15, y: 14 }), true)
})

test('shouldTreatPointerAsTap rejects horizontal shelf drag movement', () => {
  assert.equal(shouldTreatPointerAsTap({ x: 10, y: 10 }, { x: 28, y: 12 }), false)
})
