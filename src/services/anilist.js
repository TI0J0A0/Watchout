import { CARD_PALETTES as PALETTES } from '../constants/index.js'

const GQL = 'https://graphql.anilist.co'
const gqlCache = new Map()
const GQL_TTL_MS = 10 * 60 * 1000

function getAnilistHeroImages(media) {
  return {
    bannerImage: media?.bannerImage ?? null,
    coverImage: media?.coverImage?.extraLarge ?? null,
  }
}

async function gql(query, variables = {}) {
  const key = JSON.stringify({ query, variables })
  const cached = gqlCache.get(key)
  if (cached?.expiresAt > Date.now()) return cached.value
  if (cached?.promise) return cached.promise

  const promise = (async () => {
  try {
    const res = await fetch(GQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const value = json?.data ?? null
    gqlCache.set(key, { value, expiresAt: Date.now() + GQL_TTL_MS })
    return value
  } catch {
    return null
  } finally {
    const current = gqlCache.get(key)
    if (current?.promise) gqlCache.delete(key)
  }
  })()

  gqlCache.set(key, { promise, expiresAt: Date.now() + GQL_TTL_MS })
  return promise
}

export async function fetchAnilistData(malId) {
  const data = await gql(`
    query($malId: Int) {
      Media(idMal: $malId, type: ANIME) {
        id
        episodes
        duration
        streamingEpisodes { title thumbnail }
        airingSchedule { nodes { episode airingAt } }
      }
    }
  `, { malId })
  const media = data?.Media
  if (!media?.id) return null
  return {
    anilistId:         media.id,
    episodes:          media.episodes ?? null,
    duration:          media.duration ?? null,
    streamingEpisodes: media.streamingEpisodes ?? [],
    airingSchedule:    media.airingSchedule?.nodes ?? [],
  }
}

// Returns { bannerImage, characters[] } — used in AnimePage
export async function fetchAnilistBanner(malId) {
  const data = await gql(`
    query($malId: Int) {
      Media(idMal: $malId, type: ANIME) {
        bannerImage
        characters(sort: FAVOURITES_DESC, perPage: 16) {
          edges {
            role
            node { name { full } image { large } }
            voiceActors(language: JAPANESE) { name { full } image { large } }
          }
        }
      }
    }
  `, { malId })
  const media = data?.Media
  if (!media) return { bannerImage: null, characters: [] }
  return {
    bannerImage: media.bannerImage ?? null,
    characters: (media.characters?.edges ?? []).map(e => ({
      name:  e.node.name.full,
      img:   e.node.image.large,
      role:  e.role === 'MAIN' ? 'Main' : 'Supporting',
      va:    e.voiceActors[0]?.name.full   ?? '',
      vaImg: e.voiceActors[0]?.image.large ?? '',
    })),
  }
}

// Lightweight — only bannerImage, used in SeasonalPage / ProfilePage
export async function fetchAnilistBannerOnly(malId) {
  const images = await fetchAnilistHeroImages(malId)
  return images.bannerImage ?? images.coverImage ?? null
}

export async function fetchAnilistHeroImages(malId) {
  const data = await gql(`
    query($malId: Int) {
      Media(idMal: $malId, type: ANIME) {
        bannerImage
        coverImage { extraLarge }
      }
    }
  `, { malId })
  return getAnilistHeroImages(data?.Media)
}

// ── Latest trailers ─────────────────────────────────────────────────────────
// Pulls currently-releasing + upcoming anime that have a YouTube trailer,
// ordered by trending so freshly-dropped PVs surface first.

function trailerEmbedUrl(trailer) {
  if (!trailer?.id) return null
  if (trailer.site === 'youtube') return `https://www.youtube.com/embed/${trailer.id}`
  if (trailer.site === 'dailymotion') return `https://www.dailymotion.com/embed/video/${trailer.id}`
  return null
}

function mapTrailerMedia(m) {
  const embed = trailerEmbedUrl(m.trailer)
  if (!embed) return null
  const [color, colorB] = PALETTES[(m.idMal ?? m.id) % PALETTES.length]
  return {
    id:        m.idMal ?? m.id,
    anilistId: m.id,
    title:     m.title?.english || m.title?.romaji || 'Untitled',
    studio:    m.studios?.nodes?.[0]?.name || '—',
    year:      m.startDate?.year || new Date().getFullYear(),
    genres:    m.genres ?? [],
    score:     m.averageScore ? (m.averageScore / 10) : 0,
    status:    m.status,
    img:       m.trailer?.thumbnail || m.coverImage?.extraLarge || m.coverImage?.large || '',
    color, colorB,
    trailer:   embed,
  }
}

export async function fetchLatestTrailers({ perPage = 40 } = {}) {
  const data = await gql(`
    query($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, sort: [TRENDING_DESC], status_in: [RELEASING, NOT_YET_RELEASED]) {
          id
          idMal
          status
          title { english romaji }
          startDate { year }
          genres
          averageScore
          studios(isMain: true) { nodes { name } }
          coverImage { extraLarge large }
          trailer { id site thumbnail }
        }
      }
    }
  `, { perPage })
  const media = data?.Page?.media ?? []
  const seen = new Set()
  return media
    .map(mapTrailerMedia)
    .filter(item => {
      if (!item || seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
}

// Character search for avatar picker — pass null/empty for global popular
export async function searchAnilistCharacters(search) {
  const data = await gql(`
    query($search: String) {
      Page(perPage: 16) {
        characters(search: $search, sort: FAVOURITES_DESC) {
          id name { full } image { large }
        }
      }
    }
  `, search ? { search } : {})
  return data?.Page?.characters ?? []
}
