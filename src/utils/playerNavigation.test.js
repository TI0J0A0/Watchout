import test from 'node:test'
import assert from 'node:assert/strict'
import { getNextAiredEpisode, shouldShowNextEpisodeButton } from './playerNavigation.js'

test('getNextAiredEpisode returns the next released episode after the active one', () => {
  assert.equal(getNextAiredEpisode(2, [1, 2, 3, 5]), 3)
  assert.equal(getNextAiredEpisode(3, [1, 2, 3, 5]), 5)
})

test('getNextAiredEpisode returns null when there is no next released episode', () => {
  assert.equal(getNextAiredEpisode(5, [1, 2, 3, 5]), null)
  assert.equal(getNextAiredEpisode(null, [1, 2, 3]), null)
})

test('shouldShowNextEpisodeButton appears near the end only when a next episode exists', () => {
  assert.equal(shouldShowNextEpisodeButton({ progressRatio: 0.91, nextEpisode: 4 }), true)
  assert.equal(shouldShowNextEpisodeButton({ progressRatio: 0.89, nextEpisode: 4 }), false)
  assert.equal(shouldShowNextEpisodeButton({ progressRatio: 0.95, nextEpisode: null }), false)
})
