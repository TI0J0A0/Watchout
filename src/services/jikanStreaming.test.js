import assert from 'node:assert/strict'
import test from 'node:test'
import { mapAnime } from './jikan.js'

test('mapAnime keeps main Brazil and US streaming provider names and urls from Jikan full responses', () => {
  const item = mapAnime({
    mal_id: 1,
    title: 'Cowboy Bebop',
    images: { jpg: { image_url: 'poster.jpg' } },
    genres: [],
    studios: [],
    streaming: [
      { name: 'Crunchyroll', url: 'http://www.crunchyroll.com/series-271225' },
      { name: 'Netflix', url: 'https://www.netflix.com/title/80001305' },
      { name: 'Amazon Prime Video', url: 'https://www.primevideo.com/detail/0ABC' },
      { name: 'D Anime Store', url: 'https://anime.dmkt-sp.jp/animestore/ci_pc' },
    ],
  })

  assert.deepEqual(item.streaming, [
    { name: 'Crunchyroll', url: 'http://www.crunchyroll.com/series-271225' },
    { name: 'Netflix', url: 'https://www.netflix.com/title/80001305' },
    { name: 'Prime Video', url: 'https://www.primevideo.com/detail/0ABC' },
  ])
})

test('mapAnime drops invalid and non-mainstream provider entries', () => {
  const item = mapAnime({
    mal_id: 2,
    title: 'Sample',
    images: { jpg: { image_url: 'poster.jpg' } },
    genres: [],
    studios: [],
    streaming: [
      { name: 'Prime Video', url: '' },
      { name: '', url: 'https://example.com' },
      { name: 'Bilibili Global', url: 'https://www.bilibili.tv/' },
      null,
    ],
  })

  assert.deepEqual(item.streaming, [
    { name: 'Prime Video', url: '' },
  ])
})
