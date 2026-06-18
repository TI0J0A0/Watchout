import { createCachedJsonFetcher } from '../utils/apiCache.js'
import { GENRES } from '../constants/browse.js'
import { CARD_PALETTES as PALETTES } from '../constants/index.js'

const BASE = "https://api.jikan.moe/v4";
const cachedGet = createCachedJsonFetcher({ ttlMs: 5 * 60 * 1000 })

const DAY_KEY = {
  Mondays:"Mon", Tuesdays:"Tue", Wednesdays:"Wed",
  Thursdays:"Thu", Fridays:"Fri", Saturdays:"Sat", Sundays:"Sun",
};

const GENRE_PT = {
  Action:"Ação", Adventure:"Aventura", Comedy:"Comédia", Drama:"Drama",
  Fantasy:"Fantasia", Horror:"Terror", Mystery:"Mistério", Romance:"Romance",
  "Sci-Fi":"Ficção Científica", "Slice of Life":"Slice of Life",
  Sports:"Esportes", Thriller:"Suspense", Supernatural:"Sobrenatural",
  "Martial Arts":"Artes Marciais", Psychological:"Psicológico",
  Mecha:"Mecha", Music:"Musical", Historical:"Histórico",
  "School":"Escola", Military:"Militar",
};

const MAIN_STREAMING_PROVIDERS = new Map([
  ['crunchyroll', 'Crunchyroll'],
  ['netflix', 'Netflix'],
  ['prime video', 'Prime Video'],
  ['amazon prime video', 'Prime Video'],
  ['amazon video', 'Prime Video'],
  ['disney+', 'Disney+'],
  ['disney plus', 'Disney+'],
  ['hulu', 'Hulu'],
  ['max', 'Max'],
  ['hidive', 'HIDIVE'],
  ['apple tv', 'Apple TV'],
  ['apple tv+', 'Apple TV'],
  ['youtube', 'YouTube'],
])

function parseDuration(str) {
  if (!str) return 24;
  const hr  = str.match(/(\d+)\s*hr/);
  const min = str.match(/(\d+)\s*min/);
  return (hr ? parseInt(hr[1]) * 60 : 0) + (min ? parseInt(min[1]) : 0) || 24;
}

function mapStreaming(streaming = []) {
  return streaming
    .filter(s => s && typeof s.name === 'string' && s.name.trim())
    .map(s => {
      const canonicalName = MAIN_STREAMING_PROVIDERS.get(s.name.trim().toLowerCase())
      if (!canonicalName) return null
      return {
        name: canonicalName,
        url: typeof s.url === 'string' ? s.url : '',
      }
    })
    .filter(Boolean)
}

function findOfficialSite(external = []) {
  const site = (external || []).find(e => /official\s*site/i.test(e?.name || ''))
  return typeof site?.url === 'string' ? site.url : null
}

// Jikan list endpoints (e.g. /seasons/now, /anime?...) can return the same
// entry more than once, which breaks React keys downstream — always
// de-duplicate by id, keeping the first occurrence.
function dedupeById(items) {
  const seen = new Set()
  return items.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true })
}

export function mapAnime(a) {
  const [color, colorB] = PALETTES[a.mal_id % PALETTES.length];
  return {
    id:       a.mal_id,
    title:    a.title_english || a.title,
    titleRomaji: a.title || null,
    titleJp:  a.title_japanese || null,
    score:    a.score || 0,
    eps:      a.episodes || null,
    type:     a.type === "Movie" ? "film" : "anime",
    format:   a.type || null,          // raw: TV / Movie / OVA / ONA / Special
    studio:   a.studios?.[0]?.name || "—",
    year:     a.year || new Date().getFullYear(),
    season:   a.season ? a.season.charAt(0).toUpperCase() + a.season.slice(1) : null,
    rating:   a.rating || null,
    source:   a.source || null,
    genres:   (a.genres || []).map(g => GENRE_PT[g.name] || g.name),
    airing:      a.status === "Currently Airing",
    comingSoon:  a.status === "Not yet aired",
    status:   a.status || null,        // raw status string
    airDay:   DAY_KEY[a.broadcast?.day] || null,
    startDate: a.aired?.from || null,
    endDate:   a.aired?.to || null,
    duration: parseDuration(a.duration),
    color, colorB,
    img:      a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || "",
    synopsis: a.synopsis || "",
    streaming: mapStreaming(a.streaming),
    members:  a.members || 0,
    trailer:  a.trailer?.embed_url ?? null,
    officialSite: findOfficialSite(a.external),
    userStatus: null, userScore: null, userEp: 0, userNotes: "",
  };
}

async function get(path, { fresh = false } = {}) {
  return cachedGet(`${BASE}${path}`, fresh ? { forceRefresh: true } : undefined)
}

export async function fetchSeasonal() {
  const { data } = await get("/seasons/now?limit=24");
  return dedupeById(data.map(mapAnime));
}

export async function fetchTop() {
  const { data } = await get("/top/anime?limit=25");
  return dedupeById(data.map(mapAnime)).map((a, i) => ({ ...a, rank: i + 1 }));
}

export async function searchAnime(query) {
  const { data } = await get(`/anime?q=${encodeURIComponent(query)}&limit=20&sfw=true`);
  return dedupeById(data.map(mapAnime));
}

export async function fetchPopular({ fresh = false } = {}) {
  const { data } = await get('/anime?status=airing&order_by=members&sort=desc&limit=15&sfw=true', { fresh });
  return dedupeById(data.map(mapAnime));
}

export async function fetchUpcoming({ fresh = false } = {}) {
  const { data } = await get('/seasons/upcoming?limit=15', { fresh });
  return dedupeById(data.map(mapAnime));
}

export async function fetchByGenre(genreId, limit = 15, { fresh = false } = {}) {
  const { data } = await get(
    `/anime?genres=${genreId}&order_by=score&sort=desc&limit=${limit}&sfw=true&type=tv`,
    { fresh }
  );
  return dedupeById(data.map(mapAnime));
}

// Fallback trailer feed (used when AniList is unavailable): current + upcoming
// season anime that ship a trailer, de-duplicated and shaped like the AniList feed.
export async function fetchSeasonalTrailers() {
  const [nowRes, soonRes] = await Promise.allSettled([
    get('/seasons/now?limit=24'),
    get('/seasons/upcoming?limit=24'),
  ])
  const raw = []
  if (nowRes.status === 'fulfilled') raw.push(...(nowRes.value.data ?? []))
  if (soonRes.status === 'fulfilled') raw.push(...(soonRes.value.data ?? []))
  return dedupeById(
    raw.map(a => ({
      ...mapAnime(a),
      status: a.status === 'Not yet aired' ? 'NOT_YET_RELEASED' : 'RELEASING',
    }))
  ).filter(a => a.trailer)
}

export async function fetchSeasonArchive(year, season) {
  const { data } = await get(`/seasons/${year}/${season}?limit=24`)
  return dedupeById(data.map(mapAnime))
}

// Paginated season browse for the Seasons page. Returns the mapped items plus
// pagination flags so the UI can render page controls.
export async function fetchSeasonPage(year, season, page = 1) {
  const res = await get(`/seasons/${year}/${season}?limit=24&page=${page}`)
  const items = dedupeById((res.data ?? []).map(mapAnime))
  return {
    items,
    hasNext:  res.pagination?.has_next_page ?? false,
    lastPage: res.pagination?.last_visible_page ?? page,
  }
}


export async function fetchCharacters(id) {
  const { data } = await get(`/anime/${id}/characters`)
  return data.slice(0, 16).map(c => ({
    name:  c.character.name,
    img:   c.character.images?.jpg?.image_url || '',
    role:  c.role,
    va:    c.voice_actors?.find(v => v.language === 'Japanese')?.person?.name || '',
    vaImg: c.voice_actors?.find(v => v.language === 'Japanese')?.person?.images?.jpg?.image_url || '',
  }))
}

export async function fetchAnimeById(id) {
  const { data } = await get(`/anime/${id}/full`)
  return mapAnime(data)
}

// Episode list (number, title, airdate). Used as a fallback source for the
// watch panel when AniList is unavailable. Jikan only lists already-aired
// episodes and provides no thumbnails.
export async function fetchAnimeEpisodes(id) {
  const { data } = await get(`/anime/${id}/episodes`)
  return (data ?? []).map(ep => ({
    number:  ep.mal_id,
    title:   ep.title ?? null,
    airdate: ep.aired ? ep.aired.split('T')[0] : null,
  }))
}

// Gallery of official poster/promotional images for the Artwork tab.
export async function fetchAnimePictures(id) {
  const { data } = await get(`/anime/${id}/pictures`)
  return (data ?? [])
    .map(p => p.jpg?.large_image_url || p.jpg?.image_url || p.webp?.large_image_url || null)
    .filter(Boolean)
}

export async function fetchRelations(id) {
  const { data } = await get(`/anime/${id}/relations`)
  const related = []
  for (const rel of (data ?? [])) {
    if (rel.relation !== 'Sequel' && rel.relation !== 'Prequel') continue
    for (const entry of (rel.entry ?? [])) {
      if (entry.type === 'anime') related.push({ relation: rel.relation, malId: entry.mal_id, name: entry.name })
    }
  }
  return related
}

// Map a display genre name (English or the Portuguese aliases from GENRE_PT)
// back to a Jikan genre id so we can pull candidates for that genre.
const GENRE_ID_BY_EN = Object.fromEntries(GENRES.map(g => [g.name, g.id]))
const EN_BY_PT = Object.fromEntries(Object.entries(GENRE_PT).map(([en, pt]) => [pt, en]))

function genreIdFromName(name) {
  if (!name) return null
  const en = EN_BY_PT[name] || name
  return GENRE_ID_BY_EN[en] ?? null
}

// Build a personalized candidate pool from the user's favourite genres so the
// "For You" shelf can rank against a real catalogue instead of only the ~24
// current-season titles. Returns top-scored TV anime, de-duplicated.
export async function fetchCandidatesByGenres(genreNames = [], { perGenre = 25, fresh = false } = {}) {
  const ids = [...new Set(genreNames.map(genreIdFromName).filter(Boolean))]
  if (!ids.length) return []
  const results = await Promise.allSettled(
    ids.map(id => fetchByGenre(id, perGenre, { fresh }))
  )
  const seen = new Set()
  const out = []
  for (const r of results) {
    if (r.status !== 'fulfilled') continue
    for (const a of r.value) {
      if (seen.has(a.id)) continue
      seen.add(a.id)
      out.push(a)
    }
  }
  return out
}

export async function fetchRecommendations(id) {
  const { data } = await get(`/anime/${id}/recommendations`);
  return dedupeById(data.map(r => {
    const a = r.entry;
    const [color, colorB] = PALETTES[a.mal_id % PALETTES.length];
    return {
      id:    a.mal_id,
      title: a.title,
      img:   a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || "",
      score: 0, eps: null, type: "anime", studio: "—", year: "",
      genres: [], airing: false, airDay: null, duration: 24,
      color, colorB, synopsis: "", streaming: [], members: 0, trailer: null,
      userStatus: null, userScore: null, userEp: 0, userNotes: "",
    };
  })).slice(0, 10);
}
