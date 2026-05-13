export function getHeroBadge(item) {
  return item?.airing ? 'ON AIR' : 'TRENDING'
}

export function getHeroMeta(item) {
  const rating = item?.rating?.match(/(\d+\+)/)?.[1] ?? '16+'
  const streaming = item?.streaming?.length ? item.streaming.slice(0, 2).join(' | ') : 'Sub | Dub'
  const genres = item?.genres?.length ? item.genres.slice(0, 2).join(', ') : 'Anime'
  return `${rating} • ${streaming} • ${genres}`
}

export function getHeroCta(item, translateStatus = status => status) {
  return {
    primaryLabel: 'Watch Now',
    secondaryLabel: item?.userStatus ? translateStatus(item.userStatus) : 'Add to List',
    canAdd: !item?.userStatus,
  }
}

export function getHeroImage(item, bannerUrl, kitsuCoverUrl, trailerThumbUrl) {
  return bannerUrl || kitsuCoverUrl || trailerThumbUrl || item?.img || null
}

export function getCarouselIndex(current, total, direction) {
  if (!total) return 0
  return (current + direction + total) % total
}
