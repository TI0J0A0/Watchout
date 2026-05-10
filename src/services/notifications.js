// src/services/notifications.js
import { supabase } from './supabase'

export async function fetchNotifications(userId) {
  if (!supabase) return []
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  return data ?? []
}

export async function markRead(id) {
  if (!supabase) return
  await supabase.from('notifications').update({ read: true }).eq('id', id)
}

export async function markAllRead(userId) {
  if (!supabase) return
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
}

export async function createNotification(userId, type, title, body = null, data = {}) {
  if (!supabase) return
  await supabase.from('notifications').insert({ user_id: userId, type, title, body, data })
}

export async function hasNotificationToday(userId, animeId) {
  if (!supabase) return false
  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'new_episode')
    .contains('data', { anime_id: animeId })
    .gte('created_at', todayMidnight.toISOString())
    .limit(1)
  return (data?.length ?? 0) > 0
}

export async function hasRecentNotification(userId, type, animeId, epCount) {
  if (!supabase) return false
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .contains('data', { anime_id: animeId, ep_count: epCount })
    .limit(1)
  return (data?.length ?? 0) > 0
}
