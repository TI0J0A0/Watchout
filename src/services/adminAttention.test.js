import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAttentionQueue,
  detectLibraryIssues,
} from './adminAttention.js'

test('detectLibraryIssues finds missing metadata, duplicate entries and episode overflow', () => {
  const issues = detectLibraryIssues([
    { user_id: 'u1', anime_id: 10, ep_progress: 14, updated_at: '2026-05-16T10:00:00.000Z', animes: { title: 'A', eps: 12 } },
    { user_id: 'u1', anime_id: 10, ep_progress: 2, updated_at: '2026-05-15T10:00:00.000Z', animes: { title: 'A', eps: 12 } },
    { user_id: 'u2', anime_id: 11, ep_progress: 1, updated_at: '2026-05-14T10:00:00.000Z', animes: null },
  ])

  assert.deepEqual(issues.map(item => item.code), [
    'episode_progress_over_total',
    'duplicate_library_item',
    'missing_anime_metadata',
  ])
  assert.equal(issues[0].userId, 'u1')
  assert.equal(issues[0].animeId, 10)
})

test('buildAttentionQueue prioritizes critical errors before support feedback and lower risk items', () => {
  const queue = buildAttentionQueue({
    feedback: [
      { id: 'f1', type: 'idea', title: 'Add calendar filter', status: 'open', votes: 2, created_at: '2026-05-16T10:00:00.000Z' },
      { id: 'f2', type: 'bug', title: 'Import broke', status: 'open', votes: 7, user_id: 'u1', created_at: '2026-05-15T10:00:00.000Z' },
    ],
    errors: [
      { id: 'e1', message: 'metrics failed', source: 'metrics', created_at: '2026-05-14T10:00:00.000Z' },
    ],
    bannedUsers: [
      { id: 'u2', username: 'blocked', updated_at: '2026-05-13T10:00:00.000Z' },
    ],
    library: [
      { user_id: 'u3', anime_id: 9, ep_progress: 30, updated_at: '2026-05-12T10:00:00.000Z', animes: { title: 'Odd Anime', eps: 12 } },
    ],
  })

  assert.deepEqual(queue.items.map(item => item.type), [
    'recent_error',
    'feedback_bug',
    'library_issue',
    'feedback_open',
    'banned_user',
  ])
  assert.deepEqual(queue.summary, {
    total: 5,
    critical: 1,
    high: 2,
    medium: 1,
    low: 1,
  })
})
