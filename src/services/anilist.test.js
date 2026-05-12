import test from 'node:test'
import assert from 'node:assert/strict'
import { getAnilistHeroImage, getAnilistHeroImages } from './anilist.js'

test('getAnilistHeroImages returns bannerImage and coverImage.extraLarge separately', () => {
  const media = {
    bannerImage: 'https://example.com/banner.jpg',
    coverImage: { extraLarge: 'https://example.com/cover-extra-large.jpg' },
  }

  assert.deepEqual(getAnilistHeroImages(media), {
    bannerImage: 'https://example.com/banner.jpg',
    coverImage: 'https://example.com/cover-extra-large.jpg',
  })
})

test('getAnilistHeroImages returns null values when media fields are missing', () => {
  const media = {
    bannerImage: null,
    coverImage: { extraLarge: null },
  }

  assert.deepEqual(getAnilistHeroImages(media), {
    bannerImage: null,
    coverImage: null,
  })
})

test('getAnilistHeroImage preserves the legacy string return shape', () => {
  const media = {
    bannerImage: 'https://example.com/banner.jpg',
    coverImage: { extraLarge: 'https://example.com/cover-extra-large.jpg' },
  }

  assert.equal(getAnilistHeroImage(media), 'https://example.com/banner.jpg')
})
