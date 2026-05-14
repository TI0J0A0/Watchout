import { supabase } from './supabase'
import { incrementCounter, mapById, sortByNumericFieldsDesc } from './adminShared'

const SESSION_KEY = 'watchout_metrics_session'
const EMPTY_ADMIN_METRICS = {
  trackedUsers: 0,
  trackedItems: 0,
  totalWatchedEpisodes: 0,
  avgScore: 0,
  totalClicks: 0,
  totalLikes: 0,
  notesCount: 0,
  topClickedAnimes: [],
  clickSources: [],
  countryBreakdown: [],
  topTrackedAnimes: [],
  eventBreakdown: [],
}

function getSessionId() {
  if (typeof window === 'undefined') return null
  let value = window.localStorage.getItem(SESSION_KEY)
  if (!value) {
    value = crypto.randomUUID()
    window.localStorage.setItem(SESSION_KEY, value)
  }
  return value
}

export async function trackMetricEvent({ type, userId = null, animeId = null, page = null, metadata = {} }) {
  if (!supabase || !type) return
  const sessionId = getSessionId()
  const timezone = typeof window !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || null
    : null

  supabase.functions.invoke('metrics-ingest', {
    body: {
      type,
      userId,
      animeId,
      page,
      sessionId,
      metadata: { ...metadata, timezone },
    },
  }).then(() => {}).catch(() => {})
}

export async function fetchAdminMetrics() {
  if (!supabase) return EMPTY_ADMIN_METRICS

  const [eventsRes, userAnimeRes, animeRes, votesRes] = await Promise.all([
    supabase
      .from('site_metrics_events')
      .select('event_type, anime_id, user_id, page, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase
      .from('user_anime')
      .select('user_id, anime_id, status, user_score, ep_progress, notes'),
    supabase
      .from('animes')
      .select('id, title, duration'),
    supabase
      .from('feedback_votes')
      .select('user_id, feedback_id'),
  ])

  for (const result of [eventsRes, userAnimeRes, animeRes, votesRes]) {
    if (result.error) throw result.error
  }

  const events = eventsRes.data ?? []
  const userAnime = userAnimeRes.data ?? []
  const animes = animeRes.data ?? []
  const votes = votesRes.data ?? []

  const animeById = mapById(animes)
  const trackedUsers = new Set(userAnime.map(item => item.user_id).filter(Boolean)).size
  const trackedItems = userAnime.length
  const totalWatchedEpisodes = userAnime.reduce((sum, item) => sum + (item.ep_progress ?? 0), 0)

  const scored = userAnime.filter(item => item.user_score != null)
  const avgScore = scored.length
    ? scored.reduce((sum, item) => sum + Number(item.user_score || 0), 0) / scored.length
    : 0

  const notesCount = userAnime.filter(item => item.notes && item.notes.trim()).length
  const totalClicks = events.filter(item => item.event_type === 'anime_open').length
  const totalLikes = votes.length

  const clicksByAnime = new Map()
  const clicksBySource = new Map()
  const eventsByCountry = new Map()
  const eventsByType = new Map()
  for (const event of events) {
    incrementCounter(eventsByType, event.event_type)
    const country = event.metadata?.country || event.metadata?.countryCode || 'unknown'
    incrementCounter(eventsByCountry, country)
    if (event.event_type === 'anime_open' && event.anime_id) {
      incrementCounter(clicksByAnime, event.anime_id)
      const source = event.metadata?.source || event.page || 'unknown'
      incrementCounter(clicksBySource, source)
    }
  }

  const trackedByAnime = new Map()
  for (const item of userAnime) {
    if (!trackedByAnime.has(item.anime_id)) {
      trackedByAnime.set(item.anime_id, {
        animeId: item.anime_id,
        users: 0,
        progress: 0,
        completed: 0,
      })
    }
    const current = trackedByAnime.get(item.anime_id)
    current.users += 1
    current.progress += item.ep_progress ?? 0
    if (item.status === 'completed') current.completed += 1
  }

  return {
    trackedUsers,
    trackedItems,
    totalWatchedEpisodes,
    avgScore,
    totalClicks,
    totalLikes,
    notesCount,
    topClickedAnimes: [...clicksByAnime.entries()]
      .map(([animeId, clicks]) => ({
        animeId,
        clicks,
        title: animeById.get(animeId)?.title ?? `Anime #${animeId}`,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5),
    clickSources: [...clicksBySource.entries()]
      .map(([source, clicks]) => ({ source, clicks }))
      .sort((a, b) => b.clicks - a.clicks),
    countryBreakdown: [...eventsByCountry.entries()]
      .map(([country, events]) => ({ country, events }))
      .sort((a, b) => b.events - a.events),
    topTrackedAnimes: [...trackedByAnime.values()]
      .map(item => ({
        ...item,
        title: animeById.get(item.animeId)?.title ?? `Anime #${item.animeId}`,
      }))
      .sort((a, b) => sortByNumericFieldsDesc(a, b, ['users', 'progress', 'completed']))
      .slice(0, 5),
    eventBreakdown: [...eventsByType.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
  }
}
