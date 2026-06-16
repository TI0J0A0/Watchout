import { useState, useEffect } from 'react'
import { fetchTmdbPoster, TMDB_ENABLED } from '../services/tmdb'

// Batch fetch TMDB posters for multiple items and cache them.
// Returns object keyed by item.id with TMDB poster URLs or null.
// Uses the cheap search-only path (no /images call) — one request per item,
// and only the first time it's seen (results are cached in localStorage).
export function useTmdbPosterBatch(items = []) {
  const [posters, setPosters] = useState({})

  useEffect(() => {
    if (!TMDB_ENABLED || !items?.length) return
    let cancelled = false
    const fetchAll = async () => {
      const result = {}
      for (const item of items) {
        if (cancelled || !item?.id) continue
        if (posters[item.id] !== undefined) {
          result[item.id] = posters[item.id]
          continue
        }
        const url = await fetchTmdbPoster(item, 'posterXl').catch(() => null)
        if (url) result[item.id] = url
      }
      if (!cancelled) setPosters(prev => ({ ...prev, ...result }))
    }
    fetchAll()
    return () => { cancelled = true }
  }, [items?.map(i => i?.id).join(',')])

  return posters
}
