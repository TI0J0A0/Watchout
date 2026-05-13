import { supabase } from './supabase'

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

  const [
    totalUsers,
    activeUsers,
    premiumUsers,
    bannedUsers,
    topContent,
    recentErrors,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_banned', false),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_premium', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_banned', true),
    supabase
      .from('forum_topics')
      .select('id, title, views, reply_count')
      .order('views', { ascending: false })
      .limit(5),
    supabase
      .from('admin_error_logs')
      .select('id, message, source, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  for (const result of [totalUsers, activeUsers, premiumUsers, bannedUsers, topContent]) {
    if (result.error) throw result.error
  }

  return {
    totalUsers: totalUsers.count ?? 0,
    activeUsers: activeUsers.count ?? 0,
    premiumUsers: premiumUsers.count ?? 0,
    bannedUsers: bannedUsers.count ?? 0,
    topContent: topContent.data ?? [],
    recentErrors: recentErrors.error ? [] : recentErrors.data ?? [],
  }
}

const PAGE_SIZE = 20

export async function fetchUsers({ query = '', page = 0 } = {}) {
  if (!supabase) return { data: [], count: 0 }
  let q = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, avatar_grad, is_premium, is_banned, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
  if (query.trim())
    q = q.or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
  const { data, count, error } = await q
  if (error) throw error
  return { data: data ?? [], count: count ?? 0 }
}

export async function getAnilistData(malId) {
  if (!supabase || !malId) return null
  const { data, error } = await supabase.functions.invoke('clever-handler', {
    body: { route: 'anilist', malId },
  })
  if (error || !data?.anilistId) return null
  return { anilistId: data.anilistId, episodes: data.episodes ?? null }
}
