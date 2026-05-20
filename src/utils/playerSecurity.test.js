import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMegaplayEmbedUrl, getTrustedPlayerMessage } from './playerSecurity.js'

test('buildMegaplayEmbedUrl validates ids, language and quality', () => {
  assert.equal(
    buildMegaplayEmbedUrl({ animeId: 1, episode: 2, lang: 'sub', quality: '720' }),
    'https://megaplay.buzz/stream/mal/1/2/sub?quality=720',
  )
  assert.equal(buildMegaplayEmbedUrl({ animeId: 1, episode: 2, lang: 'dub', quality: 'auto' }), 'https://megaplay.buzz/stream/mal/1/2/dub')
  assert.equal(buildMegaplayEmbedUrl({ animeId: 'x', episode: 2 }), null)
  assert.equal(buildMegaplayEmbedUrl({ animeId: 1, episode: 0 }), null)
  assert.equal(buildMegaplayEmbedUrl({ animeId: 1, episode: 2, lang: 'raw' }), null)
  assert.equal(buildMegaplayEmbedUrl({ animeId: 1, episode: 2, quality: '4k' }), null)
})

test('getTrustedPlayerMessage accepts only expected Megaplay payloads', () => {
  assert.deepEqual(getTrustedPlayerMessage({
    origin: 'https://megaplay.buzz',
    data: JSON.stringify({ type: 'watching-log', duration: 120, currentTime: 61 }),
  }), { type: 'watching-log', duration: 120, currentTime: 61 })

  assert.equal(getTrustedPlayerMessage({ origin: 'https://evil.example', data: { event: 'complete' } }), null)
  assert.equal(getTrustedPlayerMessage({ origin: 'https://megaplay.buzz', data: { event: 'time', percent: 2 } }), null)
  assert.equal(getTrustedPlayerMessage({ origin: 'https://megaplay.buzz', data: { type: 'watching-log', duration: 'x', currentTime: 1 } }), null)
  assert.deepEqual(getTrustedPlayerMessage({ origin: 'https://megaplay.buzz', data: { event: 'complete' } }), { event: 'complete' })
})
