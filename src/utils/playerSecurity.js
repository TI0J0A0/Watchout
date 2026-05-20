const PLAYER_ORIGIN = 'https://megaplay.buzz'
const VALID_LANGS = new Set(['sub', 'dub'])
const VALID_QUALITIES = new Set(['auto', '1080', '720', '480'])

function positiveInteger(value) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

export function buildMegaplayEmbedUrl({ animeId, episode, lang = 'sub', quality = 'auto' }) {
  const safeAnimeId = positiveInteger(animeId)
  const safeEpisode = positiveInteger(episode)
  if (!safeAnimeId || !safeEpisode || !VALID_LANGS.has(lang) || !VALID_QUALITIES.has(quality)) return null

  const url = new URL(`/stream/mal/${safeAnimeId}/${safeEpisode}/${lang}`, PLAYER_ORIGIN)
  if (quality !== 'auto') url.searchParams.set('quality', quality)
  return url.toString()
}

export function getTrustedPlayerMessage(event, allowedOrigin = PLAYER_ORIGIN) {
  if (event?.origin !== allowedOrigin) return null
  let data = event.data
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      return null
    }
  }
  if (!data || typeof data !== 'object') return null

  if (data.type === 'watching-log') {
    return isFiniteNumber(data.duration) && data.duration > 0 && isFiniteNumber(data.currentTime) && data.currentTime >= 0
      ? data
      : null
  }
  if (data.event === 'time') {
    return isFiniteNumber(data.percent) && data.percent >= 0 && data.percent <= 1 ? data : null
  }
  return data.event === 'complete' || data.event === 'buffering' || data.type === 'buffering' ? data : null
}
