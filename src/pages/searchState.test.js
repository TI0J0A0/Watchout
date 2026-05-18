import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addRecentSearchResult,
  normalizeRecentSearchResults,
} from './searchState.js'

test('addRecentSearchResult keeps unique recent results with newest first', () => {
  const current = [{ id: 1, title: 'Alpha', img: 'a.jpg' }]
  const next = addRecentSearchResult(current, { id: 2, title: 'Beta', img: 'b.jpg' })
  const moved = addRecentSearchResult(next, { id: 1, title: 'Alpha', img: 'a2.jpg' })

  assert.deepEqual(next.map(item => item.id), [2, 1])
  assert.deepEqual(moved.map(item => item.id), [1, 2])
  assert.equal(moved[0].img, 'a2.jpg')
})

test('normalizeRecentSearchResults drops invalid items and limits the list', () => {
  const items = Array.from({ length: 10 }, (_, index) => ({ id: index + 1, title: `Anime ${index + 1}` }))
  const normalized = normalizeRecentSearchResults([{ id: null, title: '' }, ...items], 6)

  assert.equal(normalized.length, 6)
  assert.deepEqual(normalized.map(item => item.id), [1, 2, 3, 4, 5, 6])
})
