import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getNotificationAnimeId,
  getRecentNotificationCutoff,
} from './notificationRules.js'

test('getRecentNotificationCutoff returns an ISO timestamp five hours before now by default', () => {
  assert.equal(
    getRecentNotificationCutoff(new Date('2026-05-17T12:00:00.000Z')),
    '2026-05-17T07:00:00.000Z',
  )
})

test('getNotificationAnimeId accepts numeric and string anime ids', () => {
  assert.equal(getNotificationAnimeId({ data: { anime_id: 123 } }), 123)
  assert.equal(getNotificationAnimeId({ data: { anime_id: '456' } }), 456)
  assert.equal(getNotificationAnimeId({ data: { anime_id: 'bad' } }), null)
})
