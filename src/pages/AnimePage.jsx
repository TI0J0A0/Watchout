import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SM, SC, STREAMING_URLS } from '../constants'
import { useTheme } from '../context/ThemeContext'
import { useClickOutside } from '../hooks/useClickOutside'
import { useIsMobile } from '../hooks/useIsMobile'
import { WatchPanel } from '../components/WatchPanel'
import { fmt } from '../utils'
import { getStreamingProviderName, getStreamingProviderUrl } from '../utils/streaming'
import { getSafeExternalLinkProps } from '../utils/externalLinks'
import { useFocusScope } from '../hooks/useTVNavigation'
import { isAndroidTV } from '../utils/platform'
import { fetchRecommendations, fetchRelations, fetchAnimeById, fetchCharacters, fetchAnimePictures } from '../services/jikan'
import { fetchAnilistBanner } from '../services/anilist'

function fmtDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusInfo(a, T) {
  if (a.comingSoon) return { label: 'Not yet aired', color: '#FF9F0A' }
  if (a.airing)     return { label: 'Airing', color: '#34C759' }
  return { label: 'Finished', color: T.sub }
}

// Embedded "The Anime Community" comment section (theanimecommunity.com).
// The widget renders in a cross-origin iframe and is driven by the global
// `window.theAnimeCommunityConfig`. Because it's cross-origin, colorScheme must
// use concrete CSS colors (the resolved palette), not CSS vars.
function TacComments({ malId, color }) {
  const { T, dark } = useTheme()
  const containerRef = useRef(null)

  useEffect(() => {
    if (!malId) return
    window.theAnimeCommunityConfig = {
      MAL_ID: String(malId),
      episodeChapterNumber: '0',   // series-level / overview comment section
      mediaType: 'anime',
      removeBorder: 'true',
      removePadding: 'true',
      colorScheme: {
        primaryColor:       color,   // buttons + sort dropdown
        backgroundColor:    T.bg,
        dropDownTextColor:  T.txt,
        strongTextColor:    T.txt,   // usernames + TAC logo
        primaryTextColor:   T.txt,   // comment + input text
        secondaryTextColor: T.sub,   // counts, "sort by", timestamps
        iconColor:          T.sub,   // like / dislike / reply
        accentColor:        `${color}66`, // separator lines
      },
    }
    // Already bootstrapped → swap media in-place (SPA navigation between titles).
    if (window.theAnimeCommunity?.reload) {
      window.theAnimeCommunity.reload()
      return
    }
    // First load → inject the loader script (it self-guards against double load).
    const script = document.createElement('script')
    script.src = 'https://theanimecommunity.com/embed.js'
    script.id = 'anime-community-script'
    script.defer = true
    containerRef.current?.appendChild(script)
  }, [malId, dark, color])

  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: T.sub, letterSpacing: '.08em',
        textTransform: 'uppercase', marginBottom: 6 }}>
        The Watchout Community
      </p>
      <p style={{ fontSize: 18, fontWeight: 800, color: T.txt, letterSpacing: '-.02em', marginBottom: 18 }}>
        Comments
      </p>
      <div id="anime-community-comment-section" ref={containerRef} />
    </div>
  )
}

// ── Two-column key/value metadata grid (AniList-style) ──
function MetaGrid({ rows, T }) {
  const visible = rows.filter(r => r.value != null && r.value !== '' && r.value !== '—')
  if (!visible.length) return null
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '14px 28px',
      padding: '20px 22px', borderRadius: 18,
      background: T.surf, border: `1px solid ${T.bord}`,
    }}>
      {visible.map(r => (
        <div key={r.label} style={{ minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: T.sub, letterSpacing: '.04em',
            textTransform: 'uppercase', marginBottom: 4 }}>{r.label}</p>
          {r.href ? (
            <a {...getSafeExternalLinkProps(r.href)} style={{
              fontSize: 13.5, fontWeight: 600, color: r.color || '#0A84FF', wordBreak: 'break-word' }}>
              {r.value}
            </a>
          ) : (
            <p style={{ fontSize: 13.5, fontWeight: 600, color: r.color || T.txt, wordBreak: 'break-word' }}>
              {r.value}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

export function AnimePage({ item, onClose, onStatus, onScore, onEp, onNotes, onOpen, isPremium = false, onLogin }) {
  const { T, dark } = useTheme()
  const { t }       = useTranslation()
  const [menu,      setMenu]      = useState(false)
  const [recs,      setRecs]      = useState([])
  const [chars,     setChars]     = useState([])
  const [banner,    setBanner]    = useState(null)
  const [detail,    setDetail]    = useState(null)
  const [synExpand, setSynExpand] = useState(false)
  const [noteText,  setNoteText]  = useState(item?.userNotes ?? '')
  const [noteSaved, setNoteSaved] = useState(false)
  const [relations, setRelations] = useState([])
  const [showTrailer, setShowTrailer] = useState(false)
  const [pictures,  setPictures]  = useState([])
  const [tab,       setTab]       = useState('overview')
  const menuRef      = useRef(null)
  const noteSaveTimer = useRef(null)
  const scopeRef     = useRef(null)
  useClickOutside(menuRef, () => setMenu(false))
  const isMobile = useIsMobile()
  // On Android TV, trap D-Pad focus inside this overlay and restore it on close.
  useFocusScope(scopeRef, isAndroidTV())

  useEffect(() => {
    if (!item) return
    setSynExpand(false)
    setBanner(null)
    setDetail(null)
    setNoteText(item?.userNotes ?? '')
    setNoteSaved(false)
    setRelations([])
    setShowTrailer(false)
    setPictures([])
    setTab('overview')
    fetchRecommendations(item.id).then(setRecs).catch(() => {})
    fetchRelations(item.id).then(setRelations).catch(() => {})
    fetchAnimeById(item.id).then(setDetail).catch(() => {})
    fetchAnimePictures(item.id).then(setPictures).catch(() => {})
    setChars([])
    fetchAnilistBanner(item.id)
      .then(({ bannerImage, characters }) => {
        setBanner(bannerImage)
        if (characters.length) setChars(characters)
        // AniList down/empty → fall back to Jikan so characters still render.
        else fetchCharacters(item.id).then(setChars).catch(() => {})
      })
      .catch(() => {
        fetchCharacters(item.id).then(setChars).catch(() => {})
      })
  }, [item?.id])

  function handleNote(val) {
    setNoteText(val)
    setNoteSaved(false)
    onNotes(item.id, val)
    clearTimeout(noteSaveTimer.current)
    noteSaveTimer.current = setTimeout(() => setNoteSaved(true), 900)
  }

  if (!item) return null

  // Merge the richer /full payload over the list item, but always keep the
  // user-specific tracking fields from the live item (detail has them null).
  const a = detail
    ? { ...detail, color: item.color, colorB: item.colorB,
        userStatus: item.userStatus, userScore: item.userScore,
        userEp: item.userEp, userNotes: item.userNotes }
    : item

  const sm = SM[a.userStatus]
  const st = statusInfo(a, T)

  const mainChars = chars.filter(c => c.role === 'Main')
  const supChars  = chars.filter(c => c.role !== 'Main')
  const allChars  = [...mainChars, ...supChars]

  const typeLabel = a.format
    || (a.type === 'anime' ? t('anime.typeAnime')
        : a.type === 'series' ? t('anime.typeSeries')
        : t('anime.typeFilm'))

  const metaRows = [
    { label: 'Format',   value: typeLabel },
    { label: 'Status',   value: st.label, color: st.color },
    { label: 'Episodes', value: a.eps || null },
    { label: 'Score',    value: a.score ? `${a.score} / 10` : null, color: a.color },
    { label: 'Duration', value: a.duration ? `${a.duration} min` : null },
    { label: 'Season',   value: a.season ? `${a.season} ${a.year}` : (a.year || null) },
    { label: 'Start Date', value: fmtDate(a.startDate) },
    { label: 'End Date',   value: fmtDate(a.endDate) || (a.airing ? 'Ongoing' : null) },
    { label: 'Source',   value: a.source },
    { label: 'Members',  value: a.members ? fmt(a.members) : null },
    { label: 'Country',  value: 'Japan' },
    { label: 'Studios',  value: a.studio && a.studio !== '—' ? a.studio : null },
    { label: 'Official Site', value: a.officialSite ? 'Visit ↗' : null, href: a.officialSite },
  ]

  const TABS = [
    { id: 'overview',   label: 'Overview' },
    { id: 'characters', label: `Characters${allChars.length ? ` ${allChars.length}` : ''}` },
    { id: 'artwork',    label: 'Artwork' },
    { id: 'episodes',   label: 'Episodes' },
  ]

  const PAD = isMobile ? '0 16px' : '0 40px'

  // ── Sidebar: tracking widget + recommendations ──
  const sidebar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Tracking card */}
      <div style={{ padding: 18, borderRadius: 18, background: T.surf, border: `1px solid ${T.bord}` }}>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button className="t" onClick={() => setMenu(!menu)} style={{
            width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            background: sm ? `${sm.dot}18` : a.color,
            color: sm ? sm.color : '#fff',
            outline: sm ? `1.5px solid ${sm.dot}30` : 'none',
            boxShadow: sm ? 'none' : `0 4px 16px ${a.color}40`,
          }}>
            {sm ? `${t(`status.${a.userStatus}`)} ▾` : t('anime.addToList')}
          </button>
          {menu && (
            <div className="sc" style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
              background: dark ? '#1C1C1E' : '#fff', borderRadius: 14, padding: 7, zIndex: 20,
              border: `1px solid ${T.bord}`,
              boxShadow: `0 10px 40px rgba(0,0,0,${dark ? .4 : .14})`,
            }}>
              {Object.entries(SM).map(([s, m]) => (
                <button key={s} className="t" onClick={() => { onStatus(a.id, s); setMenu(false) }}
                  style={{
                    display: 'flex', width: '100%', padding: '9px 12px', borderRadius: 9,
                    border: 'none', cursor: 'pointer',
                    background: a.userStatus === s ? `${m.dot}14` : 'transparent',
                    color: m.color, fontSize: 13.5, fontWeight: 500, gap: 10, alignItems: 'center', textAlign: 'left',
                  }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.dot, flexShrink: 0 }}/>
                  {t(`status.${s}`)}
                </button>
              ))}
              {a.userStatus && (
                <button className="t" onClick={() => { onStatus(a.id, a.userStatus); setMenu(false) }}
                  style={{
                    display: 'block', width: '100%', padding: '9px 12px', borderRadius: 9,
                    border: 'none', cursor: 'pointer', background: 'transparent',
                    color: T.sub, fontSize: 13, fontWeight: 500, textAlign: 'left',
                    marginTop: 3, borderTop: `1px solid ${T.bord}`,
                  }}>
                  {t('anime.removeFromList')}
                </button>
              )}
            </div>
          )}
        </div>

        {a.userStatus && (
          <>
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 11, color: T.sub, marginBottom: 7, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '.04em' }}>{t('anime.myScore')}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4 }}>
                {[1,2,3,4,5,6,7,8,9,10].map(s => (
                  <button key={s} className="t" onClick={() => onScore(a.id, s)}
                    style={{
                      height: 28, borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', padding: 0,
                      background: a.userScore >= s ? `${a.color}22` : T.surf2,
                      color: a.userScore >= s ? a.color : T.sub,
                      outline: a.userScore === s ? `2px solid ${a.color}` : 'none',
                    }}>{s}</button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 11, color: T.sub, marginBottom: 7, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '.04em' }}>{t('anime.progress')}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => onEp(a.id, Math.max(0, (a.userEp || 0) - 1))}
                  style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: `${a.color}22`, color: a.color, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>−</button>
                <span style={{ fontSize: 16, fontWeight: 700, color: a.color, minWidth: 52, textAlign: 'center' }}>
                  {a.userEp || 0}
                  {a.eps
                    ? <span style={{ fontSize: 12, color: T.sub, fontWeight: 400 }}>/{a.eps}</span>
                    : <span style={{ fontSize: 12, color: T.sub, fontWeight: 400 }}> ep</span>}
                </span>
                <button onClick={() => onEp(a.id, Math.min(a.eps ?? Infinity, (a.userEp || 0) + 1))}
                  style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: `${a.color}22`, color: a.color, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</button>
              </div>
              {a.eps && (
                <div style={{ marginTop: 10, height: 4, borderRadius: 2, background: `${a.color}20` }}>
                  <div style={{ height: '100%', borderRadius: 2, background: a.color, width: `${((a.userEp || 0) / a.eps) * 100}%`, transition: 'width .3s ease' }}/>
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 11, color: T.sub, marginBottom: 7, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {t('anime.personalNotes')}
                {noteSaved && <span style={{ color: '#34C759', marginLeft: 8, fontWeight: 400, textTransform: 'none' }}>{t('anime.notesSaved')}</span>}
              </p>
              <textarea
                value={noteText}
                onChange={e => handleNote(e.target.value)}
                placeholder={t('anime.notesPlaceholder')}
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 13,
                  background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)',
                  border: `1px solid ${T.bord}`, color: T.txt, resize: 'vertical',
                  fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box', outline: 'none',
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Recommendations */}
      {recs.length > 0 && (
        <div style={{ padding: 18, borderRadius: 18, background: T.surf, border: `1px solid ${T.bord}` }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: T.sub, letterSpacing: '.08em',
            textTransform: 'uppercase', marginBottom: 14 }}>Recommendations</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recs.map(rec => (
              <button key={rec.id} className="t rbtn" onClick={() => onOpen(rec)}
                style={{
                  display: 'flex', gap: 12, alignItems: 'center', width: '100%', textAlign: 'left',
                  padding: 8, borderRadius: 12, border: 'none', background: 'transparent', cursor: 'pointer',
                }}>
                <img src={rec.img} alt="" loading="lazy"
                  style={{ width: 46, height: 64, objectFit: 'cover', borderRadius: 8, flexShrink: 0,
                    border: `1px solid ${T.bord}` }}/>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.txt, lineHeight: 1.35,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {rec.title}
                  </p>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
                    fontSize: 10.5, fontWeight: 600, color: rec.color || T.sub }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: rec.color || T.sub }}/>
                    {t('anime.typeAnime')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div ref={scopeRef} className="main-content" style={{ paddingLeft: 0, paddingRight: 0 }}>

      {/* ── Hero banner ── */}
      <div style={{ position: 'relative', height: isMobile ? 200 : 360, overflow: 'hidden', flexShrink: 0,
        background: banner ? '#000' : `linear-gradient(135deg, ${a.color}55, ${a.colorB || a.color}22)` }}>
        {banner && (
          <img src={banner} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 25%' }}/>
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to bottom, rgba(0,0,0,.5) 0%, rgba(0,0,0,.1) 45%, ${T.bg} 100%)`,
        }}/>
        <div style={{
          position: 'absolute', top: 18, left: isMobile ? 16 : 40, right: isMobile ? 16 : 40, zIndex: 3,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button onClick={onClose} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 20,
            border: '1px solid rgba(255,255,255,.25)', background: 'rgba(0,0,0,.45)',
            backdropFilter: 'blur(12px)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>← {t('anime.back')}</button>
          {sm && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 20,
              background: `${sm.dot}50`, border: `1px solid ${sm.dot}70`, backdropFilter: 'blur(12px)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sm.dot, boxShadow: `0 0 6px ${sm.dot}` }}/>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{t(`status.${a.userStatus}`)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Header: poster + title block ── */}
      <div style={{ padding: PAD }}>
        <div style={{ display: 'flex', gap: isMobile ? 16 : 28, alignItems: 'flex-end',
          marginTop: isMobile ? -52 : -96, position: 'relative', zIndex: 2 }}>
          <div style={{
            width: isMobile ? 108 : 170, aspectRatio: '2/3', flexShrink: 0, borderRadius: 14, overflow: 'hidden',
            border: `1px solid ${T.bord}`,
            boxShadow: dark ? '0 12px 48px rgba(0,0,0,.6)' : '0 12px 36px rgba(0,0,0,.18)',
          }}>
            <img src={a.img} alt={a.title} loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 6 }}>
            <h1 style={{ fontSize: isMobile ? 22 : 32, fontWeight: 800, color: T.txt,
              letterSpacing: '-.025em', lineHeight: 1.15, marginBottom: a.titleJp ? 4 : 0 }}>
              {a.title}
            </h1>
            {a.titleJp && (
              <p style={{ fontSize: isMobile ? 13 : 15, color: T.sub, fontWeight: 500, marginBottom: 12 }}>
                {a.titleJp}
              </p>
            )}
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: `${a.color}20`, color: a.color, border: `1px solid ${a.color}35`,
              }}>{typeLabel}</span>
              {a.year && (
                <span style={{ padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: T.surf2, color: T.sub, border: `1px solid ${T.bord}` }}>{a.year}</span>
              )}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: `${st.color}18`, color: st.color, border: `1px solid ${st.color}35`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color }}/>
                {st.label}
              </span>
              {a.score > 0 && (
                <span style={{ padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: '#34C75918', color: '#34C759', border: '1px solid #34C75935' }}>
                  ★ {a.score}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginTop: 22, borderBottom: `1px solid ${T.bord}`,
          overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map(tb => {
            const active = tab === tb.id
            return (
              <button key={tb.id} className="t" onClick={() => setTab(tb.id)}
                style={{
                  padding: '12px 16px', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
                  color: active ? a.color : T.sub,
                  borderBottom: `2px solid ${active ? a.color : 'transparent'}`,
                  marginBottom: -1,
                }}>
                {tb.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Body: content + sidebar ── */}
      <div style={{ padding: isMobile ? '24px 16px 80px' : '28px 40px 60px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) 300px',
          gap: isMobile ? 28 : 32, alignItems: 'start',
        }}>
          {/* Main column */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 26 }}>

            {tab === 'overview' && (
              <>
                {a.synopsis && (
                  <div>
                    <p style={{ color: T.sub, lineHeight: 1.85, fontSize: 14, margin: 0,
                      display: '-webkit-box',
                      WebkitLineClamp: synExpand ? 'unset' : 5,
                      WebkitBoxOrient: 'vertical',
                      overflow: synExpand ? 'visible' : 'hidden',
                    }}>{a.synopsis}</p>
                    <button onClick={() => setSynExpand(v => !v)} style={{
                      marginTop: 8, fontSize: 12.5, fontWeight: 600, color: a.color,
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}>
                      {synExpand ? 'Show less ↑' : 'Show more ↓'}
                    </button>
                  </div>
                )}

                {(a.genres || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {(a.genres || []).map(g => (
                      <span key={g} style={{
                        padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: `${a.color}14`, color: a.color, border: `1px solid ${a.color}28`,
                      }}>{g}</span>
                    ))}
                  </div>
                )}

                <MetaGrid rows={metaRows} T={T} />

                {relations.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {relations.map(rel => (
                      <button key={rel.malId} className="t" onClick={async () => {
                        const full = await fetchAnimeById(rel.malId).catch(() => null)
                        if (full) onOpen(full)
                      }} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '11px 16px', borderRadius: 12, border: `1px solid ${a.color}40`,
                        background: `${a.color}12`, cursor: 'pointer', textAlign: 'left', width: '100%',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 14 }}>{rel.relation === 'Sequel' ? '⏭' : '⏮'}</span>
                          <div>
                            <p style={{ fontSize: 10, fontWeight: 700, color: a.color, margin: '0 0 1px',
                              textTransform: 'uppercase', letterSpacing: '.04em' }}>
                              {rel.relation === 'Sequel' ? 'Next Season' : 'Previous Season'}
                            </p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: T.txt, margin: 0 }}>{rel.name}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: 14, color: a.color, flexShrink: 0 }}>→</span>
                      </button>
                    ))}
                  </div>
                )}

                {!a.comingSoon && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: T.sub, letterSpacing: '.08em',
                      textTransform: 'uppercase', marginBottom: 12 }}>{t('anime.whereToWatch')}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(a.streaming || []).map(provider => {
                        const s = getStreamingProviderName(provider)
                        const url = getStreamingProviderUrl(provider)
                        if (!s) return null
                        const linkProps = getSafeExternalLinkProps(url ?? STREAMING_URLS[s]?.(a.title) ?? `https://www.google.com/search?q=${encodeURIComponent(a.title + ' ' + s)}`)
                        if (!linkProps) return null
                        return (
                          <a key={`${s}-${url ?? 'search'}`} {...linkProps} className="t hbtn"
                            style={{
                              padding: '9px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                              textDecoration: 'none', display: 'inline-block',
                              background: `${SC[s] ?? '#888'}15`, color: SC[s] ?? T.sub,
                              outline: `1px solid ${SC[s] ?? '#888'}30`,
                            }}>▶ {s}</a>
                        )
                      })}
                      <a {...getSafeExternalLinkProps(STREAMING_URLS.Stremio(a.title))} className="t hbtn"
                        style={{
                          padding: '9px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                          textDecoration: 'none', display: 'inline-block',
                          background: `${SC.Stremio}15`, color: SC.Stremio,
                          outline: `1px solid ${SC.Stremio}30`,
                        }}>▶ Stremio</a>
                    </div>
                  </div>
                )}

                {a.trailer && (
                  <div>
                    {showTrailer ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: T.sub, letterSpacing: '.08em',
                            textTransform: 'uppercase' }}>{t('anime.trailer')}</p>
                          <button className="t" onClick={() => setShowTrailer(false)}
                            style={{ fontSize: 12, fontWeight: 600, color: T.sub, background: 'none',
                              border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                            {t('anime.hideTrailer')}
                          </button>
                        </div>
                        <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 16, overflow: 'hidden', background: '#000' }}>
                          <iframe
                            src={`${a.trailer}?rel=0&modestbranding=1&autoplay=1`}
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={`Trailer ${a.title}`}
                          />
                        </div>
                      </>
                    ) : (
                      <button className="t hbtn" onClick={() => setShowTrailer(true)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 10,
                          padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
                          background: T.surf2, border: `1px solid ${T.bord}`, color: T.txt }}>
                        <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                          background: a.color || '#FF7A00', color: '#fff', fontSize: 11,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 2 }}>▶</span>
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{t('anime.watchTrailer')}</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {tab === 'characters' && (
              allChars.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: 16,
                }}>
                  {allChars.map((c, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <img src={c.img} alt="" loading="lazy"
                        style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 12,
                          display: 'block', marginBottom: 7, border: `1px solid ${T.bord}` }}/>
                      <p style={{ fontSize: 12, fontWeight: 600, color: T.txt, marginBottom: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      <p style={{ fontSize: 10.5, color: c.role === 'Main' ? a.color : T.sub, fontWeight: 500 }}>
                        {c.role === 'Main' ? t('anime.mainRole') : t('anime.supportRole')}
                      </p>
                      {c.va && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, justifyContent: 'center' }}>
                          {c.vaImg && (
                            <img src={c.vaImg} alt="" loading="lazy"
                              style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <p style={{ fontSize: 10.5, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.va}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: T.sub, fontStyle: 'italic' }}>No character data available.</p>
              )
            )}

            {tab === 'artwork' && (() => {
              // Banner first (wide), then de-duplicated poster gallery.
              const posters = [...new Set([a.img, ...pictures].filter(Boolean))]
              if (!banner && posters.length === 0) {
                return <p style={{ fontSize: 13, color: T.sub, fontStyle: 'italic' }}>No artwork available.</p>
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {banner && (
                    <img src={banner} alt="" loading="lazy"
                      style={{ width: '100%', borderRadius: 14, border: `1px solid ${T.bord}`,
                        objectFit: 'cover', display: 'block' }}/>
                  )}
                  {posters.length > 0 && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: 16,
                    }}>
                      {posters.map((src, i) => (
                        <img key={i} src={src} alt="" loading="lazy"
                          style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover',
                            borderRadius: 14, border: `1px solid ${T.bord}`, display: 'block' }}/>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            {tab === 'episodes' && (
              a.comingSoon ? (
                <p style={{ fontSize: 13, color: T.sub, fontStyle: 'italic' }}>
                  This title hasn't started airing yet.
                </p>
              ) : isPremium ? (
                <WatchPanel item={a} onEp={onEp} onStatus={onStatus} />
              ) : (
                <div style={{ padding: 20, borderRadius: 16, background: T.surf, border: `1px solid ${T.bord}` }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: T.txt, marginBottom: 6 }}>
                    {t('premium.watchOnline')}
                  </p>
                  <p style={{ fontSize: 13, color: T.sub, lineHeight: 1.6 }}>
                    Streaming in-app is a premium feature. Meanwhile, check the “Where to Watch” providers in the Overview tab.
                  </p>
                </div>
              )
            )}
          </div>

          {/* Sidebar */}
          {sidebar}
        </div>

        {/* ── Comments (full width) ── */}
        <div style={{ marginTop: 40, paddingTop: 32, borderTop: `1px solid ${T.bord}` }}>
          <TacComments malId={a.id} color={a.color} />
        </div>
      </div>
    </div>
  )
}
