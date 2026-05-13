import test from 'node:test'
import assert from 'node:assert/strict'
import { getKitsuCoverImage } from './kitsu.js'

test('getKitsuCoverImage returns the largest useful cover image', () => {
  const anime = {
    attributes: {
      coverImage: {
        original: 'https://media.kitsu.app/anime/cover_images/1/original.jpg',
        large: 'https://media.kitsu.app/anime/cover_images/1/large.jpg',
        small: 'https://media.kitsu.app/anime/cover_images/1/small.jpg',
      },
    },
  }

  assert.equal(getKitsuCoverImage(anime), 'https://media.kitsu.app/anime/cover_images/1/original.jpg')
})

test('getKitsuCoverImage falls back through cover sizes and poster image', () => {
  assert.equal(
    getKitsuCoverImage({
      attributes: {
        coverImage: { original: null, large: 'large.jpg' },
        posterImage: { original: 'poster-original.jpg' },
      },
    }),
    'large.jpg'
  )

  assert.equal(
    getKitsuCoverImage({
      attributes: {
        coverImage: null,
        posterImage: { original: 'poster-original.jpg' },
      },
    }),
    'poster-original.jpg'
  )
})

test('getKitsuCoverImage returns null when no image exists', () => {
  assert.equal(getKitsuCoverImage(null), null)
  assert.equal(getKitsuCoverImage({ attributes: {} }), null)
})
