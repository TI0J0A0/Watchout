export function normalizeRecentSearchResults(items = [], limit = 8) {
  const seen = new Set()
  return items
    .filter(item => item && Number.isFinite(Number(item.id)) && item.title)
    .map(item => ({
      id: Number(item.id),
      title: item.title,
      img: item.img || '',
      score: item.score || 0,
      year: item.year || '',
      type: item.type || 'anime',
      color: item.color || '#0A84FF',
      colorB: item.colorB || '#5AC8FA',
    }))
    .filter(item => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    .slice(0, limit)
}

export function addRecentSearchResult(current = [], item, limit = 8) {
  return normalizeRecentSearchResults([item, ...current.filter(existing => Number(existing.id) !== Number(item?.id))], limit)
}
