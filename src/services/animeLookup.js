import { supabase } from './supabase'
import { searchAnime } from './jikan'

// Maps a Jikan (mapAnime) result into the shape the admin hero panel expects.
function toLookupItem(a) {
  return {
    id: a.id,
    title: a.title,
    imageUrl: a.img || '',
    type: a.type === 'film' ? 'Movie' : 'Anime',
    episodes: a.eps ?? null,
    year: a.year ?? null,
    status: a.airing ? 'Currently Airing' : a.comingSoon ? 'Not yet aired' : 'Finished Airing',
    season: null,
    rating: null,
    score: a.score ?? null,
    studios: a.studio && a.studio !== '—' ? [a.studio] : [],
    genres: a.genres ?? [],
    synopsis: a.synopsis || '',
  }
}

// Direct Jikan search — used as a fallback when the edge function is
// unavailable so the admin hero search keeps working.
async function searchViaJikan(query) {
  const items = await searchAnime(query)
  return items.map(toLookupItem)
}

export async function searchAnimeByName(query) {
  if (!query.trim()) return []
  if (!supabase) return searchViaJikan(query)

  const body = { route: 'animeSearch', query: query.trim() }
  const attempts = ['anikoto', 'Anikoto', 'clever-handler']

  for (const fnName of attempts) {
    try {
      const { data, error } = await supabase.functions.invoke(fnName, { body })
      if (!error) return data?.items ?? []
    } catch {
      /* network / not-deployed — try the next name, then fall back */
    }
  }

  // Every edge-function attempt failed (e.g. not deployed / unreachable):
  // fall back to a direct Jikan search so the panel still works.
  return searchViaJikan(query)
}
