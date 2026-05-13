import test from 'node:test'
import assert from 'node:assert/strict'
import { ARCHIVE_YEARS, GENRES, getGenreById, getDefaultArchiveYear } from './browse.js'

test('GENRES exposes named genre ids for navigation', () => {
  assert.equal(getGenreById(8).name, 'Drama')
  assert.equal(getGenreById(4).name, 'Comedy')
  assert.equal(GENRES.some(g => g.name === 'Romance'), true)
})

test('getGenreById falls back to the first genre for unknown ids', () => {
  assert.equal(getGenreById(999), GENRES[0])
})

test('ARCHIVE_YEARS starts with the current year', () => {
  const current = new Date().getFullYear()
  assert.equal(ARCHIVE_YEARS[0], current)
  assert.equal(getDefaultArchiveYear(), current)
})
