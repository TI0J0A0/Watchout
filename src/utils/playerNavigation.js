export function getNextAiredEpisode(activeEpisode, airedEpisodes = []) {
  if (activeEpisode === null || activeEpisode === undefined) return null
  return airedEpisodes.find(ep => ep > activeEpisode) ?? null
}

export function shouldShowNextEpisodeButton({ progressRatio, nextEpisode }) {
  return Boolean(nextEpisode) && progressRatio >= 0.9
}
