export function getRecentNotificationCutoff(now = new Date(), hours = 5) {
  const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000)
  return cutoff.toISOString()
}

export function getNotificationAnimeId(notification) {
  const raw = notification?.data?.anime_id ?? notification?.data?.animeId
  const id = Number(raw)
  return Number.isFinite(id) ? id : null
}
