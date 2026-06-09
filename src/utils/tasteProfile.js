export function computeTasteProfile(library, { minItems = 3 } = {}) {
  // Only watched/watching titles build positive taste — dropped ones are a
  // negative signal (handled below), and plan_to_watch hasn't been judged yet.
  const active = library.filter(a => a.userStatus === 'watching' || a.userStatus === 'completed')
  if (active.length < minItems) return null

  const genreCounts = {}, studioCounts = {}, genreMinutes = {}, genreScores = {}

  active.forEach(anime => {
    const minutes = (anime.userEp || 0) * (anime.duration || 24)
    ;(anime.genres || []).forEach(g => {
      genreCounts[g] = (genreCounts[g] || 0) + 1
      genreMinutes[g] = (genreMinutes[g] || 0) + minutes
      if (anime.userScore) {
        genreScores[g] = genreScores[g] || { sum: 0, count: 0 }
        genreScores[g].sum += anime.userScore
        genreScores[g].count++
      }
    })
    if (anime.studio && anime.studio !== '—')
      studioCounts[anime.studio] = (studioCounts[anime.studio] || 0) + 1
  })

  const total = Object.values(genreCounts).reduce((s, c) => s + c, 0)
  const weights = {}
  Object.entries(genreCounts).forEach(([g, c]) => { weights[g] = c / total })

  const avgScoreByGenre = {}
  Object.entries(genreScores).forEach(([g, { sum, count }]) => {
    avgScoreByGenre[g] = +(sum / count).toFixed(1)
  })

  const topGenres = Object.entries(weights).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([g]) => g)

  // Genres the user repeatedly drops (≥2 times) and doesn't otherwise love
  // become a dislike signal that penalizes candidates in matchScore.
  const droppedGenreCounts = {}
  library
    .filter(a => a.userStatus === 'dropped')
    .forEach(a => (a.genres || []).forEach(g => {
      droppedGenreCounts[g] = (droppedGenreCounts[g] || 0) + 1
    }))
  const dislikedGenres = Object.entries(droppedGenreCounts)
    .filter(([g, c]) => c >= 2 && !topGenres.includes(g))
    .map(([g]) => g)

  return {
    weights,
    topGenres,
    topStudios: Object.entries(studioCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s),
    genreMinutes,
    avgScoreByGenre,
    genreCounts,
    dislikedGenres,
    totalActive: active.length,
  }
}

export function matchScore(anime, profile) {
  if (!profile || !anime.genres?.length) return null
  // Base affinity: how much of the anime's genres overlap the user's weights,
  // boosted for genres they rate highly and dampened for ones they rate low.
  const raw = anime.genres.reduce((sum, g) => {
    const avg = profile.avgScoreByGenre[g]
    const quality = avg ? (avg >= 8 ? 1.25 : avg <= 5 ? 0.8 : 1) : 1
    return sum + (profile.weights[g] || 0) * quality
  }, 0)
  let score = raw * 200

  // Favourite-studio bonus.
  if (anime.studio && anime.studio !== '—' && profile.topStudios?.includes(anime.studio)) {
    score += 12
  }

  // Penalize genres the user has repeatedly dropped.
  const dislikedHits = anime.genres.filter(g => profile.dislikedGenres?.includes(g)).length
  score -= dislikedHits * 15

  return Math.max(0, Math.min(99, Math.round(score)))
}

const PERSONAS = [
  { keys: ['Psychological', 'Thriller', 'Horror', 'Mystery'], text: "You're drawn to dark, mind-bending stories",      section: 'The Dark Side of the Catalog' },
  { keys: ['Action', 'Adventure', 'Martial Arts', 'Super Power'], text: 'You love intense action and epic battles',    section: 'Pure Adrenaline'               },
  { keys: ['Romance', 'Slice of Life', 'School'],             text: 'You enjoy heartwarming, emotional stories',       section: 'For the Heart'                 },
  { keys: ['Fantasy', 'Magic', 'Isekai'],                     text: "You're captivated by fantasy and otherworldly worlds", section: 'Worlds Beyond'            },
  { keys: ['Comedy', 'Parody'],                               text: 'You love fun, lighthearted anime',                section: 'Good Vibes Only'               },
  { keys: ['Sci-Fi', 'Mecha', 'Space'],                       text: "You're into sci-fi and futuristic themes",        section: 'The Future Is Anime'           },
]

export function personalityText(profile) {
  if (!profile) return null
  const top3 = profile.topGenres.slice(0, 3)
  for (const p of PERSONAS)
    if (p.keys.some(k => top3.includes(k)))
      return { text: p.text, section: p.section }
  return { text: `You tend to enjoy ${top3.slice(0, 2).join(' and ')} anime`, section: 'Picked for You' }
}
