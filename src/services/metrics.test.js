import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAdminMetricStats,
  calculateTrendingScore,
} from './metricsAnalytics.js'

test('calculateTrendingScore weights recent engagement signals', () => {
  assert.equal(calculateTrendingScore({
    views24h: 10,
    plays24h: 5,
    watchlistAdds24h: 3,
    searches24h: 4,
    completions24h: 2,
    bannerClicks24h: 1,
  }), 40)
})

test('buildAdminMetricStats aggregates anime, episode, search, banner, player and device metrics', () => {
  const now = Date.parse('2026-05-17T12:00:00.000Z')
  const events = [
    { event_type: 'anime_open', anime_id: 1, page: 'search', metadata: { title: 'Alpha', source: 'search', deviceType: 'desktop' }, created_at: '2026-05-17T11:00:00.000Z' },
    { event_type: 'anime_open', anime_id: 1, page: 'hero', metadata: { title: 'Alpha', source: 'hero', deviceType: 'mobile' }, created_at: '2026-05-17T10:00:00.000Z' },
    { event_type: 'episode_play', anime_id: 1, metadata: { title: 'Alpha', episode: 2, watchTimeSeconds: 600, completionRate: 0.8, quality: '1080', deviceType: 'desktop' }, created_at: '2026-05-17T11:30:00.000Z' },
    { event_type: 'episode_complete', anime_id: 1, metadata: { title: 'Alpha', episode: 2 }, created_at: '2026-05-17T11:50:00.000Z' },
    { event_type: 'search', metadata: { query: 'alpha', topResultTitle: 'Alpha', resultCount: 4, deviceType: 'desktop' }, created_at: '2026-05-17T09:00:00.000Z' },
    { event_type: 'search_result_click', anime_id: 1, metadata: { title: 'Alpha', query: 'alpha' }, created_at: '2026-05-17T09:01:00.000Z' },
    { event_type: 'banner_view', anime_id: 1, metadata: { title: 'Alpha' }, created_at: '2026-05-17T08:00:00.000Z' },
    { event_type: 'banner_click', anime_id: 1, metadata: { title: 'Alpha' }, created_at: '2026-05-17T08:02:00.000Z' },
    { event_type: 'player_error', anime_id: 1, metadata: { episode: 2, message: 'iframe failed' }, created_at: '2026-05-17T08:05:00.000Z' },
    { event_type: 'video_start_time', anime_id: 1, metadata: { episode: 2, startTimeMs: 2400 }, created_at: '2026-05-17T08:06:00.000Z' },
    { event_type: 'page_load', metadata: { page: 'search', loadTimeMs: 1200, deviceType: 'desktop' }, created_at: '2026-05-17T07:00:00.000Z' },
  ]
  const userAnime = [
    { user_id: 'u1', anime_id: 1, status: 'plan_to_watch', user_score: null, ep_progress: 0, notes: '' },
    { user_id: 'u2', anime_id: 1, status: 'watching', user_score: 8, ep_progress: 2, notes: 'good' },
  ]
  const animes = [{ id: 1, title: 'Alpha', duration: 24 }]
  const votes = [{ user_id: 'u1', feedback_id: 'f1' }]

  const stats = buildAdminMetricStats({ events, userAnime, animes, votes, now })

  assert.equal(stats.totalViews, 2)
  assert.equal(stats.totalPlays, 1)
  assert.equal(stats.avgWatchTimeSeconds, 600)
  assert.equal(stats.avgCompletionRate, 80)
  assert.equal(stats.avgVideoStartMs, 2400)
  assert.equal(stats.playerErrors, 1)
  assert.equal(stats.bannerCtr, 100)
  assert.equal(stats.deviceBreakdown.desktop.events, 4)
  assert.equal(stats.topAnimeViews[0].title, 'Alpha')
  assert.equal(stats.topEpisodePlays[0].episode, 2)
  assert.equal(stats.topSearchedAnime[0].query, 'alpha')
  assert.equal(stats.topWatchlistAdds[0].adds, 1)
  assert.equal(stats.trendingAnime[0].title, 'Alpha')
})
