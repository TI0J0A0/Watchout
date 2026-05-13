import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getHeroBadge,
  getHeroMeta,
  getHeroCta,
  getHeroFocalPoint,
  getHeroImage,
  getCarouselIndex,
} from './heroCarousel.js'

test('getHeroBadge returns ON AIR for airing titles and TRENDING otherwise', () => {
  assert.equal(getHeroBadge({ airing: true }), 'ON AIR')
  assert.equal(getHeroBadge({ airing: false }), 'TRENDING')
  assert.equal(getHeroBadge(null), 'TRENDING')
})

test('getHeroMeta builds a compact metadata line from available fields', () => {
  const item = {
    rating: 'R - 17+',
    streaming: ['Crunchyroll', 'Netflix'],
    genres: ['Action', 'Romance', 'Fantasy'],
  }

  assert.equal(getHeroMeta(item), '17+ • Crunchyroll | Netflix • Action, Romance')
})

test('getHeroMeta falls back when optional data is missing', () => {
  assert.equal(getHeroMeta({}), '16+ • Sub | Dub • Anime')
})

test('getHeroCta returns Crunchyroll-style primary and secondary actions', () => {
  assert.deepEqual(getHeroCta({ userStatus: null }), {
    primaryLabel: 'Watch Now',
    secondaryLabel: 'Add to List',
    canAdd: true,
  })
  assert.deepEqual(getHeroCta({ userStatus: 'watching' }, s => `status:${s}`), {
    primaryLabel: 'Watch Now',
    secondaryLabel: 'status:watching',
    canAdd: false,
  })
})

test('getHeroImage prefers AniList, then Kitsu, then trailer thumbnail, then poster', () => {
  const item = { img: 'poster.jpg' }

  assert.equal(getHeroImage(item, 'anilist-banner.jpg', 'kitsu-cover.jpg', 'thumb.jpg'), 'anilist-banner.jpg')
  assert.equal(getHeroImage(item, null, 'kitsu-cover.jpg', 'thumb.jpg'), 'kitsu-cover.jpg')
  assert.equal(getHeroImage(item, null, null, 'thumb.jpg'), 'thumb.jpg')
  assert.equal(getHeroImage(item, null, null, null), 'poster.jpg')
})

test('getHeroFocalPoint prefers per-anime focal point and falls back to center-right framing', () => {
  assert.equal(getHeroFocalPoint({ focalPoint: '78% center' }), '78% center')
  assert.equal(getHeroFocalPoint({}), '72% center')
  assert.equal(getHeroFocalPoint(null), '72% center')
})

test('getCarouselIndex wraps previous and next indexes', () => {
  assert.equal(getCarouselIndex(0, 5, -1), 4)
  assert.equal(getCarouselIndex(4, 5, 1), 0)
  assert.equal(getCarouselIndex(2, 5, 1), 3)
  assert.equal(getCarouselIndex(2, 0, 1), 0)
})
