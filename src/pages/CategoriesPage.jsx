import { useState, useEffect, useCallback } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { useTmdbPosterBatch } from '../hooks/useTmdbPosterBatch'
import { fetchByGenre } from '../services/jikan'
import { MediaCard } from '../components/MediaCard'
import { LoadingGrid } from '../components/LoadingGrid'
import { GENRES, getGenreById } from '../constants/browse'

const GENRE_NAME_TO_ID = Object.fromEntries(GENRES.map(g => [g.name, g.id]))

// Maps Portuguese names (stored in library items) → genre ID
const GENRE_PT_TO_ID = {
  'Ação': 1, 'Aventura': 2, 'Comédia': 4, 'Drama': 8, 'Fantasia': 10,
  'Terror': 14, 'Mistério': 7, 'Romance': 22, 'Ficção Científica': 24,
  'Slice of Life': 36, 'Esportes': 30, 'Sobrenatural': 37,
  'Psicológico': 40, 'Mecha': 18, 'Histórico': 13, 'Escola': 23,
  'Artes Marciais': 17, 'Militar': 38, 'Suspense': 41, 'Musical': 19,
}

function getMostWatchedGenre(library) {
  const count = {}
  library.forEach(item => {
    ;(item.genres || []).forEach(g => {
      count[g] = (count[g] || 0) + 1
    })
  })
  if (!Object.keys(count).length) return null
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0][0]
}

export function CategoriesPage({ library, onOpen, onStatus, initialGenreId }) {
  const { T, dark } = useTheme()
  const isMobile = useIsMobile()
  const [mode, setMode]             = useState('genre')
  const [selectedId, setSelectedId] = useState(() => getGenreById(initialGenreId).id)
  const [animes, setAnimes]         = useState([])
  const [loading, setLoading]       = useState(false)
  const [surprise, setSurprise]     = useState(null)
  const [surpriseLoading, setSurpriseLoading] = useState(false)
  const [topGenre, setTopGenre]     = useState(null)

  useEffect(() => {
    if (!initialGenreId) return
    setMode('genre')
    setSelectedId(getGenreById(initialGenreId).id)
  }, [initialGenreId])

  useEffect(() => {
    if (mode !== 'genre') return
    setLoading(true)
    fetchByGenre(selectedId, 20)
      .then(setAnimes)
      .catch(() => setAnimes([]))
      .finally(() => setLoading(false))
  }, [selectedId, mode])

  const loadSurprise = useCallback(async () => {
    setSurpriseLoading(true)
    setSurprise(null)

    const mostWatched = getMostWatchedGenre(library)
    setTopGenre(mostWatched)

    const genreId = mostWatched && GENRE_PT_TO_ID[mostWatched]
      ? GENRE_PT_TO_ID[mostWatched]
      : GENRES[Math.floor(Math.random() * GENRES.length)].id

    try {
      const results = await fetchByGenre(genreId, 25)
      const inLibrary = new Set(library.map(i => i.id))
      const candidates = results.filter(a => !inLibrary.has(a.id))
      const pool = candidates.length > 0 ? candidates : results
      setSurprise({
        anime: pool[Math.floor(Math.random() * pool.length)],
        genreName: mostWatched || GENRES.find(g => g.id === genreId)?.name,
      })
    } catch {}

    setSurpriseLoading(false)
  }, [library])

  const handleSurpriseClick = () => {
    setMode('surprise')
    loadSurprise()
  }

  const handleGenreClick = (id) => {
    setMode('genre')
    setSelectedId(id)
  }

  const activeGenre = GENRES.find(g => g.id === selectedId)

  const chipBase = {
    flexShrink: 0, padding: '8px 16px', borderRadius: 20,
    fontWeight: 600, fontSize: 13, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
    whiteSpace: 'nowrap', transition: 'background .15s, color .15s',
    border: 'none',
  }

  // Fetch TMDB posters for displayed items
  const itemsToShow = [...(animes || []), surprise?.anime].filter(Boolean)
  const tmdbPosterBatch = useTmdbPosterBatch(itemsToShow)

  // Helper to get TMDB poster with fallback
  const getPosterUrl = (item) => tmdbPosterBatch[item?.id] ?? item?.img ?? null

  return (
    <div style={{ padding: '24px 0 80px' }}>

      {/* ── Submenu: Surprise me + géneros ── */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6,
        scrollbarWidth: 'none', marginBottom: 28,
      }}>
        <button onClick={handleSurpriseClick} style={{
          ...chipBase,
          background: mode === 'surprise'
            ? 'linear-gradient(135deg,#BF5AF2,#FF9F0A)'
            : T.surf,
          color: mode === 'surprise' ? '#fff' : T.sub,
          border: mode === 'surprise' ? 'none' : `1px solid ${T.bord}`,
          fontWeight: 700,
        }}>
          ✨ Surprise me
        </button>

        {GENRES.map(g => {
          const active = mode === 'genre' && selectedId === g.id
          if (g.special) {
            return (
              <button key={g.id} onClick={() => handleGenreClick(g.id)} style={{
                ...chipBase,
                fontWeight: 700,
                background: 'linear-gradient(135deg,#7C3AED,#06B6D4)',
                color: '#fff',
                border: 'none',
                boxShadow: active ? '0 0 0 2px rgba(255,255,255,.55), 0 6px 18px rgba(124,58,237,.45)' : '0 4px 14px rgba(124,58,237,.35)',
              }}>
                {g.icon} {g.name}
              </button>
            )
          }
          return (
            <button key={g.id} onClick={() => handleGenreClick(g.id)} style={{
              ...chipBase,
              background: active ? '#0A84FF' : T.surf,
              color: active ? '#fff' : T.sub,
              border: active ? 'none' : `1px solid ${T.bord}`,
            }}>
              {g.icon} {g.name}
            </button>
          )
        })}
      </div>

      {/* ── Modo Surpresa ── */}
      {mode === 'surprise' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: T.txt, margin: '0 0 5px' }}>
                Your next adventure ✨
              </h2>
              <p style={{ fontSize: 13, color: T.sub, margin: 0 }}>
                {topGenre
                  ? `Based on what you watch most: ${topGenre}`
                  : 'A special recommendation just for you'}
              </p>
            </div>
            <button onClick={loadSurprise} disabled={surpriseLoading} style={{
              padding: '9px 20px', borderRadius: 12,
              background: 'linear-gradient(135deg,#BF5AF2,#FF9F0A)',
              color: '#fff', border: 'none', fontWeight: 700, fontSize: 13,
              cursor: surpriseLoading ? 'default' : 'pointer',
              opacity: surpriseLoading ? 0.6 : 1,
            }}>
              {surpriseLoading ? 'Searching...' : '✨ Another suggestion'}
            </button>
          </div>

          {surpriseLoading && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: T.sub, fontSize: 14 }}>
              Finding something special for you...
            </div>
          )}

          {!surpriseLoading && surprise?.anime && (
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              <div style={{
                borderRadius: 22, overflow: 'hidden',
                background: T.surf, border: `1px solid ${T.bord}`,
                boxShadow: `0 12px 50px rgba(0,0,0,${dark ? .45 : .13})`,
              }}>
                {/* Banner */}
                <div style={{ position: 'relative', paddingTop: '44%', overflow: 'hidden' }}>
                  {getPosterUrl(surprise.anime)
                    ? <img src={getPosterUrl(surprise.anime)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(.65)' }} />
                    : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg,${surprise.anime.color},${surprise.anime.colorB})` }} />
                  }
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,.88) 45%, transparent)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    padding: '20px 24px',
                  }}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                      {surprise.anime.genres.slice(0, 4).map(g => (
                        <span key={g} style={{ fontSize: 11, background: 'rgba(255,255,255,.18)', color: '#fff', padding: '3px 8px', borderRadius: 6 }}>{g}</span>
                      ))}
                    </div>
                    <h3 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 5px', lineHeight: 1.2 }}>
                      {surprise.anime.title}
                    </h3>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', margin: 0 }}>
                      {surprise.anime.studio} · {surprise.anime.year}
                      {surprise.anime.score > 0 && <span> · ⭐ {surprise.anime.score}</span>}
                      {surprise.anime.eps && <span> · {surprise.anime.eps} ep</span>}
                    </p>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '18px 24px 22px' }}>
                  {surprise.anime.synopsis && (
                    <p style={{ fontSize: 13.5, color: T.sub, lineHeight: 1.65, margin: '0 0 18px' }}>
                      {surprise.anime.synopsis.length > 280
                        ? surprise.anime.synopsis.slice(0, 280) + '...'
                        : surprise.anime.synopsis}
                    </p>
                  )}
                  <button onClick={() => onOpen(surprise.anime)} style={{
                    padding: '11px 30px', borderRadius: 12,
                    background: surprise.anime.color, color: '#fff',
                    border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  }}>
                    View details
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modo Género ── */}
      {mode === 'genre' && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: T.txt, margin: activeGenre?.special ? '0 0 4px' : '0 0 20px' }}>
            {activeGenre?.icon} {activeGenre?.name}
          </h2>
          {activeGenre?.special && (
            <p style={{ fontSize: 13, color: T.sub, margin: '0 0 20px' }}>
              Trapped in another world — the best isekai, ranked.
            </p>
          )}

          {loading
            ? <LoadingGrid />
            : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 16,
              }}>
                {animes.map((item, i) => (
                  <MediaCard key={item.id} item={item} delay={i * 30}
                    onOpen={onOpen} onStatus={onStatus} />
                ))}
              </div>
            )
          }
        </div>
      )}
    </div>
  )
}
