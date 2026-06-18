const KITSU = 'https://kitsu.io/api/edge'
const coverCache = new Map()
const COVER_TTL_MS = 30 * 60 * 1000

function getKitsuCoverImage(anime) {
  const cover = anime?.attributes?.coverImage
  const poster = anime?.attributes?.posterImage
  return cover?.original || cover?.large || cover?.small || cover?.tiny ||
    poster?.original || poster?.large || poster?.small || poster?.tiny || null
}

export async function fetchKitsuCoverByMalId(malId) {
  if (!malId) return null
  const cached = coverCache.get(malId)
  if (cached?.expiresAt > Date.now()) return cached.value
  if (cached?.promise) return cached.promise

  const promise = (async () => {
  try {
    const url = `${KITSU}/anime?filter[externalId]=${encodeURIComponent(malId)}&filter[externalSite]=myanimelist/anime&page[limit]=1`
    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.api+json' },
    })
    if (!res.ok) return null
    const json = await res.json()
    const value = getKitsuCoverImage(json?.data?.[0])
    coverCache.set(malId, { value, expiresAt: Date.now() + COVER_TTL_MS })
    return value
  } catch {
    return null
  } finally {
    const current = coverCache.get(malId)
    if (current?.promise) coverCache.delete(malId)
  }
  })()

  coverCache.set(malId, { promise, expiresAt: Date.now() + COVER_TTL_MS })
  return promise
}
