import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { SM } from '../constants'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { MediaCard } from '../components/MediaCard'
import { LoadingGrid } from '../components/LoadingGrid'
import { ShelfRow } from '../components/ShelfRow'
import { fetchPopular, fetchUpcoming, fetchByGenre, fetchSeasonArchive, fetchRecommendations } from '../services/jikan'
import { fetchAnilistBannerOnly } from '../services/anilist'
import { useOnScreen } from '../hooks/useOnScreen'
import { computeTasteProfile, matchScore, personalityText } from '../utils/tasteProfile'

function LazyShelf({ children }) {
  const [ref, visible] = useOnScreen('300px')
  return (
    <div ref={ref} style={{ minHeight: visible ? 0 : 340 }}>
      {visible && children}
    </div>
  )
}

const DISCOVER_KEYS = [
  { key: 'popular',      emoji: '🔥', fn: fetchPopular },
  { key: 'upcoming',     emoji: '⏳', fn: fetchUpcoming },
  { key: 'romance',      emoji: '💕', fn: () => fetchByGenre(22) },
  { key: 'action',       emoji: '⚡', fn: () => fetchByGenre(1) },
  { key: 'fantasy',      emoji: '✨', fn: () => fetchByGenre(10) },
  { key: 'comedy',       emoji: '😄', fn: () => fetchByGenre(4) },
  { key: 'sliceoflife',  emoji: '🌸', fn: () => fetchByGenre(36) },
]

const SEASON_KEYS = ['winter', 'spring', 'summer', 'fall']
const CUR_YEAR    = new Date().getFullYear()
const ARCH_YEARS  = [CUR_YEAR, CUR_YEAR - 1, CUR_YEAR - 2, CUR_YEAR - 3]

const EMPTY_SECTIONS = Object.fromEntries(DISCOVER_KEYS.map(s => [s.key, []]))

export function SeasonalPage({
  seasonal, data, hero, heroIdx, setHeroIdx, airingItems,
  typeF, setTypeF, loading,
  onOpen, onStatus,
}) {
  const { T } = useTheme()
  const { t } = useTranslation()
  const { user } = useAuth()

  const tasteProfile = useMemo(() => computeTasteProfile(data), [data])
  const personality  = useMemo(() => personalityText(tasteProfile), [tasteProfile])

  const forYouItems = useMemo(() => {
    if (!tasteProfile) return []
    return seasonal
      .filter(a => !a.userStatus)
      .map(a => ({ ...a, _match: matchScore(a, tasteProfile) }))
      .filter(a => a._match > 0)
      .sort((a, b) => b._match - a._match)
      .slice(0, 10)
  }, [seasonal, tasteProfile])

  const [becauseRecs,  setBecauseRecs]  = useState([])
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
      .catch(() => {})
  }, [data])

  const COLD_START_GENRES = [
    { label: 'Action',        emoji: '⚡' },
    { label: 'Romance',       emoji: '💕' },
    { label: 'Fantasy',       emoji: '✨' },
    { label: 'Psychological', emoji: '🧠' },
    { label: 'Comedy',        emoji: '😄' },
    { label: 'Sci-Fi',        emoji: '🚀' },
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

  const [sections,    setSections]    = useState(EMPTY_SECTIONS)
  const [loadingSet,  setLoadingSet]  = useState(() => new Set(DISCOVER_KEYS.map(s => s.key)))
  const [archYear,    setArchYear]    = useState(null)
  const [archSeason,  setArchSeason]  = useState(null)
  const [archData,    setArchData]    = useState([])
  const [archLoading, setArchLoading] = useState(false)
  const [heroBanner,  setHeroBanner]  = useState(null)

  useEffect(() => {
    if (!hero?.id) return
    setHeroBanner(null)
    fetchAnilistBannerOnly(hero.id).then(url => setHeroBanner(url || null)).catch(() => {})
  }, [hero?.id])

  const enrich = useCallback(
    items => items.map(i => data.find(d => d.id === i.id) ?? i),
    [data]
  )

  useEffect(() => {
    let cancelled = false
    const delay = ms => new Promise(r => setTimeout(r, ms))
    ;(async () => {
      const seen = new Set()
      for (const { key, fn } of DISCOVER_KEYS) {
        if (cancelled) break
        try {
          const items = await fn()
          const unique = items.filter(i => !seen.has(i.id))
          unique.forEach(i => seen.add(i.id))
          if (!cancelled) setSections(prev => ({ ...prev, [key]: unique }))
        } catch {}
        setLoadingSet(prev => { const s = new Set(prev); s.delete(key); return s })
        await delay(400)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!archYear || !archSeason) return
    setArchLoading(true)
    fetchSeasonArchive(archYear, archSeason)
      .then(items => setArchData(items))
      .catch(() => setArchData([]))
      .finally(() => setArchLoading(false))
  }, [archYear, archSeason])

  const continueWatching = data.filter(i => i.type === 'anime' && i.userStatus === 'watching')
  const isArchive  = archYear !== null && archSeason !== null
  const ytId       = hero?.trailer?.match(/embed\/([^?]+)/)?.[1]
  const ytThumb    = heroBanner ?? (ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null)
  const gridItems  = isArchive
    ? enrich(archData).filter(i => typeF === 'all' || i.type === typeF)
    : seasonal

  if (loading || !hero) return (
    <div style={{ paddingTop: 28, paddingBottom: 48 }}>
      <div className="shimmer" style={{ marginBottom: 36, borderRadius: 24, height: 460, background: T.surf2 }}/>
      <LoadingGrid count={8}/>
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
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', paddingTop:20, marginBottom:8 }}>
        <button className="pill t" onClick={() => { setArchYear(null); setArchSeason(null) }}
          style={pillStyle(archYear === null)}>
          {t('seasonal.current')}
        </button>
        {ARCH_YEARS.map(y => (
          <button key={y} className="pill t"
            onClick={() => { setArchYear(y); if (!archSeason) setArchSeason('spring') }}
            style={pillStyle(archYear === y)}>
            {y}
          </button>
        ))}
        {archYear !== null && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {SEASON_KEYS.map(s => (
              <button key={s} className="pill t" onClick={() => setArchSeason(s)}
                style={{ ...pillStyle(archSeason === s),
                  background: archSeason === s ? '#0A84FF' : T.surf2,
                  color: archSeason === s ? '#fff' : T.sub }}>
                {t(`seasonal.seasons.${s}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Hero (hidden in archive mode) ── */}
      {!isArchive && (
        <div key={hero.id} className="card hf hero-h" onClick={() => onOpen(hero)}
          style={{ margin:'16px 0 36px', borderRadius:24, overflow:'hidden', height:460,
            position:'relative',
            background:`linear-gradient(135deg,${hero.color},${hero.colorB})`,
            boxShadow:`0 20px 60px ${hero.color}40` }}>

          {/* High-res YouTube thumbnail as background when available */}
          {ytThumb && (
            <img src={ytThumb} alt="" style={{ position:'absolute', inset:0,
              width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top' }}/>
          )}

          {/* Portrait cover on the right */}
          <img src={hero.img} alt="" style={{ position:'absolute', right:0, top:0,
            height:'100%', width: ytThumb ? '45%' : '55%', objectFit:'cover',
            WebkitMaskImage: ytThumb
              ? 'linear-gradient(90deg,transparent 0%,rgba(0,0,0,.45) 30%,#000 60%)'
              : 'linear-gradient(90deg,transparent 0%,rgba(0,0,0,.6) 25%,#000 60%)' }}/>
          <div style={{ position:'absolute', inset:0,
            background:`linear-gradient(90deg,${hero.color} 30%,transparent 70%)` }}/>

          {hero.userStatus && (
            <div style={{ position:'absolute', top:20, right:20, zIndex:2,
              display:'flex', alignItems:'center', gap:7,
              padding:'7px 14px', borderRadius:22,
              background:`${SM[hero.userStatus].dot}28`,
              border:`1px solid ${SM[hero.userStatus].dot}50`,
              backdropFilter:'blur(12px)' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', flexShrink:0,
                background:SM[hero.userStatus].dot,
                boxShadow:`0 0 7px ${SM[hero.userStatus].dot}` }}/>
              <span style={{ fontSize:12, fontWeight:700, color:'#fff',
                letterSpacing:'.03em' }}>{t(`status.${hero.userStatus}`)}</span>
            </div>
          )}

          <div className="hero-pad" style={{ position:'relative', padding:'48px 52px',
            height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
            {hero.airing && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:6,
                padding:'4px 12px', borderRadius:20,
                background:'rgba(255,255,255,.22)', marginBottom:14, alignSelf:'flex-start' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#fff', display:'block' }}/>
                <span style={{ fontSize:12, fontWeight:600, color:'#fff', letterSpacing:'.04em' }}>
                  {t('seasonal.airingBadge')}
                </span>
              </div>
            )}
            <h1 className="hero-title" style={{ fontSize:50, fontWeight:700, color:'#fff',
              letterSpacing:'-.03em', lineHeight:1.05, marginBottom:12,
              textShadow:'0 2px 16px rgba(0,0,0,.25)' }}>{hero.title}</h1>
            <p className="hero-sub" style={{ fontSize:15, color:'rgba(255,255,255,.82)',
              maxWidth:420, lineHeight:1.55, marginBottom:22,
              display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical',
              overflow:'hidden' }}>{hero.synopsis}</p>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:5,
                  padding:'7px 14px', borderRadius:22,
                  background:'rgba(255,255,255,.25)', backdropFilter:'blur(10px)' }}>
                  <span style={{ fontSize:14, color:'#FFD60A' }}>★</span>
                  <span style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{hero.score}</span>
                </div>
                {hero.streaming.slice(0, 2).map(s => (
                  <span key={s} style={{ padding:'7px 14px', borderRadius:22, fontSize:13,
                    fontWeight:600, background:'rgba(255,255,255,.22)',
                    color:'#fff', backdropFilter:'blur(10px)' }}>{s}</span>
                ))}
              </div>
              {airingItems.length > 1 && (
                <div style={{ display:'flex', gap:5 }} onClick={e => e.stopPropagation()}>
                  {airingItems.map((_, i) => (
                    <button key={i} onClick={() => setHeroIdx(i)}
                      style={{ width: i === heroIdx ? 20 : 6, height:6, borderRadius:3,
                        border:'none', padding:0, cursor:'pointer',
                        background: i === heroIdx ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.4)',
                        transition:'all .3s ease' }}/>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Shelves (hidden in archive mode) ── */}

      {!isArchive && (
        <>
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

          {continueWatching.length > 0 && (
            <ShelfRow
              emoji="▶"
              title={t('seasonal.continueWatching')}
              subtitle={t('seasonal.continueWatchingSubtitle')}
              items={continueWatching} loading={false}
              onOpen={onOpen} onStatus={onStatus}/>
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

          <ShelfRow
            title={t('seasonal.airing')}
            subtitle={t('seasonal.airingSubtitle')}
            items={seasonal} loading={false}
            onOpen={onOpen} onStatus={onStatus}
            headerRight={
              <div style={{ display:'flex', gap:6 }}>
                {typeFilters.map(([v, l]) => (
                  <button key={v} className="pill t" onClick={() => setTypeF(v)}
                    style={pillStyle(typeF === v)}>
                    {l}
                  </button>
                ))}
              </div>
            }
          />

          {DISCOVER_KEYS.map(({ key, emoji }) => (
            <LazyShelf key={key}>
              <ShelfRow
                emoji={emoji}
                title={t(`seasonal.sections.${key}.title`)}
                subtitle={t(`seasonal.sections.${key}.subtitle`)}
                items={enrich(sections[key])} loading={loadingSet.has(key)}
                onOpen={onOpen} onStatus={onStatus}/>
            </LazyShelf>
          ))}
        </>
      )}

      {/* ── Grid ── */}
      <div style={{ marginTop:12, marginBottom:48 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <h2 style={{ fontSize:20, fontWeight:700, color:T.txt, letterSpacing:'-.02em' }}>
              {isArchive
                ? `${t(`seasonal.seasons.${archSeason}`)} ${archYear}`
                : t('seasonal.allSeason')}
              {!archLoading && ` (${gridItems.length})`}
            </h2>
            {isArchive && <p style={{ fontSize:13, color:T.sub, marginTop:3 }}>{t('seasonal.archiveLabel')}</p>}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {typeFilters.map(([v, l]) => (
              <button key={v} className="pill t" onClick={() => setTypeF(v)}
                style={pillStyle(typeF === v)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        {archLoading ? <LoadingGrid count={8}/> : (
          <div style={{ display:'grid',
            gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:18 }}>
            {gridItems.map((it, i) => (
              <MediaCard key={it.id} item={it} delay={i * 35}
                onOpen={onOpen} onStatus={onStatus}/>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
