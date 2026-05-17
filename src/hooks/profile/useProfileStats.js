import { useMemo } from 'react'
import { SM } from '../../constants'
import { computeTasteProfile, personalityText } from '../../utils/tasteProfile'

const SORTS = {
  title: (a, b) => a.title.localeCompare(b.title),
  score: (a, b) => b.score - a.score,
  myscore: (a, b) => (b.userScore || 0) - (a.userScore || 0),
}

export function useProfileStats({ library, active, libF, libSort, libSearch }) {
  const animeLib = useMemo(() => library.filter(i => i.type === 'anime'), [library])

  const animeWatchedEps = useMemo(() =>
    animeLib.reduce((acc, i) =>
      acc + (i.userEp || (i.userStatus === 'completed' && i.eps ? i.eps : 0)), 0)
  , [animeLib])

  const animeWatchTimeMin = useMemo(() =>
    animeLib.reduce((acc, i) => {
      const eps = i.userEp || (i.userStatus === 'completed' && i.eps ? i.eps : 0)
      return acc + eps * (i.duration || 24)
    }, 0)
  , [animeLib])

  const animeScoredItems = useMemo(() => animeLib.filter(i => i.userScore), [animeLib])

  const animeAvgScore = animeScoredItems.length
    ? (animeScoredItems.reduce((a, i) => a + i.userScore, 0) / animeScoredItems.length).toFixed(1)
    : '—'

  const statusCounts = useMemo(() =>
    Object.fromEntries(Object.keys(SM).map(s => [s, animeLib.filter(i => i.userStatus === s).length]))
  , [animeLib])

  const watchingNow = useMemo(() => animeLib.filter(i => i.userStatus === 'watching'), [animeLib])

  const lib = useMemo(() =>
    animeLib.filter(i => libF === 'all' || i.userStatus === libF).sort(SORTS[libSort])
  , [animeLib, libF, libSort])

  const displayed = libSearch.trim()
    ? lib.filter(i => i.title.toLowerCase().includes(libSearch.toLowerCase()))
    : lib

  const topRated = useMemo(() =>
    [...animeScoredItems].sort((a, b) => b.userScore - a.userScore).slice(0, 8)
  , [animeScoredItems])

  const scoreDistrib = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => ({
      score: i + 1,
      count: animeLib.filter(it => it.userScore === i + 1).length,
    }))
  , [animeLib])

  const maxScoreCount = Math.max(...scoreDistrib.map(s => s.count), 1)

  const tasteProfile = useMemo(() => computeTasteProfile(animeLib, { minItems: 1 }), [animeLib])
  const personality = useMemo(() => personalityText(tasteProfile), [tasteProfile])

  const autoBannerAnime = useMemo(() => {
    if (!animeLib.length) return null
    const scored = [...animeScoredItems].sort((a, b) => b.userScore - a.userScore)
    return scored[0] ?? animeLib[0]
  }, [animeLib, animeScoredItems])

  const autoBannerColor = useMemo(() => {
    if (!animeLib.length) return { a: '#0A84FF', b: '#BF5AF2' }
    const colorCounts = {}
    animeLib.forEach(i => { colorCounts[i.color] = (colorCounts[i.color] || 0) + 1 })
    const top = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0][0]
    return { a: top, b: animeLib.find(i => i.color === top)?.colorB ?? top }
  }, [animeLib])

  const pinnedAnime = useMemo(() =>
    active.pinnedAnimeId ? (animeLib.find(i => i.id === active.pinnedAnimeId) ?? null) : null
  , [animeLib, active.pinnedAnimeId])

  return {
    animeLib,
    animeWatchedEps,
    animeWatchTimeMin,
    animeScoredItems,
    animeAvgScore,
    statusCounts,
    watchingNow,
    displayed,
    topRated,
    scoreDistrib,
    maxScoreCount,
    tasteProfile,
    personality,
    autoBannerAnime,
    autoBannerColor,
    pinnedAnime,
  }
}
