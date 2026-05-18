import { supabase } from './supabase'
import { fetchExactCount, mapById, sortByNumericFieldsDesc } from './adminShared'

export const ADMIN_EMAIL = 'joaoguiar99@gmail.com'
export const isAdmin = (user) => user?.email === ADMIN_EMAIL

export async function loadPremiumStatus(userId) {
  if (!supabase) return false
  const { data } = await supabase
    .from('profiles')
    .select('is_premium')
    .eq('id', userId)
    .single()
  return data?.is_premium ?? false
}

export async function grantPremium(profileId) {
  if (!supabase) return
  await supabase.from('profiles').update({ is_premium: true }).eq('id', profileId)
}

export async function revokePremium(profileId) {
  if (!supabase) return
  await supabase.from('profiles').update({ is_premium: false }).eq('id', profileId)
}

export async function toggleBanUser(userId, banned) {
  if (!supabase) return
  await supabase.from('profiles').update({ is_banned: banned }).eq('id', userId)
}

export async function fetchAdminDashboard() {
  if (!supabase) {
    return {
      totalUsers: 0,
      activeUsers: 0,
      premiumUsers: 0,
      bannedUsers: 0,
      topContent: [],
      recentErrors: [],
    }
  }

  const safeCount = async (table, applyQuery) => {
    try {
      return await fetchExactCount(table, applyQuery)
    } catch {
      return 0
    }
  }

  const [
    totalUsers,
    activeUsers,
    premiumUsers,
    bannedUsers,
    trackedAnime,
    animeCatalog,
    recentErrors,
  ] = await Promise.all([
    safeCount('profiles'),
    safeCount('profiles', query => query.eq('is_banned', false)),
    safeCount('profiles', query => query.eq('is_premium', true)),
    safeCount('profiles', query => query.eq('is_banned', true)),
    supabase
      .from('user_anime')
      .select('anime_id, status, ep_progress'),
    supabase
      .from('animes')
      .select('id, title, eps'),
    supabase
      .from('admin_error_logs')
      .select('id, message, source, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (trackedAnime.error) throw trackedAnime.error
  if (animeCatalog.error) throw animeCatalog.error

  const animeById = mapById(animeCatalog.data)
  const trackedByAnime = new Map()

  for (const item of (trackedAnime.data ?? [])) {
    if (!trackedByAnime.has(item.anime_id)) {
      trackedByAnime.set(item.anime_id, {
        animeId: item.anime_id,
        engagedUsers: 0,
        completedUsers: 0,
        watchingUsers: 0,
        totalProgress: 0,
      })
    }

    const entry = trackedByAnime.get(item.anime_id)
    entry.engagedUsers += 1
    entry.totalProgress += item.ep_progress ?? 0
    if (item.status === 'completed') entry.completedUsers += 1
    if (item.status === 'watching') entry.watchingUsers += 1
  }

  const topContent = [...trackedByAnime.values()]
    .map(entry => {
      const anime = animeById.get(entry.animeId)
      return {
        id: entry.animeId,
        title: anime?.title ?? `Anime #${entry.animeId}`,
        views: entry.engagedUsers,
        reply_count: entry.totalProgress,
        completedUsers: entry.completedUsers,
        watchingUsers: entry.watchingUsers,
        totalEpisodes: anime?.eps ?? null,
        source: 'tracking',
      }
    })
    .sort((a, b) => sortByNumericFieldsDesc(a, b, ['views', 'reply_count', 'completedUsers']))
    .slice(0, 5)

  return {
    totalUsers,
    activeUsers,
    premiumUsers,
    bannedUsers,
    topContent,
    recentErrors: recentErrors.error ? [] : recentErrors.data ?? [],
  }
}

const PAGE_SIZE = 20

export async function fetchUsers({ query = '', page = 0, activeOnly = false } = {}) {
  if (!supabase) return { data: [], count: 0 }
  let q = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, avatar_grad, is_premium, is_banned, updated_at', { count: 'exact' })
    .order('updated_at', { ascending: false, nullsFirst: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  if (activeOnly) q = q.eq('is_banned', false)
  if (query.trim())
    q = q.or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
  const { data, count, error } = await q
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}
