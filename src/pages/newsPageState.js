export const NEWS_PAGE_DEFAULT_TAB = 'trailers'

export const NEWS_PAGE_TABS = [
  { id: 'trailers', labelKey: 'news.tabTrailers' },
  { id: 'onair', labelKey: 'news.tabOnAir' },
  { id: 'upcoming', labelKey: 'news.tabUpcoming' },
]

// Auto-refresh interval for the trailers feed (30 min).
export const TRAILERS_REFRESH_MS = 30 * 60 * 1000

const SEEN_TRAILERS_KEY = 'watchout_seen_trailers'
// Trailers stay flagged "NEW" for 48h after we first see them.
const NEW_WINDOW_MS = 48 * 60 * 60 * 1000

export function readSeenTrailers(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(SEEN_TRAILERS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

// Given the current trailer list and the previously-seen map, returns the
// trailers annotated with `isNew` plus the updated seen-map to persist.
// A trailer is "new" if we've never seen it, or first saw it within NEW_WINDOW_MS.
export function annotateNewTrailers(trailers, seen = {}, now = Date.now()) {
  const nextSeen = {}
  const annotated = trailers.map(item => {
    const firstSeen = seen[item.id] ?? now
    nextSeen[item.id] = firstSeen
    return { ...item, isNew: now - firstSeen < NEW_WINDOW_MS }
  })
  // Drop stale ids that are no longer in the feed to keep storage bounded.
  return { annotated, nextSeen }
}

export function persistSeenTrailers(seen, storage = globalThis.localStorage) {
  try {
    storage?.setItem(SEEN_TRAILERS_KEY, JSON.stringify(seen))
  } catch {
    /* ignore quota / unavailable storage */
  }
}
