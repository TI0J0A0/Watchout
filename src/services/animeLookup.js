import { supabase } from './supabase'

export async function searchAnimeByName(query) {
  if (!supabase || !query.trim()) return []
  const { data, error } = await supabase.functions.invoke('anikoto', {
    body: { route: 'animeSearch', query: query.trim() },
  })
  if (error) throw error
  return data?.items ?? []
}
