import { supabase } from './supabase'

const SELECT_FIELDS = 'id, anime_id, image_url, logo_url, hide_title, active, sort_order, created_at'
const DEFAULT_HERO_SETTINGS = { max_items: 5 }

function mapHeroEntryInput(entry) {
  return {
    anime_id: entry.animeId,
    image_url: entry.imageUrl,
    logo_url: entry.logoUrl,
    hide_title: entry.hideTitle,
    active: entry.active,
    sort_order: entry.sortOrder,
  }
}

function mapHeroEntryPatch(patch) {
  const payload = {}
  if ('animeId' in patch) payload.anime_id = patch.animeId
  if ('imageUrl' in patch) payload.image_url = patch.imageUrl
  if ('logoUrl' in patch) payload.logo_url = patch.logoUrl
  if ('hideTitle' in patch) payload.hide_title = patch.hideTitle
  if ('active' in patch) payload.active = patch.active
  if ('sortOrder' in patch) payload.sort_order = patch.sortOrder
  return payload
}

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
    .insert(mapHeroEntryInput(entry))
    .select(SELECT_FIELDS)
    .single()
  if (error) throw error
  return data
}

export async function updateHeroEntry(id, patch) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('hero_entries')
    .update(mapHeroEntryPatch(patch))
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

export async function fetchHeroSettings() {
  if (!supabase) return DEFAULT_HERO_SETTINGS
  const { data, error } = await supabase
    .from('hero_settings')
    .select('max_items')
    .eq('id', 1)
    .single()
  if (error) throw error
  return data ?? DEFAULT_HERO_SETTINGS
}

export async function updateHeroSettings({ maxItems }) {
  if (!supabase) return DEFAULT_HERO_SETTINGS
  const { data, error } = await supabase
    .from('hero_settings')
    .upsert({ id: 1, max_items: maxItems })
    .select('max_items')
    .single()
  if (error) throw error
  return data
}
