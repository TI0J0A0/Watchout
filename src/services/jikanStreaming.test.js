import assert from 'node:assert/strict'
import test from 'node:test'
import { mapAnime } from './jikan.js'

test('mapAnime keeps streaming provider names and urls from Jikan full responses', () => {
  const item = mapAnime({
    mal_id: 1,
    title: 'Cowboy Bebop',
    images: { jpg: { image_url: 'poster.jpg' } },
    genres: [],
    studios: [],
    streaming: [
      { name: 'Crunchyroll', url: 'http://www.crunchyroll.com/series-271225' },
      { name: 'Netflix', url: 'https://www.netflix.com/title/80001305' },
      { name: 'Tubi TV', url: 'https://tubitv.com/series/2052/cowboy-bebop-subtitled' },
    ],
  })

  assert.deepEqual(item.streaming, [
    { name: 'Crunchyroll', url: 'http://www.crunchyroll.com/series-271225' },
    { name: 'Netflix', url: 'https://www.netflix.com/title/80001305' },
    { name: 'Tubi TV', url: 'https://tubitv.com/series/2052/cowboy-bebop-subtitled' },
  ])
})

test('mapAnime drops invalid streaming entries without filtering unknown providers', () => {
  const item = mapAnime({
    mal_id: 2,
    title: 'Sample',
    images: { jpg: { image_url: 'poster.jpg' } },
    genres: [],
    studios: [],
    streaming: [
      { name: 'Prime Video', url: '' },
      { name: '', url: 'https://example.com' },
      null,
    ],
  })

  assert.deepEqual(item.streaming, [
    { name: 'Prime Video', url: '' },
  ])
})
