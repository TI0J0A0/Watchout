import { useState, useEffect } from 'react'
import { fetchTmdbImages, tmdbImg, TMDB_ENABLED } from '../services/tmdb'

// Batch fetch TMDB posters for multiple items and cache them.
// Returns object keyed by item.id with TMDB poster URLs or null.
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
        const imgs = await fetchTmdbImages(item).catch(() => null)
        if (imgs?.posters?.[0]) {
          result[item.id] = tmdbImg(imgs.posters[0], 'posterXl')
        }
      }
      if (!cancelled) setPosters(prev => ({ ...prev, ...result }))
    }
    fetchAll()
    return () => { cancelled = true }
  }, [items?.map(i => i?.id).join(',')])

  return posters
}
