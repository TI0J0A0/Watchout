import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useTmdbPosterBatch } from '../hooks/useTmdbPosterBatch'
import {
  fetchUpcoming, fetchSeasonal, fetchSeasonalTrailers,
  fetchRecommendations, fetchCandidatesByGenres,
} from '../services/jikan'
import { fetchLatestTrailers } from '../services/anilist'
import {
  NEWS_PAGE_DEFAULT_TAB, NEWS_PAGE_TABS, TRAILERS_REFRESH_MS,
  readSeenTrailers, annotateNewTrailers, persistSeenTrailers,
} from './newsPageState'

function toAutoplayUrl(url) {
  try {
    const u = new URL(url)
    u.searchParams.set('autoplay', '1')
    return u.toString()
  } catch {
    return url + (url.includes('?') ? '&' : '?') + 'autoplay=1'
  }
}

function useTilt(maxDeg = 10) {
  const ref = useRef(null)
  const [t, setT] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, on: false })
  const [canTilt, setCanTilt] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = event => setCanTilt(event.matches)
    setCanTilt(hoverQuery.matches)
    if (hoverQuery.addEventListener) {
      hoverQuery.addEventListener('change', update)
      return () => hoverQuery.removeEventListener('change', update)
    }
    hoverQuery.addListener(update)
    return () => hoverQuery.removeListener(update)
  }, [])

  const move = (e) => {
    if (!canTilt) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top)  / r.height
    setT({ rx: (0.5 - y) * maxDeg * 2, ry: (x - 0.5) * maxDeg * 2, gx: x * 100, gy: y * 100, on: true })
  }

  const leave = () => {
    if (!canTilt) return
    setT({ rx: 0, ry: 0, gx: 50, gy: 50, on: false })
  }

  const tiltStyle = {
    transform: canTilt ? `perspective(700px) rotateX(${t.rx}deg) rotateY(${t.ry}deg) scale(${t.on ? 1.03 : 1})` : undefined,
    transition: canTilt ? (t.on ? 'transform 0.08s linear' : 'transform 0.5s cubic-bezier(0.23,1,0.32,1)') : undefined,
    willChange: canTilt ? 'transform' : 'auto',
  }

  return { ref, tiltStyle, gx: t.gx, gy: t.gy, on: canTilt && t.on, move, leave }
}

function TrailerCard({ item, isPlaying, onToggle, T, getPosterUrl }) {
  const { ref, tiltStyle, gx, gy, on, move, leave } = useTilt(7)

  if (isPlaying) {
    return (
      <div style={{ borderRadius: 14, overflow: 'hidden', background: T.surf, border: `1px solid ${T.bord}` }}>
        <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
          <iframe src={toAutoplayUrl(item.trailer)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
        </div>
        <div className="t" onClick={onToggle} style={{ padding: '12px 14px', cursor: 'pointer' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: T.txt, marginBottom: 2 }}>{item.title}</p>
          <p style={{ fontSize: 12, color: T.sub }}>{item.studio} · {item.year}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className="t" onClick={onToggle}
      onMouseMove={move} onMouseLeave={leave}
      style={{ ...tiltStyle, position: 'relative', borderRadius: 14, overflow: 'hidden',
        cursor: 'pointer', background: T.surf, border: `1px solid ${T.bord}` }}>

      {on && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', borderRadius: 14,
          background: `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.14) 0%, transparent 60%)` }}/>
      )}

      <div style={{ position: 'relative', paddingBottom: '56.25%', background: item.color }}>
        <img src={getPosterUrl(item)} alt={item.title} loading="lazy"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'top' }} />
        <div style={{ position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,.08), rgba(0,0,0,.55))' }} />
        {item.isNew && (
          <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 3,
            fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
            background: '#FF2D55', color: '#fff', letterSpacing: '.05em',
            boxShadow: '0 2px 10px rgba(255,45,85,.45)' }}>NEW</span>
        )}
        {item.status === 'NOT_YET_RELEASED' && (
          <span style={{ position: 'absolute', top: 8, right: 8, zIndex: 3,
            fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6,
            background: 'rgba(0,0,0,.6)', color: '#FFD60A', letterSpacing: '.04em',
            backdropFilter: 'blur(6px)' }}>SOON</span>
        )}
        <div style={{ position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(255,255,255,.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, paddingLeft: 3, boxShadow: '0 4px 20px rgba(0,0,0,.35)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            transform: on ? 'scale(1.1)' : 'scale(1)' }}>▶</div>
        </div>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: T.txt, marginBottom: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
        <p style={{ fontSize: 12, color: T.sub }}>{item.studio} · {item.year}</p>
      </div>
    </div>
  )
}

function NewsCard({ item, onOpen, badge, badgeColor, T, getPosterUrl }) {
  const { ref, tiltStyle, gx, gy, on, move, leave } = useTilt(12)

  return (
    <div ref={ref} className="t" onClick={() => onOpen(item)}
      onMouseMove={move} onMouseLeave={leave}
      style={{ ...tiltStyle, position: 'relative', borderRadius: 14, overflow: 'hidden',
        cursor: 'pointer', background: T.surf, border: `1px solid ${T.bord}` }}>

      {on && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', borderRadius: 14,
          background: `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.16) 0%, transparent 55%)` }}/>
      )}

      <div style={{ position: 'relative', paddingBottom: '140%' }}>
        <img src={getPosterUrl(item)} alt={item.title}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 55%, rgba(0,0,0,.55) 100%)' }} />
        {badge && (
          <span style={{ position: 'absolute', top: 8, left: 8,
            fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6,
            background: badgeColor, color: '#fff', letterSpacing: '.04em' }}>{badge}</span>
        )}
      </div>
      <div style={{ padding: '10px 12px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: T.txt, marginBottom: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
        <p style={{ fontSize: 11, color: T.sub }}>{item.studio}</p>
      </div>
    </div>
  )
}

function Spinner({ T }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%',
        border: `3px solid ${T.bord}`, borderTopColor: '#0A84FF',
        animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function formatClock(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function NewsPage({ data, loading, onOpen }) {
  const { T, dark } = useTheme()
  const { t }       = useTranslation()

  const [tab, setTab]                         = useState(NEWS_PAGE_DEFAULT_TAB)
  const [upcoming, setUpcoming]               = useState([])
  const [upcomingLoading, setUpcomingLoading] = useState(true)
  const [onAir, setOnAir]                     = useState([])
  const [onAirLoading, setOnAirLoading]       = useState(true)
  const [playing, setPlaying]                 = useState(null)

  // ── Auto-refreshing trailer feed (AniList) merged with library trailers ──
  const [feedTrailers, setFeedTrailers]   = useState([])
  const [trailersLoading, setTrailersLoading] = useState(true)
  const [refreshing, setRefreshing]       = useState(false)
  const [lastUpdated, setLastUpdated]     = useState(null)
  const [genreFilter, setGenreFilter]     = useState(null)
  const [newOnly, setNewOnly]             = useState(false)
  const seenRef = useRef(null)

  // ── "For You" recommendations, driven by the user's watch history ──
  const [becauseRows, setBecauseRows]   = useState([])
  const [suggested, setSuggested]       = useState([])
  const [forYouLoading, setForYouLoading] = useState(true)
  const forYouKey = useRef(null)

  const watched = useMemo(() =>
    data.filter(item => item.userStatus === 'watching' || item.userStatus === 'completed'),
  [data])

  const libraryIds = useMemo(() =>
    new Set(data.filter(item => item.userStatus != null).map(item => item.id)),
  [data])

  useEffect(() => {
    // Seed recommendations from the user's best-rated watched titles.
    const seeds = [...watched]
      .sort((a, b) => (b.userScore ?? 0) - (a.userScore ?? 0) || (b.userEp ?? 0) - (a.userEp ?? 0))
      .slice(0, 3)
    const key = seeds.map(item => item.id).join(',')
    if (forYouKey.current === key) return
    forYouKey.current = key

    if (!seeds.length) {
      setBecauseRows([])
      setSuggested([])
      setForYouLoading(false)
      return
    }

    let cancelled = false
    setForYouLoading(true)
    ;(async () => {
      const results = await Promise.allSettled(seeds.map(seed => fetchRecommendations(seed.id)))
      const rows = results
        .map((res, i) => ({
          source: seeds[i],
          items: res.status === 'fulfilled'
            ? res.value.filter(item => !libraryIds.has(item.id))
            : [],
        }))
        .filter(row => row.items.length > 0)

      // "You'll probably like" — top titles from the watcher's favourite genres,
      // excluding anything already in the library or already recommended above.
      const genres = [...new Set(watched.flatMap(item => item.genres ?? []))].slice(0, 4)
      const pool = await fetchCandidatesByGenres(genres, { perGenre: 12 }).catch(() => [])
      const recommendedIds = new Set(rows.flatMap(row => row.items.map(item => item.id)))
      const probable = pool
        .filter(item => !libraryIds.has(item.id) && !recommendedIds.has(item.id))
        .slice(0, 12)

      if (!cancelled) {
        setBecauseRows(rows)
        setSuggested(probable)
        setForYouLoading(false)
      }
    })().catch(() => { if (!cancelled) setForYouLoading(false) })
    return () => { cancelled = true }
  }, [watched, libraryIds])

  // Currently-airing season feed (Jikan /seasons/now) — loaded automatically
  // and refreshed on the same cycle as the trailers, no manual reload needed.
  const loadOnAir = useRef(async () => {})
  loadOnAir.current = async () => {
    try {
      const fetched = await fetchSeasonal()
      if (fetched.length) setOnAir(fetched)
    } catch {
      /* keep previous list on failure */
    } finally {
      setOnAirLoading(false)
    }
  }

  const loadTrailers = useRef(async (isManual = false) => {})
  loadTrailers.current = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      let fetched = await fetchLatestTrailers().catch(() => [])
      // Fall back to Jikan's seasonal feed if AniList returns nothing.
      if (!fetched.length) fetched = await fetchSeasonalTrailers().catch(() => [])
      if (seenRef.current === null) seenRef.current = readSeenTrailers()
      const { annotated, nextSeen } = annotateNewTrailers(fetched, seenRef.current)
      seenRef.current = nextSeen
      persistSeenTrailers(nextSeen)
      setFeedTrailers(annotated)
      setLastUpdated(Date.now())
    } catch {
      /* keep previous feed on failure */
    } finally {
      setTrailersLoading(false)
      if (isManual) setRefreshing(false)
    }
  }

  // Initial load + interval auto-refresh + refresh when tab regains focus.
  useEffect(() => {
    loadTrailers.current()
    loadOnAir.current()
    const interval = setInterval(() => {
      loadTrailers.current()
      loadOnAir.current()
    }, TRAILERS_REFRESH_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadTrailers.current()
        loadOnAir.current()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    fetchUpcoming()
      .then(setUpcoming)
      .catch(() => {})
      .finally(() => setUpcomingLoading(false))
  }, [])

  // Trailers come exclusively from the auto-refreshed release feed — the
  // user's library never leaks into this tab.
  const trailers = feedTrailers

  const trailerGenres = useMemo(() => {
    const set = new Set()
    for (const item of trailers) for (const g of (item.genres ?? [])) set.add(g)
    return [...set].sort().slice(0, 12)
  }, [trailers])

  const visibleTrailers = useMemo(() => {
    return trailers.filter(item => {
      if (newOnly && !item.isNew) return false
      if (genreFilter && !(item.genres ?? []).includes(genreFilter)) return false
      return true
    })
  }, [trailers, newOnly, genreFilter])

  const newCount = useMemo(() => trailers.filter(item => item.isNew).length, [trailers])

  // "On Air" = auto-fetched current season feed only (release-based, not the
  // user's library).
  const releases = useMemo(() => onAir.filter(item => item.airing), [onAir])

  const forYouCount = suggested.length + becauseRows.reduce((n, row) => n + row.items.length, 0)
  const tabCounts = {
    trailers: trailers.length, onair: releases.length,
    upcoming: upcoming.length, foryou: forYouCount,
  }
  const tabs = NEWS_PAGE_TABS.map(item => ({ ...item, label: t(item.labelKey), count: tabCounts[item.id] ?? 0 }))

  // Fetch TMDB posters for all items
  const allItems = [...trailers, ...releases, ...upcoming, ...suggested, ...becauseRows.flatMap(row => row.items)]
  const tmdbPosterBatch = useTmdbPosterBatch(allItems)

  // Helper to get TMDB poster with fallback
  const getPosterUrl = (item) => tmdbPosterBatch[item?.id] ?? item?.img ?? null

  return (
    <div className="fu" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <p style={{ fontSize: 13, color: T.sub, marginBottom: 3 }}>{t('news.subtitle')}</p>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: T.txt, letterSpacing: '-.02em', marginBottom: 20 }}>
        {t('news.title')}
      </h2>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28,
        overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 2 }}>
        {tabs.map(({ id, label, count }) => {
          const active = tab === id
          return (
            <button key={id} className="t" onClick={() => setTab(id)}
              style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 600 : 500, whiteSpace: 'nowrap', flexShrink: 0,
                background: active
                  ? (dark ? 'rgba(10,132,255,.18)' : 'rgba(10,132,255,.1)')
                  : T.surf2,
                color: active ? '#0A84FF' : T.sub,
                boxShadow: active ? 'inset 0 0 0 1px rgba(10,132,255,.25)' : 'none' }}>
              {label}
              {count > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600,
                  background: active ? 'rgba(10,132,255,.2)' : (dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)'),
                  color: active ? '#0A84FF' : T.sub,
                  padding: '1px 6px', borderRadius: 10 }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Trailers */}
      {tab === 'trailers' && (
        <>
          {/* Filter + refresh bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            <button className="t" onClick={() => setNewOnly(v => !v)}
              style={{ padding: '6px 13px', borderRadius: 18, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                background: newOnly ? '#FF2D55' : T.surf2,
                color: newOnly ? '#fff' : T.sub }}>
              ✨ {t('news.newOnly')}{newCount > 0 ? ` (${newCount})` : ''}
            </button>

            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none',
              flex: 1, minWidth: 0 }}>
              <button className="t" onClick={() => setGenreFilter(null)}
                style={{ padding: '6px 13px', borderRadius: 18, border: 'none', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: genreFilter === null ? 700 : 500, whiteSpace: 'nowrap', flexShrink: 0,
                  background: genreFilter === null ? (dark ? 'rgba(10,132,255,.18)' : 'rgba(10,132,255,.1)') : T.surf2,
                  color: genreFilter === null ? '#0A84FF' : T.sub }}>
                {t('news.allGenres')}
              </button>
              {trailerGenres.map(g => {
                const active = genreFilter === g
                return (
                  <button key={g} className="t" onClick={() => setGenreFilter(active ? null : g)}
                    style={{ padding: '6px 13px', borderRadius: 18, border: 'none', cursor: 'pointer',
                      fontSize: 12.5, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap', flexShrink: 0,
                      background: active ? (dark ? 'rgba(10,132,255,.18)' : 'rgba(10,132,255,.1)') : T.surf2,
                      color: active ? '#0A84FF' : T.sub }}>
                    {g}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
              {lastUpdated && (
                <span style={{ fontSize: 11, color: T.sub, whiteSpace: 'nowrap' }}>
                  {t('news.updatedAt', { time: formatClock(lastUpdated) })}
                </span>
              )}
              <button className="t" onClick={() => loadTrailers.current(true)} disabled={refreshing}
                aria-label={t('news.refresh')}
                style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  border: `1px solid ${T.bord}`, background: T.surf, color: T.sub,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: refreshing ? 'default' : 'pointer', opacity: refreshing ? .6 : 1 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
                  style={{ animation: refreshing ? 'spin .7s linear infinite' : 'none' }}>
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </button>
            </div>
          </div>

          {trailersLoading && trailers.length === 0 ? <Spinner T={T} /> :
          visibleTrailers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontSize: 38, opacity: .14, marginBottom: 10 }}>▶</p>
              <p style={{ fontSize: 14, color: T.sub }}>{t('news.noTrailers')}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
              {visibleTrailers.map(item => (
                <TrailerCard key={item.id} item={item} T={T} getPosterUrl={getPosterUrl}
                  isPlaying={playing === item.id}
                  onToggle={() => setPlaying(playing === item.id ? null : item.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* On Air */}
      {tab === 'onair' && (
        (loading || onAirLoading) && releases.length === 0 ? <Spinner T={T} /> :
        releases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 38, opacity: .14, marginBottom: 10 }}>📡</p>
            <p style={{ fontSize: 14, color: T.sub }}>{t('news.noOnAir')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 18 }}>
            {releases.map(item => (
              <NewsCard key={item.id} item={item} onOpen={onOpen} T={T} getPosterUrl={getPosterUrl}
                badge={t('seasonal.airingBadge')} badgeColor="#34C759" />
            ))}
          </div>
        )
      )}

      {/* Upcoming */}
      {tab === 'upcoming' && (
        upcomingLoading ? <Spinner T={T} /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 18 }}>
            {upcoming.map(item => (
              <NewsCard key={item.id} item={item} onOpen={onOpen} T={T} getPosterUrl={getPosterUrl}
                badge="SOON" badgeColor="#FF9F0A" />
            ))}
          </div>
        )
      )}

      {/* For You — recommendations based on the user's watch history */}
      {tab === 'foryou' && (
        forYouLoading ? <Spinner T={T} /> :
        suggested.length === 0 && becauseRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 38, opacity: .14, marginBottom: 10 }}>✨</p>
            <p style={{ fontSize: 14, color: T.sub }}>{t('news.forYouEmpty')}</p>
          </div>
        ) : (
          <>
            {suggested.length > 0 && (
              <div style={{ marginBottom: 34 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: T.txt, marginBottom: 2 }}>
                  {t('news.probablyLike')}
                </h3>
                <p style={{ fontSize: 12.5, color: T.sub, marginBottom: 14 }}>
                  {t('news.probablyLikeSubtitle')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 18 }}>
                  {suggested.map(item => (
                    <NewsCard key={item.id} item={item} onOpen={onOpen} T={T} getPosterUrl={getPosterUrl}
                      badge="FOR YOU" badgeColor="#BF5AF2" />
                  ))}
                </div>
              </div>
            )}
            {becauseRows.map(row => (
              <div key={row.source.id} style={{ marginBottom: 34 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: T.txt, marginBottom: 14 }}>
                  {t('news.becauseYouWatched', { title: row.source.title })}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 18 }}>
                  {row.items.map(item => (
                    <NewsCard key={item.id} item={item} onOpen={onOpen} T={T} getPosterUrl={getPosterUrl}
                      badge="FOR YOU" badgeColor="#BF5AF2" />
                  ))}
                </div>
              </div>
            ))}
          </>
        )
      )}
    </div>
  )
}
