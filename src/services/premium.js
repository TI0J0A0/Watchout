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

export async function adminSearchUsers(query) {
  if (!supabase || !query) return []
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, avatar_grad, is_premium')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(10)
  return data ?? []
}

export async function getAnilistData(malId) {
  if (!supabase || !malId) return null
  const { data, error } = await supabase.functions.invoke('clever-handler', {
    body: { route: 'anilist', malId },
  })
  if (error || !data?.anilistId) return null
  return { anilistId: data.anilistId, episodes: data.episodes ?? null }
}
