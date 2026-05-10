import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { fetchAnilistData } from '../services/anilist'

function parseEpNum(title) {
  const m = title?.match(/Episode\s+(\d+)/i)
  return m ? parseInt(m[1]) : null
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IconWatchAgain() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
    </svg>
  )
}

export function WatchPanel({ item, onEp, onStatus }) {
  const { T, dark } = useTheme()
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  const [state,     setState]     = useState('loading')
  const [anilistId, setAnilistId] = useState(null)
  const [epCount,   setEpCount]   = useState(null)
  const [epDuration,setEpDuration]= useState(null)
  const [streamEps, setStreamEps] = useState({})
  const [activeEp,  setActiveEp]  = useState(null)
  const [lang,      setLang]      = useState('sub')
  const [quality,   setQuality]   = useState('auto')
  const [hoveredEp, setHoveredEp] = useState(null)

  const markedRef = useRef(false)
  useEffect(() => { markedRef.current = false }, [activeEp])

  useEffect(() => {
    let cancelled = false
    setState('loading')
    setAnilistId(null)
    setEpCount(null)
    setStreamEps({})
    setActiveEp(null)

    ;(async () => {
      const anilist = await fetchAnilistData(item.id)
      if (cancelled) return
      if (!anilist) { setState('notFound'); return }
      setAnilistId(anilist.anilistId)
      setEpCount(anilist.episodes)
      setEpDuration(anilist.duration)

      // Build episode map from AniList streamingEpisodes (thumbnails + titles)
      const epMap = {}
      anilist.streamingEpisodes.forEach(ep => {
        const num = parseEpNum(ep.title)
        if (num) epMap[num] = { thumbnail: ep.thumbnail ?? null, title: ep.title ?? null, airdate: null }
      })
      // Add airdates from airingSchedule (Unix timestamp → date string)
      anilist.airingSchedule.forEach(({ episode, airingAt }) => {
        const airdate = new Date(airingAt * 1000).toISOString().split('T')[0]
        if (epMap[episode]) {
          epMap[episode].airdate = airdate
        } else {
          epMap[episode] = { thumbnail: null, title: null, airdate }
        }
      })
      setStreamEps(epMap)
      setState('ready')
    })()

    return () => { cancelled = true }
  }, [item.id])

  useEffect(() => {
    if (activeEp === null) return
    function handleMessage(event) {
      if (event.origin !== 'https://megaplay.buzz') return
      let data = event.data
      if (typeof data === 'string') { try { data = JSON.parse(data) } catch { return } }
      let reached85 = false
      if (data.type === 'watching-log' && data.duration > 0) reached85 = data.currentTime / data.duration >= 0.85
      if (data.event === 'time' && typeof data.percent === 'number')  reached85 = data.percent >= 0.85
      if (data.event === 'complete') reached85 = true
      if (!reached85 || markedRef.current) return
      if (activeEp <= (item.userEp ?? 0)) return
      markedRef.current = true
      onEp?.(item.id, activeEp)
      if (item.userStatus === 'plan_to_watch') onStatus?.(item.id, 'watching')
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [activeEp, item.id, item.userEp, item.userStatus, onEp, onStatus])

  const maxFromStreamEps = Object.keys(streamEps).reduce((max, k) => {
    const n = Number(k)
    return isNaN(n) ? max : Math.max(max, n)
  }, 0)
  const count    = epCount ?? Math.max(maxFromStreamEps, (item.userEp ?? 0) + 1)
  const episodes = Array.from({ length: count }, (_, i) => i + 1)

  // Filter out episodes with a confirmed future airdate — everything else shows
  const today = new Date().toISOString().split('T')[0]
  const airedEps = episodes.filter(ep => {
    const airdate = streamEps[ep]?.airdate
    if (!airdate) return true   // no known date = assume released
    return airdate <= today     // has date = show only if already aired
  })
  const pendingCount = Math.max(0, (epCount ?? 0) - airedEps.length)

  const embedUrl = activeEp !== null && anilistId
    ? `https://megaplay.buzz/stream/ani/${anilistId}/${activeEp}/${lang}${quality !== 'auto' ? `?quality=${quality}` : ''}`
    : null

  const LANGS = isMobile
    ? [{ code: 'sub', label: 'Sub' }, { code: 'dub', label: 'EN' }, { code: 'pt-br', label: 'PT' }]
    : [{ code: 'sub', label: 'Sub' }, { code: 'dub', label: 'EN' }, { code: 'pt-br', label: 'PT-BR' }, { code: 'es', label: 'ES' }]

  return (
    <div style={{ marginBottom: 28 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: T.txt }}>{t('premium.watchOnline')}</p>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
            background: 'linear-gradient(135deg,#FFD700,#FF9F0A)', color: '#000', letterSpacing: '.04em' }}>
            {t('premium.badge')}
          </span>
        </div>

        {state === 'ready' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isMobile && (
              <>
                <div style={{ display: 'flex', gap: 3 }}>
                  {['auto', '1080', '720', '480'].map(q => (
                    <button key={q} className="t" onClick={() => setQuality(q)}
                      style={{ padding: '4px 9px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        fontSize: 11, fontWeight: 600,
                        background: quality === q ? '#FF9F0A' : (dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.07)'),
                        color: quality === q ? '#000' : T.sub }}>
                      {q === 'auto' ? 'Auto' : `${q}p`}
                    </button>
                  ))}
                </div>
                <div style={{ width: 1, height: 16, background: dark ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.12)' }}/>
              </>
            )}
            <div style={{ display: 'flex', gap: 3 }}>
              {LANGS.map(({ code, label }) => (
                <button key={code} className="t" onClick={() => setLang(code)}
                  style={{ padding: '4px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 600,
                    background: lang === code ? '#0A84FF' : (dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.07)'),
                    color: lang === code ? '#fff' : T.sub }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {state === 'loading' && <p style={{ fontSize: 13, color: T.sub }}>{t('premium.loading')}</p>}
      {state === 'notFound' && <p style={{ fontSize: 13, color: T.sub, fontStyle: 'italic' }}>{t('premium.notAvailable')}</p>}

      {state === 'ready' && (
        <>
          {/* ── Player ── */}
          {activeEp !== null && (
            <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 14,
              overflow: 'hidden', background: '#000', marginBottom: 20 }}>
              <iframe
                key={`${anilistId}-${activeEp}-${lang}-${quality}`}
                src={embedUrl}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                allow="autoplay; fullscreen; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
                allowFullScreen
              />
            </div>
          )}

          {/* ── Episode cards grid ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: 10,
          }}>
            {airedEps.map((ep) => {
              const streamEp  = streamEps[ep]
              const thumbnail = streamEp?.thumbnail ?? null
              const rawTitle  = streamEp?.title ?? ''
              const epTitle   = rawTitle.replace(/^Episode\s+\d+\s*[-–]\s*/i, '').trim()
              const active    = activeEp === ep
              const watched   = ep <= (item.userEp ?? 0)
              const hovered   = hoveredEp === ep

              return (
                <div key={ep}
                  className="t"
                  onClick={() => setActiveEp(ep)}
                  onMouseEnter={() => setHoveredEp(ep)}
                  onMouseLeave={() => setHoveredEp(null)}
                  style={{
                    cursor: 'pointer', borderRadius: 12, overflow: 'hidden',
                    background: T.surf,
                    border: `1.5px solid ${active ? item.color : T.bord}`,
                    boxShadow: active ? `0 0 0 3px ${item.color}30` : 'none',
                    transition: 'border-color .15s, box-shadow .15s',
                  }}>

                  {/* Thumbnail */}
                  <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden',
                    background: dark ? '#2C2C2E' : '#e0e0e0' }}>

                    {thumbnail ? (
                      <img src={thumbnail} alt="" loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                          opacity: watched && !active ? 0.5 : 1, transition: 'opacity .2s' }}/>
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 26, opacity: 0.2 }}>▶</span>
                      </div>
                    )}

                    {/* Watched overlay */}
                    {watched && !active && (
                      <div style={{ position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,.56)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 5,
                        transition: 'background .15s' }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          border: '2px solid rgba(255,255,255,.75)',
                          background: 'rgba(255,255,255,.1)',
                          backdropFilter: 'blur(4px)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {hovered ? <IconWatchAgain /> : <IconCheck />}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff',
                          letterSpacing: '.04em', textTransform: 'uppercase' }}>
                          {hovered ? 'Watch Again' : 'Watched'}
                        </span>
                      </div>
                    )}

                    {/* Active play indicator (not watched) */}
                    {active && (
                      <div style={{ position: 'absolute', inset: 0,
                        border: `3px solid ${item.color}`, borderRadius: 11,
                        pointerEvents: 'none' }}/>
                    )}

                    {/* Episode number badge */}
                    <div style={{ position: 'absolute', top: 6, left: 6,
                      padding: '2px 7px', borderRadius: 6,
                      background: active ? item.color : 'rgba(0,0,0,.65)',
                      backdropFilter: 'blur(6px)' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>
                        EP {ep}
                      </span>
                    </div>

                    {/* Duration badge */}
                    {epDuration && (
                      <div style={{ position: 'absolute', bottom: 6, right: 6,
                        padding: '2px 6px', borderRadius: 6,
                        background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.85)' }}>
                          {epDuration}m
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Episode info */}
                  <div style={{ padding: '8px 10px 10px' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: active ? item.color : T.txt,
                      lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      transition: 'color .15s' }}>
                      {epTitle || `${t('premium.ep')} ${ep}`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Coming soon indicator */}
          {pendingCount > 0 && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 12,
              background: 'rgba(255,159,10,.08)', border: '1px solid rgba(255,159,10,.18)' }}>
              <span style={{ fontSize: 14 }}>📅</span>
              <p style={{ fontSize: 12, color: '#FF9F0A', fontWeight: 500 }}>
                {pendingCount} episode{pendingCount > 1 ? 's' : ''} not yet released
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
