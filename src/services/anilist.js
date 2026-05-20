const GQL = 'https://graphql.anilist.co'
const gqlCache = new Map()
const GQL_TTL_MS = 10 * 60 * 1000

export function getAnilistHeroImages(media) {
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
