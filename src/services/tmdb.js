// TMDB image layer.
//
// Architecture:
//  - The API KEY never reaches the browser. The frontend talks to a thin proxy
//    on your VPS (VITE_TMDB_PROXY_URL) that forwards to api.themoviedb.org and
//    injects the key server-side. See TMDB_PROXY.md for the proxy contract.
//  - Actual image files come straight from TMDB's public CDN (image.tmdb.org),
//    which needs no key — so <img src> uses those URLs directly.
//  - TMDB has no MAL/AniList id. We resolve a title+year search to a TMDB id and
//    cache that mapping (incl. negative results) in localStorage to avoid
//    re-searching. Everything degrades gracefully: if the proxy is unset or a
//    match isn't found, callers fall back to their existing image source.

const PROXY = (import.meta.env.VITE_TMDB_PROXY_URL || '').replace(/\/$/, '')
export const TMDB_ENABLED = !!PROXY

const IMG_BASE = 'https://image.tmdb.org/t/p'
const SIZES = {
  poster:   'w500',
  posterXl: 'original',
  backdrop: 'w1280',
  still:    'w780',
  logo:     'w500',
}

export function tmdbImg(path, kind = 'poster') {
  if (!path) return null
  return `${IMG_BASE}/${SIZES[kind] ?? 'original'}${path}`
}

// ── API calls (proxied) ──────────────────────────────────────────────────────
const mem = new Map()
async function tget(path) {
  if (!PROXY) return null
  if (mem.has(path)) return mem.get(path)
  const p = fetch(`${PROXY}${path}`, { headers: { Accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : null))
    .catch(() => null)
  mem.set(path, p)
  return p
}

// ── id mapping cache (mal id → { id, mediaType } | null) ─────────────────────
const MAP_KEY = 'watchout_tmdb_map'
function loadMap() {
  try { return JSON.parse(localStorage.getItem(MAP_KEY) || '{}') } catch { return {} }
}
function saveMap(m) {
  try { localStorage.setItem(MAP_KEY, JSON.stringify(m)) } catch {}
}

// Resolve an app item (mapped from Jikan) to a TMDB reference, cached by mal id.
// Returns { id, mediaType: 'tv' | 'movie' } or null when no confident match.
export async function resolveTmdb(item) {
  if (!PROXY || !item?.id) return null
  const map = loadMap()
  const key = String(item.id)
  if (key in map) return map[key]

  const isMovie = item.type === 'film'
  const title = item.title || item.titleRomaji || ''
  if (!title) return null
  const q = encodeURIComponent(title)
  const year = item.year
  const path = isMovie
    ? `/search/movie?query=${q}${year ? `&year=${year}` : ''}&include_adult=false`
    : `/search/tv?query=${q}${year ? `&first_air_date_year=${year}` : ''}&include_adult=false`

  const data = await tget(path)
  const hit = data?.results?.[0]
  const result = hit ? { id: hit.id, mediaType: isMovie ? 'movie' : 'tv' } : null
  map[key] = result
  saveMap(map)
  return result
}

// All artwork for an item: poster/backdrop/logo file paths (not full URLs).
export async function fetchTmdbImages(item) {
  const ref = await resolveTmdb(item)
  if (!ref) return null
  const data = await tget(`/${ref.mediaType}/${ref.id}/images?include_image_language=en,ja,null`)
  if (!data) return null
  const paths = arr => (arr ?? []).map(x => x.file_path).filter(Boolean)
  return {
    ref,
    posters:   paths(data.posters),
    backdrops: paths(data.backdrops),
    logos:     paths(data.logos),
  }
}

// Best-effort episode still. Anime episode numbering rarely matches TMDB's
// season/episode split, so this is a best-effort lookup against season 1; the
// caller should fall back (AniList still → poster) when it returns null.
export async function fetchTmdbEpisodeStill(item, epNumber) {
  const ref = await resolveTmdb(item)
  if (!ref || ref.mediaType !== 'tv' || !epNumber) return null
  const data = await tget(`/tv/${ref.id}/season/1/episode/${epNumber}/images`)
  const still = data?.stills?.[0]?.file_path
  return still ? tmdbImg(still, 'still') : null
}
