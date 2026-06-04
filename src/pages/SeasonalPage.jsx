import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { SM } from '../constants'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { MediaCard } from '../components/MediaCard'
import { LoadingGrid } from '../components/LoadingGrid'
import { ShelfRow } from '../components/ShelfRow'
import { fetchPopular, fetchUpcoming, fetchByGenre, fetchSeasonArchive, fetchRecommendations, fetchAnimeById } from '../services/jikan'
import { fetchTrendingAnimeIds } from '../services/metrics'
import { fetchAnilistHeroImages } from '../services/anilist'
import { fetchKitsuCoverByMalId } from '../services/kitsu'
import { useOnScreen } from '../hooks/useOnScreen'
import { useIsMobile } from '../hooks/useIsMobile'
import { computeTasteProfile, matchScore, personalityText } from '../utils/tasteProfile'
import { getHeroCta, getHeroFocalPoint, getHeroImage, getHeroMeta } from '../utils/heroCarousel'
import { getStreamingProviderName } from '../utils/streaming'

function LazyShelf({ children }) {
  const [ref, visible] = useOnScreen('300px')
  return (
    <div ref={ref} style={{ minHeight: visible ? 0 : 340 }}>
      {visible && children}
    </div>
  )
}

const DISCOVER_KEYS = [
  { key: 'popular', emoji: '🔥', fn: (opts) => fetchPopular(opts) },
  { key: 'upcoming', emoji: '⏳', fn: (opts) => fetchUpcoming(opts) },
  { key: 'romance', emoji: '💕', fn: (opts) => fetchByGenre(22, 15, opts) },
  { key: 'action', emoji: '⚡', fn: (opts) => fetchByGenre(1, 15, opts) },
  { key: 'fantasy', emoji: '✨', fn: (opts) => fetchByGenre(10, 15, opts) },
  { key: 'comedy', emoji: '😄', fn: (opts) => fetchByGenre(4, 15, opts) },
  { key: 'sliceoflife', emoji: '🌸', fn: (opts) => fetchByGenre(36, 15, opts) },
]

const SEASON_KEYS = ['winter', 'spring', 'summer', 'fall']

const EMPTY_SECTIONS = Object.fromEntries(DISCOVER_KEYS.map(s => [s.key, []]))

export function SeasonalPage({
  seasonal, data, hero, heroIdx, setHeroIdx, airingItems,
  heroItems = airingItems, typeF, setTypeF, loading,
  onOpen, onHeroOpen = onOpen, onStatus, initialArchiveYear,
  heroRotateMs = 8000,
}) {
  const { T } = useTheme()
  const { t } = useTranslation()
  const { user } = useAuth()
  const isMobile = useIsMobile()

  // Hero background trailer (muted autoplay), desktop only & reduced-motion aware.
  const [heroTrailerOn, setHeroTrailerOn] = useState(false)
  const [heroMuted, setHeroMuted] = useState(true)
  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  )

  const tasteProfile = useMemo(() => computeTasteProfile(data), [data])
  const personality = useMemo(() => personalityText(tasteProfile), [tasteProfile])

  const forYouItems = useMemo(() => {
    if (!tasteProfile) return []
    return seasonal
      .filter(a => !a.userStatus)
      .map(a => ({ ...a, _match: matchScore(a, tasteProfile) }))
      .filter(a => a._match > 0)
      .sort((a, b) => b._match - a._match)
      .slice(0, 10)
  }, [seasonal, tasteProfile])

  const [becauseRecs, setBecauseRecs] = useState([])
  const [becauseAnime, setBecauseAnime] = useState(null)
  const becauseRef = useRef(false)

  useEffect(() => {
    if (!data.length || becauseRef.current) return
    const source = data.find(a => a.userStatus === 'watching') ||
      data.filter(a => a.userStatus === 'completed').slice(-1)[0]
    if (!source) return
    becauseRef.current = true
    setBecauseAnime(source)
    fetchRecommendations(source.id)
      .then(recs => setBecauseRecs(recs.filter(r => !data.find(d => d.id === r.id))))
      .catch(() => { })
  }, [data])

  const COLD_START_GENRES = [
    { label: 'Action', emoji: '⚡' },
    { label: 'Romance', emoji: '💕' },
    { label: 'Fantasy', emoji: '✨' },
    { label: 'Psychological', emoji: '🧠' },
    { label: 'Comedy', emoji: '😄' },
    { label: 'Sci-Fi', emoji: '🚀' },
  ]
  const [coldPicks, setColdPicks] = useState(
    () => JSON.parse(localStorage.getItem('watchout_cold_genres') || '[]')
  )
  const toggleColdGenre = (g) => {
    setColdPicks(prev => {
      const next = prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
      localStorage.setItem('watchout_cold_genres', JSON.stringify(next))
      return next
    })
  }
  const EXCLUDE_STATUSES = new Set(['watching', 'completed', 'dropped'])
  const coldItems = useMemo(() => {
    if (!coldPicks.length) return []
    return seasonal
      .filter(a => !EXCLUDE_STATUSES.has(a.userStatus) && a.genres?.some(g => coldPicks.includes(g)))
      .slice(0, 10)
  }, [seasonal, coldPicks])

  const [sections, setSections] = useState(EMPTY_SECTIONS)
  const [loadingSet, setLoadingSet] = useState(() => new Set(DISCOVER_KEYS.map(s => s.key)))
  const [archYear, setArchYear] = useState(null)
  const [archSeason, setArchSeason] = useState(null)
  const [archData, setArchData] = useState([])
  const [archLoading, setArchLoading] = useState(false)
  const [heroBanner, setHeroBanner] = useState(null)
  const [heroKitsuCover, setHeroKitsuCover] = useState(null)

  useEffect(() => {
    if (!initialArchiveYear) return
    setArchYear(initialArchiveYear)
    setArchSeason(prev => prev || 'spring')
  }, [initialArchiveYear])

  useEffect(() => {
    let cancelled = false
    if (!hero?.id) return

    setHeroBanner(null)
    setHeroKitsuCover(null)

    fetchAnilistHeroImages(hero.id)
      .then(async images => {
        if (cancelled) return
        setHeroBanner(images.bannerImage || null)

        if (images.bannerImage) return

        const kitsuUrl = await fetchKitsuCoverByMalId(hero.id)
        if (!cancelled) setHeroKitsuCover(kitsuUrl || null)
      })
      .catch(async () => {
        const kitsuUrl = await fetchKitsuCoverByMalId(hero.id)
        if (!cancelled) setHeroKitsuCover(kitsuUrl || null)
      })

    return () => { cancelled = true }
  }, [hero?.id])

  const heroRef = useRef(null)
  const [heroInView, setHeroInView] = useState(true)

  // Fade the background trailer in shortly after the poster settles.
  useEffect(() => {
    setHeroTrailerOn(false)
    if (isMobile || prefersReducedMotion) return
    const ytId = hero?.trailer?.match(/embed\/([^?]+)/)?.[1]
    if (!ytId) return
    const timer = setTimeout(() => setHeroTrailerOn(true), 1400)
    return () => clearTimeout(timer)
  }, [hero?.id, isMobile, prefersReducedMotion])

  // Stop loading/decoding the background trailer once the hero scrolls away.
  useEffect(() => {
    const el = heroRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([entry]) => setHeroInView(entry.isIntersecting), { threshold: 0.1 })
    io.observe(el)
    return () => io.disconnect()
  }, [hero?.id])

  // Map lookup keeps enrichment O(n) instead of O(n²) across many shelves.
  const dataById = useMemo(() => new Map(data.map(d => [d.id, d])), [data])
  const enrich = useCallback(
    items => items.map(i => dataById.get(i.id) ?? i),
    [dataById]
  )

  const [refreshingSet, setRefreshingSet] = useState(() => new Set())

  useEffect(() => {
    let cancelled = false
    const delay = ms => new Promise(r => setTimeout(r, ms))
      ; (async () => {
        const seen = new Set()
        for (const { key, fn } of DISCOVER_KEYS) {
          if (cancelled) break
          try {
            const items = await fn()
            const unique = items.filter(i => !seen.has(i.id))
            unique.forEach(i => seen.add(i.id))
            if (!cancelled) setSections(prev => ({ ...prev, [key]: unique }))
          } catch { }
          setLoadingSet(prev => { const s = new Set(prev); s.delete(key); return s })
          await delay(400)
        }
      })()
    return () => { cancelled = true }
  }, [])

  // Manual per-shelf refresh — bypasses the API cache for genuinely fresh items.
  const refreshSection = useCallback(async (key) => {
    const def = DISCOVER_KEYS.find(s => s.key === key)
    if (!def) return
    setRefreshingSet(prev => new Set(prev).add(key))
    try {
      const items = await def.fn({ fresh: true })
      setSections(prev => ({ ...prev, [key]: items }))
    } catch { }
    setRefreshingSet(prev => { const s = new Set(prev); s.delete(key); return s })
  }, [])

  // ── Trending Now (real engagement metrics) ──
  const [trendingItems, setTrendingItems] = useState([])
  const [trendingLoading, setTrendingLoading] = useState(true)

  const loadTrending = useCallback(async () => {
    setTrendingLoading(true)
    try {
      const ids = await fetchTrendingAnimeIds({ days: 7, limit: 12 })
      const resolved = await Promise.all(ids.map(async id => {
        const local = data.find(d => d.id === id)
        if (local) return local
        try { return await fetchAnimeById(id) } catch { return null }
      }))
      setTrendingItems(resolved.filter(Boolean))
    } catch {
      setTrendingItems([])
    } finally {
      setTrendingLoading(false)
    }
  }, [data])

  useEffect(() => { loadTrending() }, [])

  useEffect(() => {
    if (!archYear || !archSeason) return
    setArchLoading(true)
    fetchSeasonArchive(archYear, archSeason)
      .then(items => setArchData(items))
      .catch(() => setArchData([]))
      .finally(() => setArchLoading(false))
  }, [archYear, archSeason])

  // Memoize enriched lists so ShelfRow (memo) keeps a stable reference and
  // doesn't re-render when unrelated state (e.g. the hero) changes.
  const enrichedSections = useMemo(() => {
    const out = {}
    for (const { key } of DISCOVER_KEYS) out[key] = enrich(sections[key])
    return out
  }, [sections, enrich])
  const enrichedTrending = useMemo(() => enrich(trendingItems), [trendingItems, enrich])
  // Stable per-section refresh handlers so the discover ShelfRows stay memoized.
  const refreshHandlers = useMemo(
    () => Object.fromEntries(DISCOVER_KEYS.map(({ key }) => [key, () => refreshSection(key)])),
    [refreshSection]
  )

  const continueWatching = useMemo(
    () => data.filter(i => i.type === 'anime' && i.userStatus === 'watching'),
    [data]
  )
  const isArchive = archYear !== null && archSeason !== null
  const ytId = hero?.trailer?.match(/embed\/([^?]+)/)?.[1]
  const ytThumb = ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null
  const heroBackground = hero?.heroImageUrl || getHeroImage(hero, heroBanner, heroKitsuCover, ytThumb)
  const heroFocalPoint = getHeroFocalPoint(hero)
  const heroMeta = getHeroMeta(hero)
  const heroCta = getHeroCta(hero, status => t(`status.${status}`))
  const showHeroLogo = Boolean(hero?.heroLogoUrl)
  const firstShelfOverlapStyle = {
    marginTop: -46,
    position: 'relative',
    zIndex: 5,
    paddingTop: 18,
  }
  const gridItems = isArchive
    ? enrich(archData).filter(i => typeF === 'all' || i.type === typeF)
    : seasonal

  if (loading || !hero) return (
    <div style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="shimmer" style={{ marginBottom: 36, borderRadius: 24, height: 460, background: T.surf2 }} />
      <LoadingGrid count={8} />
    </div>
  )

  const pillStyle = (active) => ({
    padding: '6px 14px', borderRadius: 22, fontSize: 13, fontWeight: 500,
    border: 'none', cursor: 'pointer',
    background: active ? (T.dark ? '#3A3A3C' : '#1D1D1F') : T.surf2,
    color: active ? '#fff' : T.sub,
  })

  const typeFilters = [['all', t('seasonal.filterAll')], ['anime', t('seasonal.filterAnime')], ['film', t('seasonal.filterFilm')]]

  return (
    <div className="fu">

      {/* ── Archive / Season picker ── */}
      {isArchive && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 20, marginBottom: 18 }}>
        <button className="pill t" onClick={() => { setArchYear(null); setArchSeason(null) }}
          style={pillStyle(archYear === null)}>
          {t('seasonal.current')}
        </button>
        {archYear !== null && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SEASON_KEYS.map(s => (
              <button key={s} className="pill t" onClick={() => setArchSeason(s)}
                style={{
                  ...pillStyle(archSeason === s),
                  background: archSeason === s ? '#0A84FF' : T.surf2,
                  color: archSeason === s ? '#fff' : T.sub
                }}>
                {t(`seasonal.seasons.${s}`)}
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {/* ── Hero (hidden in archive mode) ── */}
      {!isArchive && (
        <section key={hero.id} ref={heroRef} className="card hf hero hero-h" onClick={() => onHeroOpen(hero)}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onHeroOpen(hero)
            }
          }}
          style={{
            margin: '0 0 4px calc(50% - 50vw)', width: '100vw',
            borderRadius: 0, overflow: 'visible', height: 'clamp(660px, 82vh, 860px)',
            position: 'relative',
            background: `linear-gradient(135deg,${hero.color},${hero.colorB})`,
            boxShadow: `0 24px 80px ${hero.color}30`
          }}>

          {heroBackground && (
            <img className="heroImage" src={heroBackground} alt={hero.title} fetchPriority="high" decoding="async" style={{
              position: 'absolute', left: 0, right: 0, top: 0, bottom: -58,
              width: '100%', height: 'calc(100% + 58px)', objectFit: 'cover', objectPosition: heroFocalPoint,
              filter: 'saturate(1.08) contrast(1.03)'
            }} />
          )}

          {/* Muted autoplay trailer — fades over the poster on desktop */}
          {heroTrailerOn && heroInView && ytId && (
            <div aria-hidden="true" style={{
              position: 'absolute', left: 0, right: 0, top: 0, bottom: -58,
              overflow: 'hidden', pointerEvents: 'none',
              opacity: heroTrailerOn ? 1 : 0, transition: 'opacity .8s ease',
            }}>
              <iframe
                title={`${hero.title} trailer`}
                src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=${heroMuted ? 1 : 0}&controls=0&loop=1&playlist=${ytId}&playsinline=1&modestbranding=1&rel=0&disablekb=1&iv_load_policy=3`}
                allow="autoplay; encrypted-media"
                style={{
                  position: 'absolute', top: '50%', left: '50%',
                  width: '177.78vh', minWidth: '100%', height: '56.25vw', minHeight: '100%',
                  transform: 'translate(-50%, -50%)', border: 'none',
                }}
              />
            </div>
          )}

          {/* Mute / unmute toggle */}
          {heroTrailerOn && heroInView && ytId && (
            <button className="t" onClick={e => { e.stopPropagation(); setHeroMuted(m => !m) }}
              aria-label={heroMuted ? 'Unmute trailer' : 'Mute trailer'}
              style={{
                position: 'absolute', bottom: 24, right: 24, zIndex: 4,
                width: 42, height: 42, borderRadius: '50%',
                border: '1px solid rgba(255,255,255,.22)', background: 'rgba(0,0,0,.42)',
                color: '#fff', fontSize: 17, backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {heroMuted ? '🔇' : '🔊'}
            </button>
          )}

          <div className="heroOverlay" style={{
            position: 'absolute', left: 0, right: 0, top: 0, bottom: -58,
            background: 'linear-gradient(90deg, rgba(0,0,0,.86) 0%, rgba(0,0,0,.45) 48%, rgba(0,0,0,.05) 100%)'
          }} />
          <div className="heroBottomFade" style={{
            position: 'absolute', left: 0, right: 0, top: 0, bottom: -58,
            background: 'linear-gradient(0deg, var(--bg-main) 0%, rgba(5,5,9,.88) 16%, rgba(5,5,9,.36) 40%, transparent 68%)'
          }} />

          {hero.userStatus && (
            <div style={{
              position: 'absolute', top: 20, right: 20, zIndex: 2,
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 14px', borderRadius: 22,
              background: `${SM[hero.userStatus].dot}28`,
              border: `1px solid ${SM[hero.userStatus].dot}50`,
              backdropFilter: 'blur(12px)'
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: SM[hero.userStatus].dot,
                boxShadow: `0 0 7px ${SM[hero.userStatus].dot}`
              }} />
              <span style={{
                fontSize: 12, fontWeight: 700, color: '#fff',
                letterSpacing: '.03em'
              }}>{t(`status.${hero.userStatus}`)}</span>
            </div>
          )}

          <div className="heroContent hero-pad" style={{
            position: 'relative', zIndex: 2,
            padding: '96px clamp(28px, 7vw, 96px) 86px',
            height: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column',
            justifyContent: 'flex-end', alignItems: 'flex-start'
          }}>
            {hero.airing && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 20,
                background: 'rgba(255,255,255,.22)', marginBottom: 14, alignSelf: 'flex-start'
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'block' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', letterSpacing: '.04em' }}>
                  {t('seasonal.airingBadge')}
                </span>
              </div>
            )}
            {showHeroLogo && (
              <img
                src={hero.heroLogoUrl}
                alt={hero.title}
                style={{
                  maxWidth: 'min(440px, 82vw)',
                  maxHeight: 130,
                  objectFit: 'contain',
                  marginBottom: hero.heroHideTitle ? 18 : 10,
                  filter: 'drop-shadow(0 10px 28px rgba(0,0,0,.45))',
                }}
              />
            )}
            {!hero.heroHideTitle && (
              <h1 className="hero-title" style={{
                fontSize: 58, fontWeight: 900, color: '#fff',
                letterSpacing: 0, lineHeight: .98, marginBottom: 14,
                textTransform: 'uppercase',
                textShadow: '0 4px 28px rgba(0,0,0,.55)'
              }}>{hero.title}</h1>
            )}
            <p style={{
              fontSize: 13, color: 'rgba(255,255,255,.86)', fontWeight: 750,
              lineHeight: 1.5, marginBottom: 14, textShadow: '0 2px 14px rgba(0,0,0,.5)'
            }}>{heroMeta}</p>
            <p className="hero-sub" style={{
              fontSize: 15.5, color: 'rgba(255,255,255,.78)',
              maxWidth: 500, lineHeight: 1.65, marginBottom: 26,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>{hero.synopsis}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }} onClick={e => e.stopPropagation()}>
              <button className="t" onClick={() => onHeroOpen(hero)}
                style={{
                  padding: '14px 24px', borderRadius: 4, border: 'none',
                  background: '#FF7A00', color: '#111', fontWeight: 900,
                  fontSize: 14, textTransform: 'uppercase', letterSpacing: '.02em',
                  boxShadow: '0 16px 38px rgba(255,122,0,.28)'
                }}>
                {heroCta.primaryLabel}
              </button>
              <button className="t" onClick={() => heroCta.canAdd && onStatus(hero.id, 'plan_to_watch')}
                style={{
                  padding: '13px 20px', borderRadius: 4,
                  border: '1px solid rgba(255,255,255,.28)',
                  background: 'rgba(255,255,255,.08)', color: '#fff',
                  fontWeight: 850, fontSize: 14, textTransform: 'uppercase',
                  letterSpacing: '.02em', backdropFilter: 'blur(14px)'
                }}>
                {heroCta.secondaryLabel}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 14px', borderRadius: 22,
                  background: 'rgba(255,255,255,.25)', backdropFilter: 'blur(10px)'
                }}>
                  <span style={{ fontSize: 14, color: '#FFD60A' }}>★</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{hero.score}</span>
                </div>
                {hero.streaming.slice(0, 2).map(provider => {
                  const s = getStreamingProviderName(provider)
                  if (!s) return null
                  return (
                  <span key={s} style={{
                    padding: '7px 14px', borderRadius: 22, fontSize: 13,
                    fontWeight: 600, background: 'rgba(255,255,255,.22)',
                    color: '#fff', backdropFilter: 'blur(10px)'
                  }}>{s}</span>
                  )
                })}
              </div>
              {heroItems.length > 1 && (
                <div style={{ display: 'flex', gap: 7 }} onClick={e => e.stopPropagation()}>
                  {heroItems.map((_, i) => {
                    const active = i === heroIdx
                    return (
                      <button key={i} onClick={() => setHeroIdx(i)}
                        aria-label={`Go to hero ${i + 1}`}
                        style={{
                          position: 'relative', overflow: 'hidden',
                          width: active ? 26 : 6, height: 6, borderRadius: 8,
                          border: 'none', padding: 0, cursor: 'pointer', minHeight: 6,
                          background: active ? 'rgba(255,122,0,.35)' : 'rgba(255,255,255,.38)',
                          transition: 'width .3s ease, background .3s ease'
                        }}>
                        {active && (
                          <span key={heroIdx} aria-hidden="true" style={{
                            position: 'absolute', inset: 0, borderRadius: 8,
                            background: '#FF7A00', transformOrigin: 'left center',
                            animation: `heroDotFill ${heroRotateMs}ms linear forwards`,
                          }} />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          {heroItems.length > 1 && (
            <div className="hero-arrows" onClick={e => e.stopPropagation()}>
              <button className="t" onClick={() => setHeroIdx((heroIdx - 1 + heroItems.length) % heroItems.length)}
                aria-label="Previous hero"
                style={{
                  position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)',
                  zIndex: 4, width: 42, height: 42, borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,.18)',
                  background: 'rgba(0,0,0,.24)', color: '#fff', fontSize: 24,
                  backdropFilter: 'blur(14px)'
                }}>
                {'<'}
              </button>
              <button className="t" onClick={() => setHeroIdx((heroIdx + 1) % heroItems.length)}
                aria-label="Next hero"
                style={{
                  position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)',
                  zIndex: 4, width: 42, height: 42, borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,.18)',
                  background: 'rgba(0,0,0,.24)', color: '#fff', fontSize: 24,
                  backdropFilter: 'blur(14px)'
                }}>
                {'>'}
              </button>
            </div>
          )}
        </section>
      )}


      {/* ── Shelves (hidden in archive mode) ── */}

      {!isArchive && (
        <>

          {continueWatching.length > 0 && (
            <div style={firstShelfOverlapStyle}>
            <ShelfRow
              emoji="▶"
              title={t('seasonal.continueWatching')}
              subtitle={t('seasonal.continueWatchingSubtitle')}
              items={continueWatching} loading={false}
              onOpen={onOpen} onStatus={onStatus} />
            </div>
          )}

          {/* Trending Now — driven by real engagement metrics */}
          {(trendingLoading || trendingItems.length >= 3) && (
            <ShelfRow
              emoji="📈"
              title={t('seasonal.trendingNow')}
              subtitle={t('seasonal.trendingNowSubtitle')}
              items={enrichedTrending} loading={trendingLoading}
              onOpen={onOpen} onStatus={onStatus}
              onRefresh={loadTrending} refreshing={trendingLoading} />
          )}


          <div style={continueWatching.length > 0 ? undefined : firstShelfOverlapStyle}>
          <ShelfRow
            title={t('seasonal.airing')}
            subtitle={t('seasonal.airingSubtitle')}
            items={seasonal} loading={false}
            onOpen={onOpen} onStatus={onStatus}
            headerRight={
              <div style={{ display: 'flex', gap: 6 }}>
                {typeFilters.map(([v, l]) => (
                  <button key={v} className="pill t" onClick={() => setTypeF(v)}
                    style={pillStyle(typeF === v)}>
                    {l}
                  </button>
                ))}
              </div>
            }
          />
          </div>


          {/* For You shelf */}
          {tasteProfile && forYouItems.length >= 3 && (
            <ShelfRow
              emoji="✨"
              title={personality?.section ?? 'For You'}
              subtitle={`Based on: ${tasteProfile.topGenres.slice(0, 3).join(', ')}`}
              items={forYouItems} loading={false}
              onOpen={onOpen} onStatus={onStatus}
              matchScores={Object.fromEntries(forYouItems.map(a => [a.id, a._match]))}
            />
          )}

          {/* Because you watched shelf */}
          {becauseRecs.length >= 3 && (
            <ShelfRow
              emoji="🎯"
              title={`Because you watched ${becauseAnime?.title ?? ''}`}
              subtitle="You might also like these"
              items={becauseRecs} loading={false}
              onOpen={onOpen} onStatus={onStatus}
            />
          )}

          {/* Cold Start — shown for logged-in users with no taste profile yet */}
          {!tasteProfile && user && (
            <>
              <div style={{
                marginBottom: 32, padding: '20px 24px', borderRadius: 20,
                background: T.surf, border: `1px solid ${T.bord}`,
              }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: T.txt, marginBottom: 4 }}>
                  Personalize your experience
                </p>
                <p style={{ fontSize: 13, color: T.sub, marginBottom: 12 }}>
                  What genres do you love?
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLD_START_GENRES.map(({ label, emoji }) => (
                    <button key={label} className="t" onClick={() => toggleColdGenre(label)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                        border: `1px solid ${coldPicks.includes(label) ? '#0A84FF' : T.bord}`,
                        background: coldPicks.includes(label) ? 'rgba(10,132,255,.15)' : T.surf2,
                        color: coldPicks.includes(label) ? '#0A84FF' : T.sub,
                        cursor: 'pointer',
                      }}>
                      {emoji} {label}
                    </button>
                  ))}
                </div>
              </div>
              {coldItems.length >= 3 && (
                <ShelfRow
                  emoji="🌟"
                  title="Picked for You"
                  subtitle="Seasonal anime matching your picks"
                  items={coldItems} loading={false}
                  onOpen={onOpen} onStatus={onStatus}
                />
              )}
            </>
          )}

          {DISCOVER_KEYS.map(({ key, emoji }) => (
            <LazyShelf key={key}>
              <ShelfRow
                emoji={emoji}
                title={t(`seasonal.sections.${key}.title`)}
                subtitle={t(`seasonal.sections.${key}.subtitle`)}
                items={enrichedSections[key]} loading={loadingSet.has(key)}
                onOpen={onOpen} onStatus={onStatus}
                onRefresh={refreshHandlers[key]} refreshing={refreshingSet.has(key)} />
            </LazyShelf>
          ))}
        </>
      )}

      {/* ── Grid ── */}
      <div style={{ marginTop: 12, marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: T.txt, letterSpacing: '-.02em' }}>
              {isArchive
                ? `${t(`seasonal.seasons.${archSeason}`)} ${archYear}`
                : t('seasonal.allSeason')}
              {!archLoading && ` (${gridItems.length})`}
            </h2>
            {isArchive && <p style={{ fontSize: 13, color: T.sub, marginTop: 3 }}>{t('seasonal.archiveLabel')}</p>}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {typeFilters.map(([v, l]) => (
              <button key={v} className="pill t" onClick={() => setTypeF(v)}
                style={pillStyle(typeF === v)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {archLoading ? <LoadingGrid count={8} /> : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill,minmax(${isMobile ? 150 : 200}px,1fr))`,
            gap: isMobile ? 14 : 18
          }}>
            {gridItems.map((it, i) => (
              <MediaCard key={it.id} item={it} delay={i * 35}
                onOpen={onOpen} onStatus={onStatus} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
