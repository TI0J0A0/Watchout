import { supabase } from './supabase'

export async function searchAnimeByName(query) {
  if (!supabase || !query.trim()) return []
  const body = { route: 'animeSearch', query: query.trim() }

  const attempts = ['anikoto', 'clever-handler']
  let lastError = null

  for (const fnName of attempts) {
    const { data, error } = await supabase.functions.invoke(fnName, { body })
    if (!error) return data?.items ?? []
    lastError = error
  }

  throw lastError ?? new Error('Anime search failed')
}
