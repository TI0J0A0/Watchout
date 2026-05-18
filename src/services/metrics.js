import { supabase } from './supabase'
import { buildAdminMetricStats, EMPTY_ADMIN_METRICS } from './metricsAnalytics'

const SESSION_KEY = 'watchout_metrics_session'

function getDeviceType() {
  if (typeof window === 'undefined') return null
  const width = window.innerWidth || 0
  const ua = window.navigator?.userAgent || ''
  if (/TV|SmartTV|AppleTV|GoogleTV|HbbTV|NetCast|Tizen|Web0S/i.test(ua)) return 'tv'
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua) || width <= 760) return 'mobile'
  return 'desktop'
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
      metadata: { ...metadata, timezone, deviceType: metadata.deviceType || getDeviceType() },
    },
  }).then(() => {}).catch(() => {})
}

export async function fetchAdminMetrics() {
  if (!supabase) return EMPTY_ADMIN_METRICS

  const results = await Promise.allSettled([
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

  const [eventsRes, userAnimeRes, animeRes, votesRes] = results.map(result =>
    result.status === 'fulfilled' ? result.value : { data: [], error: result.reason }
  )

  const blockingError = [eventsRes, userAnimeRes, animeRes].find(result => result.error)?.error
  if (blockingError) {
    throw blockingError
  }

  const events = eventsRes.data ?? []
  const userAnime = userAnimeRes.data ?? []
  const animes = animeRes.data ?? []
  const votes = votesRes.error ? [] : votesRes.data ?? []

  return buildAdminMetricStats({ events, userAnime, animes, votes })
}
