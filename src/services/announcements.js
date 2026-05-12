import { supabase } from './supabase'

export async function fetchAnnouncements() {
  if (!supabase) return []
  const { data } = await supabase
    .from('system_announcements')
    .select('id, content, type, created_at')
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function createAnnouncement({ content, type }) {
  if (!supabase) return
  const { error } = await supabase
    .from('system_announcements')
    .insert({ content, type })
  if (error) throw error
}

export async function deleteAnnouncement(id) {
  if (!supabase) return
  await supabase.from('system_announcements').delete().eq('id', id)
}
