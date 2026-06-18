const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_NOW = Date.now()

export const EMPTY_ADMIN_METRICS = {
  trackedUsers: 0,
  trackedItems: 0,
  totalWatchedEpisodes: 0,
  avgScore: 0,
  totalClicks: 0,
  totalLikes: 0,
  notesCount: 0,
  totalViews: 0,
  totalPlays: 0,
  avgWatchTimeSeconds: 0,
  avgCompletionRate: 0,
  avgVideoStartMs: 0,
  pageLoadAvgMs: 0,
  playerErrors: 0,
  bufferingEvents: 0,
  sessionDrops: 0,
  bannerCtr: 0,
  topClickedAnimes: [],
  clickSources: [],
  countryBreakdown: [],
  topTrackedAnimes: [],
  eventBreakdown: [],
  topAnimeViews: [],
  topEpisodeViews: [],
  topEpisodePlays: [],
  topSearchedAnime: [],
  topWatchlistAdds: [],
  bannerPerformance: [],
  deviceBreakdown: {},
  qualityBreakdown: [],
  viewsSeries: [],
  trendingAnime: [],
}

// Engagement weights for the public "Trending Now" shelf. Stronger intent
// (adding to watchlist, playing an episode) counts more than a passing open.
const TRENDING_EVENT_WEIGHTS = {
  anime_open: 1,
  anime_view: 1,
  search_result_click: 1.2,
  banner_click: 1.5,
  episode_play: 2,
  watchlist_add: 3,
}

// Pure aggregator: turns raw metric events into a ranked list of anime ids.
// Used by fetchTrendingAnimeIds; kept pure so it can be unit-tested.
export function aggregateTrendingEventIds(events = [], {
  weights = TRENDING_EVENT_WEIGHTS,
  limit = 12,
} = {}) {
  const scores = new Map()
  for (const event of events) {
    const weight = weights[event.event_type]
    if (!weight) continue
    const id = event.anime_id
    if (id === null || id === undefined || id === '') continue
    scores.set(id, (scores.get(id) ?? 0) + weight)
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)
}

export function calculateTrendingScore({
  views24h = 0,
  plays24h = 0,
  watchlistAdds24h = 0,
  searches24h = 0,
  completions24h = 0,
  bannerClicks24h = 0,
} = {}) {
  return Math.round(
    views24h +
    plays24h * 2 +
    watchlistAdds24h * 3 +
    searches24h * 1.5 +
    completions24h * 2 +
    bannerClicks24h
  )
}

function increment(map, key, amount = 1) {
  if (key === null || key === undefined || key === '') return
  map.set(key, (map.get(key) ?? 0) + amount)
}

function getAnimeTitle(animeById, animeId, metadata = {}) {
  return metadata.title || metadata.animeTitle || animeById.get(animeId)?.title || `Anime #${animeId}`
}

function getEpisodeKey(event) {
  const episode = event.metadata?.episode ?? event.metadata?.episodeNumber
  if (!event.anime_id || episode === null || episode === undefined) return null
  return `${event.anime_id}:${episode}`
}

function sortCountDesc(items, countKey = 'count') {
  return items.sort((a, b) => (b[countKey] ?? 0) - (a[countKey] ?? 0))
}

function average(values) {
  const clean = values.filter(value => Number.isFinite(value))
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0
}

function inLast(createdAt, now, ms) {
  const time = Date.parse(createdAt)
  return Number.isFinite(time) && now - time <= ms
}

function emptyTrend() {
  return {
    views24h: 0,
    plays24h: 0,
    watchlistAdds24h: 0,
    searches24h: 0,
    completions24h: 0,
    bannerClicks24h: 0,
  }
}

export function buildAdminMetricStats({
  events = [],
  userAnime = [],
  animes = [],
  votes = [],
  now = DEFAULT_NOW,
} = {}) {
  const animeById = new Map(animes.map(anime => [anime.id, anime]))
  const trackedUsers = new Set(userAnime.map(item => item.user_id).filter(Boolean)).size
  const trackedItems = userAnime.length
  const totalWatchedEpisodes = userAnime.reduce((sum, item) => sum + (item.ep_progress ?? 0), 0)
  const scored = userAnime.filter(item => item.user_score != null)
  const avgScore = average(scored.map(item => Number(item.user_score || 0)))
  const notesCount = userAnime.filter(item => item.notes && item.notes.trim()).length

  const animeViews = new Map()
  const episodeViews = new Map()
  const episodePlays = new Map()
  const clickSources = new Map()
  const countryBreakdown = new Map()
  const eventsByType = new Map()
  const searchTerms = new Map()
  const bannerViews = new Map()
  const bannerClicks = new Map()
  const deviceBreakdown = new Map()
  const qualityBreakdown = new Map()
  const viewsByDay = new Map()
  const trends = new Map()
  const watchTimes = []
  const completionRates = []
  const videoStartTimes = []
  const pageLoadTimes = []

  for (const event of events) {
    const meta = event.metadata ?? {}
    const type = event.event_type
    increment(eventsByType, type)

    const deviceType = meta.deviceType || meta.device || null
    if (deviceType) {
      const current = deviceBreakdown.get(deviceType) ?? { device: deviceType, events: 0, errors: 0, avgPageLoadMs: 0, pageLoadSamples: [] }
      current.events += 1
      if (type === 'player_error') current.errors += 1
      if (Number.isFinite(meta.loadTimeMs)) current.pageLoadSamples.push(Number(meta.loadTimeMs))
      deviceBreakdown.set(deviceType, current)
    }

    const country = meta.country || meta.countryCode
    if (country) increment(countryBreakdown, country)

    if (event.anime_id && inLast(event.created_at, now, DAY_MS) && !trends.has(event.anime_id)) {
      trends.set(event.anime_id, emptyTrend())
    }
    const trend = event.anime_id ? trends.get(event.anime_id) : null

    if (type === 'anime_open' || type === 'anime_view') {
      increment(animeViews, event.anime_id)
      increment(clickSources, meta.source || event.page || 'unknown')
      if (trend && inLast(event.created_at, now, DAY_MS)) trend.views24h += 1

      const day = new Date(event.created_at).toISOString().split('T')[0]
      increment(viewsByDay, day)
    }

    if (type === 'episode_view') increment(episodeViews, getEpisodeKey(event))

    if (type === 'episode_play') {
      increment(episodePlays, getEpisodeKey(event))
      if (trend && inLast(event.created_at, now, DAY_MS)) trend.plays24h += 1
      if (Number.isFinite(meta.watchTimeSeconds)) watchTimes.push(Number(meta.watchTimeSeconds))
      if (Number.isFinite(meta.completionRate)) completionRates.push(Number(meta.completionRate) * 100)
      if (meta.quality) increment(qualityBreakdown, meta.quality)
    }

    if (type === 'episode_complete') {
      if (trend && inLast(event.created_at, now, DAY_MS)) trend.completions24h += 1
      if (Number.isFinite(meta.watchTimeSeconds)) watchTimes.push(Number(meta.watchTimeSeconds))
      if (Number.isFinite(meta.completionRate)) completionRates.push(Number(meta.completionRate) * 100)
    }

    if (type === 'watchlist_add' && trend && inLast(event.created_at, now, DAY_MS)) {
      trend.watchlistAdds24h += 1
    }

    if (type === 'search') {
      const query = String(meta.query || '').trim().toLowerCase()
      if (query) {
        const current = searchTerms.get(query) ?? { query, searches: 0, resultClicks: 0, topResultTitle: meta.topResultTitle || query }
        current.searches += 1
        searchTerms.set(query, current)
        if (event.anime_id && trend && inLast(event.created_at, now, DAY_MS)) trend.searches24h += 1
      }
    }

    if (type === 'search_result_click') {
      const query = String(meta.query || '').trim().toLowerCase()
      if (query) {
        const current = searchTerms.get(query) ?? { query, searches: 0, resultClicks: 0, topResultTitle: meta.title || query }
        current.resultClicks += 1
        if (meta.title) current.topResultTitle = meta.title
        searchTerms.set(query, current)
      }
    }

    if (type === 'banner_view') increment(bannerViews, event.anime_id)
    if (type === 'banner_click') {
      increment(bannerClicks, event.anime_id)
      if (trend && inLast(event.created_at, now, DAY_MS)) trend.bannerClicks24h += 1
    }

    if (type === 'video_start_time' && Number.isFinite(meta.startTimeMs)) videoStartTimes.push(Number(meta.startTimeMs))
    if (type === 'page_load' && Number.isFinite(meta.loadTimeMs)) pageLoadTimes.push(Number(meta.loadTimeMs))
  }

  const trackedByAnime = new Map()
  for (const item of userAnime) {
    if (!trackedByAnime.has(item.anime_id)) {
      trackedByAnime.set(item.anime_id, { animeId: item.anime_id, users: 0, progress: 0, completed: 0, watchlistAdds: 0 })
    }
    const current = trackedByAnime.get(item.anime_id)
    current.users += 1
    current.progress += item.ep_progress ?? 0
    if (item.status === 'completed') current.completed += 1
    if (item.status === 'plan_to_watch') current.watchlistAdds += 1
    if (item.status === 'plan_to_watch' && trends.has(item.anime_id)) trends.get(item.anime_id).watchlistAdds24h += 1
  }

  const totalBannerViews = [...bannerViews.values()].reduce((sum, value) => sum + value, 0)
  const totalBannerClicks = [...bannerClicks.values()].reduce((sum, value) => sum + value, 0)

  const topEpisodes = (map, keyName) => [...map.entries()]
    .filter(([key]) => Boolean(key))
    .map(([key, count]) => {
      const [animeIdText, episodeText] = key.split(':')
      const animeId = Number(animeIdText)
      return {
        animeId,
        episode: Number(episodeText),
        title: getAnimeTitle(animeById, animeId),
        [keyName]: count,
      }
    })
    .sort((a, b) => b[keyName] - a[keyName])
    .slice(0, 8)

  const normalizedDevices = Object.fromEntries([...deviceBreakdown.entries()].map(([device, item]) => [
    device,
    {
      device,
      events: item.events,
      errors: item.errors,
      avgPageLoadMs: Math.round(average(item.pageLoadSamples)),
    },
  ]))

  return {
    trackedUsers,
    trackedItems,
    totalWatchedEpisodes,
    avgScore,
    totalClicks: [...animeViews.values()].reduce((sum, value) => sum + value, 0),
    totalLikes: votes.length,
    notesCount,
    totalViews: [...animeViews.values()].reduce((sum, value) => sum + value, 0),
    totalPlays: [...episodePlays.values()].reduce((sum, value) => sum + value, 0),
    avgWatchTimeSeconds: Math.round(average(watchTimes)),
    avgCompletionRate: Math.round(average(completionRates)),
    avgVideoStartMs: Math.round(average(videoStartTimes)),
    pageLoadAvgMs: Math.round(average(pageLoadTimes)),
    playerErrors: events.filter(item => item.event_type === 'player_error').length,
    bufferingEvents: events.filter(item => item.event_type === 'player_buffering').length,
    sessionDrops: events.filter(item => item.event_type === 'session_drop').length,
    bannerCtr: totalBannerViews ? Math.round((totalBannerClicks / totalBannerViews) * 100) : 0,
    topClickedAnimes: [...animeViews.entries()]
      .map(([animeId, clicks]) => ({ animeId, clicks, title: getAnimeTitle(animeById, animeId) }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5),
    clickSources: [...clickSources.entries()].map(([source, clicks]) => ({ source, clicks })).sort((a, b) => b.clicks - a.clicks),
    countryBreakdown: [...countryBreakdown.entries()].map(([country, events]) => ({ country, events })).sort((a, b) => b.events - a.events),
    topTrackedAnimes: [...trackedByAnime.values()]
      .map(item => ({ ...item, title: getAnimeTitle(animeById, item.animeId) }))
      .sort((a, b) => b.users - a.users || b.progress - a.progress || b.completed - a.completed)
      .slice(0, 5),
    eventBreakdown: [...eventsByType.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    topAnimeViews: [...animeViews.entries()]
      .map(([animeId, views]) => ({ animeId, views, title: getAnimeTitle(animeById, animeId) }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8),
    topEpisodeViews: topEpisodes(episodeViews, 'views'),
    topEpisodePlays: topEpisodes(episodePlays, 'plays'),
    topSearchedAnime: sortCountDesc([...searchTerms.values()], 'searches').slice(0, 8),
    topWatchlistAdds: [...trackedByAnime.values()]
      .map(item => ({ animeId: item.animeId, title: getAnimeTitle(animeById, item.animeId), adds: item.watchlistAdds }))
      .filter(item => item.adds > 0)
      .sort((a, b) => b.adds - a.adds)
      .slice(0, 8),
    bannerPerformance: [...new Set([...bannerViews.keys(), ...bannerClicks.keys()])]
      .map(animeId => {
        const views = bannerViews.get(animeId) ?? 0
        const clicks = bannerClicks.get(animeId) ?? 0
        return { animeId, title: getAnimeTitle(animeById, animeId), views, clicks, ctr: views ? Math.round((clicks / views) * 100) : 0 }
      })
      .sort((a, b) => b.clicks - a.clicks || b.views - a.views)
      .slice(0, 8),
    deviceBreakdown: normalizedDevices,
    qualityBreakdown: [...qualityBreakdown.entries()].map(([quality, events]) => ({ quality, events })).sort((a, b) => b.events - a.events),
    viewsSeries: [...viewsByDay.entries()].map(([date, views]) => ({ date, views })).sort((a, b) => a.date.localeCompare(b.date)).slice(-7),
    trendingAnime: [...trends.entries()]
      .map(([animeId, signals]) => ({
        animeId,
        title: getAnimeTitle(animeById, animeId),
        ...signals,
        score: calculateTrendingScore(signals),
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8),
  }
}
