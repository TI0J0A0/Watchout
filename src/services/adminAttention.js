import { supabase } from './supabase.js'

const SEVERITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function byAttentionPriority(a, b) {
  const severity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  if (severity !== 0) return severity
  return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
}

function profileLabel(profile = {}) {
  return profile.display_name || profile.username || profile.email || profile.id || 'Usuario'
}

function compact(value = '', max = 150) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value
}

async function safeQuery(query, fallback = []) {
  const { data, error } = await query
  if (error) return fallback
  return data ?? fallback
}

export function detectLibraryIssues(library = [], limit = 20) {
  const issues = []
  const seen = new Set()
  const duplicates = new Set()

  for (const item of library) {
    const userId = item.user_id
    const animeId = item.anime_id
    const key = `${userId}:${animeId}`
    const animeTitle = item.animes?.title || `Anime #${animeId}`
    const updatedAt = item.updated_at

    const totalEpisodes = Number(item.animes?.eps ?? 0)
    const progress = Number(item.ep_progress ?? 0)
    if (totalEpisodes > 0 && progress > totalEpisodes) {
      issues.push({
        code: 'episode_progress_over_total',
        severity: 'high',
        userId,
        animeId,
        title: 'Progresso maior que o total',
        detail: `${animeTitle}: ${progress}/${totalEpisodes} episodios registrados.`,
        createdAt: updatedAt,
      })
    }

    if (!item.animes) {
      issues.push({
        code: 'missing_anime_metadata',
        severity: 'high',
        userId,
        animeId,
        title: 'Anime sem metadados',
        detail: `Item #${animeId} esta na biblioteca, mas nao encontrou dados do anime.`,
        createdAt: updatedAt,
      })
    }

    if (userId && animeId) {
      if (seen.has(key)) duplicates.add(key)
      seen.add(key)
    }
  }

  for (const key of duplicates) {
    const [userId, animeId] = key.split(':')
    const item = library.find(entry => `${entry.user_id}:${entry.anime_id}` === key)
    issues.push({
      code: 'duplicate_library_item',
      severity: 'high',
      userId,
      animeId: Number(animeId),
      title: 'Possivel duplicado na biblioteca',
      detail: `${item?.animes?.title || `Anime #${animeId}`} aparece mais de uma vez para o mesmo usuario.`,
      createdAt: item?.updated_at,
    })
  }

  return issues.sort(byAttentionPriority).slice(0, limit)
}

export function buildAttentionQueue({
  feedback = [],
  errors = [],
  bannedUsers = [],
  library = [],
} = {}, limit = 30) {
  const items = []

  for (const error of errors) {
    items.push({
      id: `error:${error.id}`,
      type: 'recent_error',
      severity: 'critical',
      title: error.message || 'Erro recente sem mensagem',
      detail: error.source ? `Origem: ${error.source}` : 'Erro registrado no painel.',
      createdAt: error.created_at,
      sourceId: error.id,
    })
  }

  for (const item of feedback.filter(entry => entry.status === 'open')) {
    const isBug = item.type === 'bug'
    const isHighVote = Number(item.votes ?? 0) >= 5
    items.push({
      id: `feedback:${item.id}`,
      type: isBug ? 'feedback_bug' : 'feedback_open',
      severity: isBug || isHighVote ? 'high' : 'medium',
      title: item.title || 'Feedback aberto',
      detail: `${item.type || 'feedback'} aberto com ${item.votes ?? 0} voto(s).`,
      createdAt: item.created_at,
      userId: item.user_id,
      sourceId: item.id,
    })
  }

  for (const issue of detectLibraryIssues(library)) {
    items.push({
      id: `library:${issue.code}:${issue.userId}:${issue.animeId}`,
      type: 'library_issue',
      severity: issue.severity,
      title: issue.title,
      detail: issue.detail,
      createdAt: issue.createdAt,
      userId: issue.userId,
      animeId: issue.animeId,
    })
  }

  for (const user of bannedUsers) {
    items.push({
      id: `banned:${user.id}`,
      type: 'banned_user',
      severity: 'low',
      title: `${profileLabel(user)} esta banido`,
      detail: 'Conta marcada como banida. Revise se ainda precisa ficar assim.',
      createdAt: user.updated_at || user.created_at,
      userId: user.id,
    })
  }

  const sorted = items.sort(byAttentionPriority).slice(0, limit)
  return {
    summary: {
      total: sorted.length,
      critical: sorted.filter(item => item.severity === 'critical').length,
      high: sorted.filter(item => item.severity === 'high').length,
      medium: sorted.filter(item => item.severity === 'medium').length,
      low: sorted.filter(item => item.severity === 'low').length,
    },
    items: sorted.map(item => ({
      ...item,
      detail: compact(item.detail || ''),
    })),
  }
}

export async function fetchAdminAttentionQueue() {
  if (!supabase) return buildAttentionQueue()

  const [feedback, errors, bannedUsers, library] = await Promise.all([
    safeQuery(
      supabase
        .from('feedback')
        .select('id, user_id, type, title, status, votes, created_at, profiles(username, display_name)')
        .in('status', ['open', 'reviewing'])
        .order('created_at', { ascending: false })
        .limit(40)
    ),
    safeQuery(
      supabase
        .from('admin_error_logs')
        .select('id, source, message, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(12)
    ),
    safeQuery(
      supabase
        .from('profiles')
        .select('id, username, display_name, is_banned, updated_at')
        .eq('is_banned', true)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .limit(12)
    ),
    safeQuery(
      supabase
        .from('user_anime')
        .select('user_id, anime_id, ep_progress, updated_at, animes(id, title, eps)')
        .order('updated_at', { ascending: false })
        .limit(500)
    ),
  ])

  return buildAttentionQueue({
    feedback,
    errors,
    bannedUsers,
    library,
  })
}
