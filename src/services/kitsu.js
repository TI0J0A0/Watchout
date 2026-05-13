const KITSU = 'https://kitsu.io/api/edge'

export function getKitsuCoverImage(anime) {
  const cover = anime?.attributes?.coverImage
  const poster = anime?.attributes?.posterImage
  return cover?.original || cover?.large || cover?.small || cover?.tiny ||
    poster?.original || poster?.large || poster?.small || poster?.tiny || null
}

export async function fetchKitsuCoverByMalId(malId) {
  if (!malId) return null

  try {
    const url = `${KITSU}/anime?filter[externalId]=${encodeURIComponent(malId)}&filter[externalSite]=myanimelist/anime&page[limit]=1`
    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.api+json' },
    })
    if (!res.ok) return null
    const json = await res.json()
    return getKitsuCoverImage(json?.data?.[0])
  } catch {
    return null
  }
}
