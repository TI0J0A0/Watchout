import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSupportDiagnostics,
  normalizeSupportProfile,
  summarizeLibrary,
} from './adminSupport.js'

test('normalizeSupportProfile builds stable display fields', () => {
  const profile = normalizeSupportProfile({
    id: 'user-1',
    username: 'ana',
    display_name: 'Ana Silva',
    is_premium: true,
    is_banned: false,
    updated_at: '2026-05-15T12:00:00.000Z',
  })

  assert.equal(profile.id, 'user-1')
  assert.equal(profile.label, 'Ana Silva')
  assert.equal(profile.handle, '@ana')
  assert.equal(profile.isPremium, true)
  assert.equal(profile.isBanned, false)
})

test('summarizeLibrary returns totals, status counts, average score and recent items', () => {
  const summary = summarizeLibrary([
    { anime_id: 10, status: 'watching', user_score: 8, ep_progress: 6, updated_at: '2026-05-12T10:00:00.000Z', animes: { title: 'A', eps: 12 } },
    { anime_id: 11, status: 'completed', user_score: 10, ep_progress: 24, updated_at: '2026-05-14T10:00:00.000Z', animes: { title: 'B', eps: 24 } },
    { anime_id: 12, status: 'dropped', user_score: null, ep_progress: 2, updated_at: '2026-05-13T10:00:00.000Z', animes: { title: 'C', eps: 13 } },
  ])

  assert.equal(summary.totalItems, 3)
  assert.equal(summary.totalEpisodes, 32)
  assert.equal(summary.avgScore, 9)
  assert.deepEqual(summary.statusCounts, {
    watching: 1,
    plan_to_watch: 0,
    completed: 1,
    dropped: 1,
  })
  assert.deepEqual(summary.recentItems.map(item => item.animeId), [11, 12, 10])
})

test('buildSupportDiagnostics flags account and library issues', () => {
  const diagnostics = buildSupportDiagnostics({
    profile: { is_banned: true, is_premium: false },
    library: [
      { anime_id: 10, ep_progress: 14, animes: { eps: 12 } },
      { anime_id: 10, ep_progress: 2, animes: { eps: 12 } },
      { anime_id: 12, ep_progress: 1, animes: null },
    ],
    events: [],
    feedback: [{ id: 'fb-1', status: 'open' }],
  })

  assert.deepEqual(diagnostics.map(item => item.code), [
    'banned_user',
    'no_recent_activity',
    'open_feedback',
    'duplicate_library_items',
    'missing_anime_metadata',
    'episode_progress_over_total',
  ])
})
