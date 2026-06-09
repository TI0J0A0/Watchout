import { fetchAnilistData } from './anilist'
import { fetchAnimeEpisodes } from './jikan'

function parseEpNum(title) {
  const m = title?.match(/Episode\s+(\d+)/i)
  return m ? parseInt(m[1]) : null
}

// Loads episode metadata for the watch panel as a normalized
// { episodes, duration, epMap } object. AniList is the primary source
// (thumbnails + titles); when it's unavailable (e.g. the API is disabled) we
// fall back to Jikan so the episode list still renders — just without
// thumbnails. Returns null only when both sources have nothing.
export async function fetchWatchEpisodes(item) {
  const anilist = await fetchAnilistData(item.id)
  if (anilist) {
    const epMap = {}
    // Episode thumbnails + titles, keyed by the number parsed from the title.
    anilist.streamingEpisodes.forEach(ep => {
      const num = parseEpNum(ep.title)
      if (num) epMap[num] = { thumbnail: ep.thumbnail ?? null, title: ep.title ?? null, airdate: null }
    })
    // Airdates from the airing schedule (Unix timestamp → YYYY-MM-DD).
    anilist.airingSchedule.forEach(({ episode, airingAt }) => {
      const airdate = new Date(airingAt * 1000).toISOString().split('T')[0]
      if (epMap[episode]) epMap[episode].airdate = airdate
      else epMap[episode] = { thumbnail: null, title: null, airdate }
    })
    return { episodes: anilist.episodes, duration: anilist.duration, epMap }
  }

  // Fallback: Jikan (titles + airdates, no thumbnails).
  try {
    const eps = await fetchAnimeEpisodes(item.id)
    if (!eps.length && !item.eps) return null
    const epMap = {}
    eps.forEach(ep => {
      epMap[ep.number] = { thumbnail: null, title: ep.title, airdate: ep.airdate }
    })
    return {
      episodes: item.eps ?? (eps.length || null),
      duration: item.duration ?? null,
      epMap,
    }
  } catch {
    return null
  }
}
