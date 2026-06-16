import { useState, useEffect } from 'react'
import { fetchTmdbPoster, fetchTmdbBackdrop, TMDB_ENABLED } from '../services/tmdb'

// Resolves a TMDB image for an item, falling back to the item's existing image
// while TMDB loads or when there's no match. `kind` is 'poster' | 'backdrop'.
// Returns a single URL ready for <img src>. Uses the cheap search-only path.
export function useTmdbImage(item, kind = 'poster', fallback) {
  const initial = fallback ?? item?.img ?? null
  const [url, setUrl] = useState(initial)

  useEffect(() => {
    setUrl(fallback ?? item?.img ?? null)
    if (!TMDB_ENABLED || !item?.id) return
    let cancelled = false
    const fetch = kind === 'backdrop'
      ? fetchTmdbBackdrop(item, 'backdrop')
      : fetchTmdbPoster(item, 'poster')
    fetch
      .then(resolved => { if (!cancelled && resolved) setUrl(resolved) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, kind])

  return url
}
