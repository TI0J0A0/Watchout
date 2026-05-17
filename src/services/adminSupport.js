const EMPTY_LIBRARY_SUMMARY = {
  totalItems: 0,
  totalEpisodes: 0,
  avgScore: 0,
  statusCounts: {
    watching: 0,
    plan_to_watch: 0,
    completed: 0,
    dropped: 0,
  },
  recentItems: [],
}

const DIAGNOSTIC_ORDER = [
  'banned_user',
  'no_recent_activity',
  'open_feedback',
  'duplicate_library_items',
  'missing_anime_metadata',
  'episode_progress_over_total',
]

function byDateDesc(a, b) {
  return new Date(b.created_at ?? b.updated_at ?? 0).getTime() -
    new Date(a.created_at ?? a.updated_at ?? 0).getTime()
}

function titleForLibraryItem(item) {
  return item.animes?.title ?? item.title ?? `Anime #${item.anime_id}`
}

async function safeQuery(query, fallback) {
  const { data, error, count } = await query
  if (error) return fallback
  if (typeof count === 'number') return { data: data ?? fallback?.data ?? [], count }
  return data ?? fallback
}

export function normalizeSupportProfile(profile = {}) {
  const label = profile.display_name || profile.username || profile.email || profile.id || 'Usuario sem nome'
  const username = profile.username || profile.email?.split('@')[0] || ''

  return {
    ...profile,
    label,
    handle: username ? `@${username}` : 'Sem username',
    isPremium: Boolean(profile.is_premium),
    isBanned: Boolean(profile.is_banned),
  }
}

export function summarizeLibrary(items = []) {
  const statusCounts = { ...EMPTY_LIBRARY_SUMMARY.statusCounts }
  let totalEpisodes = 0
  let scoredTotal = 0
  let scoredCount = 0

  for (const item of items) {
    if (item.status && statusCounts[item.status] !== undefined) {
      statusCounts[item.status] += 1
    }
    totalEpisodes += Number(item.ep_progress ?? 0)
    if (item.user_score != null) {
      scoredTotal += Number(item.user_score)
      scoredCount += 1
    }
  }

  return {
    totalItems: items.length,
    totalEpisodes,
    avgScore: scoredCount ? scoredTotal / scoredCount : 0,
    statusCounts,
    recentItems: [...items]
      .sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime())
      .slice(0, 8)
      .map(item => ({
        animeId: item.anime_id,
        title: titleForLibraryItem(item),
        status: item.status,
        score: item.user_score,
        progress: item.ep_progress ?? 0,
        episodes: item.animes?.eps ?? null,
        updatedAt: item.updated_at,
      })),
  }
}

export function buildSupportDiagnostics({
  profile = null,
  library = [],
  events = [],
  feedback = [],
} = {}) {
  const diagnostics = []
  const add = (code, severity, title, detail) => diagnostics.push({ code, severity, title, detail })

  if (profile?.is_banned) {
    add('banned_user', 'warning', 'Usuario banido', 'A conta esta marcada como banida/suspensa.')
  }

  if (events.length === 0) {
    add('no_recent_activity', 'info', 'Sem atividade recente', 'Nenhum evento recente foi encontrado para este usuario.')
  }

  const openFeedback = feedback.filter(item => item.status === 'open')
  if (openFeedback.length > 0) {
    add('open_feedback', 'info', 'Feedback aberto', `${openFeedback.length} feedback(s) aberto(s) deste usuario.`)
  }

  const seenAnime = new Set()
  const duplicateAnime = new Set()
  for (const item of library) {
    if (!item.anime_id) continue
    if (seenAnime.has(item.anime_id)) duplicateAnime.add(item.anime_id)
    seenAnime.add(item.anime_id)
  }
  if (duplicateAnime.size > 0) {
    add('duplicate_library_items', 'warning', 'Possiveis duplicados', `${duplicateAnime.size} anime(s) aparecem mais de uma vez na biblioteca.`)
  }

  const missingMetadata = library.filter(item => !item.animes && !item.title)
  if (missingMetadata.length > 0) {
    add('missing_anime_metadata', 'warning', 'Metadados ausentes', `${missingMetadata.length} item(ns) nao tem dados do anime vinculados.`)
  }

  const progressOverTotal = library.filter(item => {
    const eps = Number(item.animes?.eps ?? 0)
    return eps > 0 && Number(item.ep_progress ?? 0) > eps
  })
  if (progressOverTotal.length > 0) {
    add('episode_progress_over_total', 'warning', 'Progresso inconsistente', `${progressOverTotal.length} item(ns) tem progresso maior que o total de episodios.`)
  }

  return diagnostics.sort((a, b) => DIAGNOSTIC_ORDER.indexOf(a.code) - DIAGNOSTIC_ORDER.indexOf(b.code))
}

export async function searchSupportUsers(query = '') {
  const term = query.trim()
  if (!supabase || term.length < 2) return []
  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term)

  let request = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, avatar_grad, is_premium, is_banned, updated_at, created_at')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(12)

  const filters = [`username.ilike.%${term}%`, `display_name.ilike.%${term}%`]
  if (looksLikeUuid) filters.push(`id.eq.${term}`)
  request = request.or(filters.join(','))
  const { data, error } = await request
  if (error) throw error
  return (data ?? []).map(normalizeSupportProfile)
}

export async function fetchSupportUser(profileId) {
  if (!supabase || !profileId) return null

  const profileRes = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, avatar_grad, is_premium, is_banned, updated_at, created_at')
    .eq('id', profileId)
    .single()
  if (profileRes.error) throw profileRes.error

  const [
    library,
    events,
    feedback,
    topics,
    posts,
    comments,
    friendships,
    errors,
  ] = await Promise.all([
    safeQuery(
      supabase
        .from('user_anime')
        .select('anime_id, status, user_score, ep_progress, notes, updated_at, animes(id, title, eps, img)')
        .eq('user_id', profileId)
        .order('updated_at', { ascending: false })
        .limit(80),
      []
    ),
    safeQuery(
      supabase
        .from('site_metrics_events')
        .select('event_type, anime_id, page, metadata, created_at')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(30),
      []
    ),
    safeQuery(
      supabase
        .from('feedback')
        .select('id, type, title, status, votes, created_at')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(20),
      []
    ),
    safeQuery(
      supabase
        .from('forum_topics')
        .select('id, title, anime_title, reply_count, views, created_at')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(20),
      []
    ),
    safeQuery(
      supabase
        .from('forum_posts')
        .select('id, topic_id, content, created_at')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(20),
      []
    ),
    safeQuery(
      supabase
        .from('anime_comments')
        .select('id, anime_id, content, created_at')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(20),
      []
    ),
    safeQuery(
      supabase
        .from('friendships')
        .select('id, requester_id, addressee_id, status, created_at')
        .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`),
      []
    ),
    safeQuery(
      supabase
        .from('admin_error_logs')
        .select('id, source, message, metadata, created_at')
        .or(`metadata->>userId.eq.${profileId},metadata->>user_id.eq.${profileId}`)
        .order('created_at', { ascending: false })
        .limit(10),
      []
    ),
  ])

  const normalizedProfile = normalizeSupportProfile(profileRes.data)
  const librarySummary = summarizeLibrary(library)
  const diagnostics = buildSupportDiagnostics({
    profile: normalizedProfile,
    library,
    events,
    feedback,
  })

  const acceptedFriends = friendships.filter(item => item.status === 'accepted').length
  const pendingFriends = friendships.filter(item => item.status !== 'accepted').length

  return {
    profile: normalizedProfile,
    library,
    librarySummary,
    diagnostics,
    events,
    feedback,
    topics,
    posts,
    comments,
    errors,
    friends: {
      accepted: acceptedFriends,
      pending: pendingFriends,
    },
    recentActivity: [
      ...events.map(item => ({ kind: 'Evento', label: item.event_type, meta: item.page || item.metadata?.source || '', created_at: item.created_at })),
      ...feedback.map(item => ({ kind: 'Feedback', label: item.title, meta: item.status, created_at: item.created_at })),
      ...topics.map(item => ({ kind: 'Topico', label: item.title, meta: `${item.reply_count ?? 0} respostas`, created_at: item.created_at })),
      ...posts.map(item => ({ kind: 'Resposta', label: item.content, meta: `Topico ${item.topic_id}`, created_at: item.created_at })),
      ...comments.map(item => ({ kind: 'Comentario', label: item.content, meta: `Anime ${item.anime_id}`, created_at: item.created_at })),
    ].sort(byDateDesc).slice(0, 20),
  }
}
import { supabase } from './supabase.js'
