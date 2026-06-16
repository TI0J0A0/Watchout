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

// ── id mapping cache (mal id → { id, mediaType, poster, backdrop } | null) ───
// v2: the cached value now also carries the poster/backdrop paths pulled from
// the search result, so cards render without a second /images request. The key
// is versioned so old (poster-less) caches are rebuilt instead of read stale.
const MAP_KEY = 'watchout_tmdb_map_v2'
function loadMap() {
  try { return JSON.parse(localStorage.getItem(MAP_KEY) || '{}') } catch { return {} }
}
function saveMap(m) {
  try { localStorage.setItem(MAP_KEY, JSON.stringify(m)) } catch {}
}

async function searchHit(kind, q, extra = '') {
  const data = await tget(`/search/${kind}?query=${q}${extra}&include_adult=false`)
  return data?.results?.[0] ?? null
}

// Resolve an app item (mapped from Jikan) to a TMDB reference, cached by mal id.
// Returns { id, mediaType: 'tv' | 'movie', poster, backdrop } or null.
//
// Matching is forgiving on purpose: Jikan's per-season year and English title
// often differ from TMDB's, so we try the precise (title+year) query first,
// then fall back to title-only and finally the romaji title before giving up.
export async function resolveTmdb(item) {
  if (!PROXY || !item?.id) return null
  const map = loadMap()
  const key = String(item.id)
  if (key in map) return map[key]

  const isMovie = item.type === 'film'
  const kind = isMovie ? 'movie' : 'tv'
  const yearParam = isMovie ? 'year' : 'first_air_date_year'
  const title = item.title || item.titleRomaji || ''
  if (!title) return null
  const q = encodeURIComponent(title)

  let hit = item.year ? await searchHit(kind, q, `&${yearParam}=${item.year}`) : null
  if (!hit) hit = await searchHit(kind, q)
  if (!hit && item.titleRomaji && item.titleRomaji !== title) {
    hit = await searchHit(kind, encodeURIComponent(item.titleRomaji))
  }

  const result = hit
    ? { id: hit.id, mediaType: kind, poster: hit.poster_path ?? null, backdrop: hit.backdrop_path ?? null }
    : null
  map[key] = result
  saveMap(map)
  return result
}

// Poster URL straight from the cached search match — no extra /images call.
// This is the cheap path used by the grids/cards.
export async function fetchTmdbPoster(item, kind = 'posterXl') {
  const ref = await resolveTmdb(item)
  return ref?.poster ? tmdbImg(ref.poster, kind) : null
}

// Backdrop URL from the cached search match, same cheap path.
export async function fetchTmdbBackdrop(item, kind = 'backdrop') {
  const ref = await resolveTmdb(item)
  return ref?.backdrop ? tmdbImg(ref.backdrop, kind) : null
}

// All artwork for an item: poster/backdrop/logo file paths (not full URLs).
// Used by the detail page gallery. The language-filtered /images list can come
// back empty for some titles, so we always seed it with the primary poster /
// backdrop from the search match — guaranteeing at least one of each when TMDB
// has any artwork at all.
export async function fetchTmdbImages(item) {
  const ref = await resolveTmdb(item)
  if (!ref) return null
  const data = await tget(`/${ref.mediaType}/${ref.id}/images?include_image_language=en,ja,null`)
  const paths = arr => (arr ?? []).map(x => x.file_path).filter(Boolean)
  const dedupe = arr => [...new Set(arr.filter(Boolean))]
  return {
    ref,
    posters:   dedupe([ref.poster,   ...paths(data?.posters)]),
    backdrops: dedupe([ref.backdrop, ...paths(data?.backdrops)]),
    logos:     paths(data?.logos),
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
