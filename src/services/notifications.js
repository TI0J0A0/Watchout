// src/services/notifications.js
import { supabase } from './supabase'
import { getRecentNotificationCutoff } from './notificationRules'

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

export async function hasRecentEpisodeNotification(userId, animeId, hours = 5) {
  if (!supabase) return false
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'new_episode')
    .contains('data', { anime_id: animeId })
    .gte('created_at', getRecentNotificationCutoff(new Date(), hours))
    .limit(1)
  return (data?.length ?? 0) > 0
}
