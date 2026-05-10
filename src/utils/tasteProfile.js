export function computeTasteProfile(library, { minItems = 3 } = {}) {
  const active = library.filter(a => a.userStatus && a.userStatus !== 'plan_to_watch')
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

  return {
    weights,
    topGenres:  Object.entries(weights).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([g]) => g),
    topStudios: Object.entries(studioCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s),
    genreMinutes,
    avgScoreByGenre,
    genreCounts,
    totalActive: active.length,
  }
}

export function matchScore(anime, profile) {
  if (!profile || !anime.genres?.length) return null
  const raw = anime.genres.reduce((sum, g) => sum + (profile.weights[g] || 0), 0)
  return Math.min(99, Math.round(raw * 200))
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
