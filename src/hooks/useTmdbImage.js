import { useState, useEffect } from 'react'
import { fetchTmdbImages, tmdbImg, TMDB_ENABLED } from '../services/tmdb'

// Resolves a TMDB image for an item, falling back to the item's existing image
// while TMDB loads or when there's no match. `kind` is 'poster' | 'backdrop'.
// Returns a single URL ready for <img src>.
export function useTmdbImage(item, kind = 'poster', fallback) {
  const initial = fallback ?? item?.img ?? null
  const [url, setUrl] = useState(initial)

  useEffect(() => {
    setUrl(fallback ?? item?.img ?? null)
    if (!TMDB_ENABLED || !item?.id) return
    let cancelled = false
    fetchTmdbImages(item)
      .then(imgs => {
        if (cancelled || !imgs) return
        const path = kind === 'backdrop' ? imgs.backdrops[0] : imgs.posters[0]
        const resolved = tmdbImg(path, kind === 'backdrop' ? 'backdrop' : 'poster')
        if (resolved) setUrl(resolved)
      })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, kind])

  return url
}
