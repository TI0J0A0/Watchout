import { supabase } from './supabase'

const SELECT_FIELDS = 'id, anime_id, image_url, hide_title, active, sort_order, created_at'

export async function fetchHeroEntries({ activeOnly = false } = {}) {
  if (!supabase) return []
  let query = supabase
    .from('hero_entries')
    .select(SELECT_FIELDS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (activeOnly) query = query.eq('active', true)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function createHeroEntry(entry) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('hero_entries')
    .insert({
      anime_id: entry.animeId,
      image_url: entry.imageUrl,
      hide_title: entry.hideTitle,
      active: entry.active,
      sort_order: entry.sortOrder,
    })
    .select(SELECT_FIELDS)
    .single()
  if (error) throw error
  return data
}

export async function updateHeroEntry(id, patch) {
  if (!supabase) return null
  const payload = {}
  if ('animeId' in patch) payload.anime_id = patch.animeId
  if ('imageUrl' in patch) payload.image_url = patch.imageUrl
  if ('hideTitle' in patch) payload.hide_title = patch.hideTitle
  if ('active' in patch) payload.active = patch.active
  if ('sortOrder' in patch) payload.sort_order = patch.sortOrder

  const { data, error } = await supabase
    .from('hero_entries')
    .update(payload)
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single()
  if (error) throw error
  return data
}

export async function deleteHeroEntry(id) {
  if (!supabase) return
  const { error } = await supabase.from('hero_entries').delete().eq('id', id)
  if (error) throw error
}
