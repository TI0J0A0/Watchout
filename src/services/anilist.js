const GQL = 'https://graphql.anilist.co'

async function gql(query, variables = {}) {
  try {
    const res = await fetch(GQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.data ?? null
  } catch {
    return null
  }
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
  const data = await gql(`
    query($malId: Int) { Media(idMal: $malId, type: ANIME) { bannerImage } }
  `, { malId })
  return data?.Media?.bannerImage ?? null
}

// Character search for avatar picker — pass null/empty for global popular
export async function searchAnilistCharacters(search) {
  const data = await gql(`
    query($search: String) {
      Page(perPage: 16) {
        characters(search: $search, sort: FAVOURITES_DESC) {
          nodes { id name { full } image { large } }
        }
      }
    }
  `, search ? { search } : {})
  return data?.Page?.characters?.nodes ?? []
}
