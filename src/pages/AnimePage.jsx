import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SM, SC, STREAMING_URLS, AVATAR_GRADS } from '../constants'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useClickOutside } from '../hooks/useClickOutside'
import { useIsMobile } from '../hooks/useIsMobile'
import { ShelfRow } from '../components/ShelfRow'
import { WatchPanel } from '../components/WatchPanel'
import { StatBox } from '../components/StatBox'
import { fmt, fmtTime } from '../utils'
import { fetchRecommendations } from '../services/jikan'
import { fetchAnilistBanner } from '../services/anilist'
import { fetchAnimeComments, createAnimeComment, deleteAnimeComment } from '../services/community'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  return `${Math.floor(d / 30)}mo`
}

function Avatar({ profile, size = 32 }) {
  const grad = AVATAR_GRADS[profile?.avatar_grad ?? 0] ?? AVATAR_GRADS[0]
  const label = (profile?.display_name || profile?.username || '?').slice(0, 2).toUpperCase()
  if (profile?.avatar_url) {
    return (
      <img src={profile.avatar_url} alt="" loading="lazy"
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg,${grad[0]},${grad[1]})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 700, color: '#fff',
    }}>{label}</div>
  )
}

function AnimeComments({ animeId, color, onLogin }) {
  const { T, dark } = useTheme()
  const { user }    = useAuth()
  const [comments, setComments] = useState([])
  const [text,     setText]     = useState('')
  const [sending,  setSending]  = useState(false)
  const MAX = 280

  useEffect(() => {
    fetchAnimeComments(animeId).then(setComments).catch(() => {})
  }, [animeId])

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await createAnimeComment({ userId: user.id, animeId, content: text.trim() })
      const updated = await fetchAnimeComments(animeId)
      setComments(updated)
      setText('')
    } catch {}
    setSending(false)
  }

  async function handleDelete(id) {
    await deleteAnimeComment(id)
    setComments(c => c.filter(x => x.id !== id))
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: T.txt, marginBottom: 14, letterSpacing: '.02em' }}>
        Comments {comments.length > 0 && <span style={{ color: T.sub, fontWeight: 400 }}>({comments.length})</span>}
      </p>

      {user ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
          <Avatar profile={null} size={34} />
          <div style={{ flex: 1 }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value.slice(0, MAX))}
              placeholder="Leave a comment…"
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 13,
                background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)',
                border: `1px solid ${T.bord}`, color: T.txt, resize: 'none',
                fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: text.length > MAX * 0.85 ? '#FF9F0A' : T.sub }}>
                {text.length}/{MAX}
              </span>
              <button onClick={handleSend} disabled={!text.trim() || sending}
                style={{
                  padding: '6px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: text.trim() ? color : (dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.07)'),
                  color: text.trim() ? '#fff' : T.sub,
                }}>
                {sending ? '…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={onLogin} style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginBottom: 16,
          padding: '12px 16px', borderRadius: 14, border: `1px dashed ${T.bord}`,
          background: 'transparent', cursor: 'pointer', textAlign: 'left',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)',
          }}/>
          <span style={{ fontSize: 13, color: T.sub }}>Sign in to comment…</span>
        </button>
      )}

      {comments.length === 0 && (
        <p style={{ fontSize: 13, color: T.sub, fontStyle: 'italic' }}>No comments yet. Be the first!</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {comments.map(c => (
          <div key={c.id} style={{
            display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 14,
            background: dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)',
            border: `1px solid ${T.bord}`,
          }}>
            <Avatar profile={c.profiles} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.txt }}>
                  {c.profiles?.display_name || c.profiles?.username || 'Anonymous'}
                </span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: T.sub }}>{timeAgo(c.created_at)}</span>
                  {user?.id === c.user_id && (
                    <button onClick={() => handleDelete(c.id)}
                      style={{ fontSize: 11, color: '#FF3B30', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 13, color: T.sub, lineHeight: 1.6 }}>{c.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AnimePage({ item, onClose, onStatus, onScore, onEp, onNotes, onOpen, isPremium = false, onLogin }) {
  const { T, dark } = useTheme()
  const { user }    = useAuth()
  const { t }       = useTranslation()
  const [menu,      setMenu]      = useState(false)
  const [recs,      setRecs]      = useState([])
  const [chars,     setChars]     = useState([])
  const [banner,    setBanner]    = useState(null)
  const [synExpand, setSynExpand] = useState(false)
  const [noteText,  setNoteText]  = useState(item?.userNotes ?? '')
  const [noteSaved, setNoteSaved] = useState(false)
  const menuRef      = useRef(null)
  const noteSaveTimer = useRef(null)
  useClickOutside(menuRef, () => setMenu(false))
  const isMobile = useIsMobile()

  const sm = SM[item?.userStatus]

  useEffect(() => {
    if (!item) return
    setSynExpand(false)
    setBanner(null)
    setNoteText(item?.userNotes ?? '')
    setNoteSaved(false)
    fetchRecommendations(item.id).then(setRecs).catch(() => {})
    fetchAnilistBanner(item.id)
      .then(({ bannerImage, characters }) => {
        setBanner(bannerImage)
        if (characters.length) setChars(characters)
      })
      .catch(() => {})
  }, [item?.id])

  function handleNote(val) {
    setNoteText(val)
    setNoteSaved(false)
    onNotes(item.id, val)
    clearTimeout(noteSaveTimer.current)
    noteSaveTimer.current = setTimeout(() => setNoteSaved(true), 900)
  }

  if (!item) return null

  const mainChars = chars.filter(c => c.role === 'Main')
  const supChars  = chars.filter(c => c.role !== 'Main')
  const allChars  = [...mainChars, ...supChars]

  const typeLabel = item.type === 'anime' ? t('anime.typeAnime')
                  : item.type === 'series' ? t('anime.typeSeries')
                  : t('anime.typeFilm')

  const totalMinutes = item.duration && item.eps ? item.duration * item.eps : null

  // Shared info column content
  const infoContent = (
    <>
      {item.airing && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 20, marginBottom: 12,
          background: 'rgba(52,199,89,.15)', border: '1px solid rgba(52,199,89,.3)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34C759', display: 'block' }}/>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#34C759' }}>
            {t('anime.airing')}{item.airDay ? ` · ${t(`days.abbr.${item.airDay}`, item.airDay)}` : ''}
          </span>
        </div>
      )}

      <h1 style={{
        fontSize: isMobile ? 22 : 28, fontWeight: 800, color: T.txt,
        letterSpacing: '-.025em', lineHeight: 1.2, marginBottom: 10,
      }}>
        {item.title}
      </h1>

      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{
          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          background: `${item.color}20`, color: item.color, border: `1px solid ${item.color}35`,
        }}>{typeLabel}</span>
        {item.year && (
          <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: T.surf2, color: T.sub, border: `1px solid ${T.bord}`,
          }}>{item.year}</span>
        )}
        {item.studio && item.studio !== '—' && (
          <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: T.surf2, color: T.sub, border: `1px solid ${T.bord}`,
          }}>{item.studio}</span>
        )}
        {item.eps && (
          <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: T.surf2, color: T.sub, border: `1px solid ${T.bord}`,
          }}>{item.eps} {t('anime.eps')}</span>
        )}
      </div>

      {item.score && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: item.color, lineHeight: 1 }}>{item.score}</span>
          <div>
            <div style={{ fontSize: 11, color: T.sub, fontWeight: 500 }}>★ {t('anime.globalScore')}</div>
            {item.members > 0 && (
              <div style={{ fontSize: 11, color: T.sub }}>{fmt(item.members)} {t('anime.members').toLowerCase()}</div>
            )}
          </div>
        </div>
      )}

      {(item.genres || []).length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {(item.genres || []).map(g => (
            <span key={g} style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11.5,
              background: T.surf2, color: T.sub, border: `1px solid ${T.bord}`,
            }}>{g}</span>
          ))}
        </div>
      )}

      {item.synopsis && (
        <div style={{ marginBottom: 22 }}>
          <p style={{
            color: T.sub, lineHeight: 1.8, fontSize: 13.5, margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: synExpand ? 'unset' : 4,
            WebkitBoxOrient: 'vertical',
            overflow: synExpand ? 'visible' : 'hidden',
          }}>{item.synopsis}</p>
          <button onClick={() => setSynExpand(v => !v)} style={{
            marginTop: 6, fontSize: 12, fontWeight: 600, color: item.color,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}>
            {synExpand ? 'Show less ↑' : 'Show more ↓'}
          </button>
        </div>
      )}

      {/* User actions */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button className="t" onClick={() => setMenu(!menu)} style={{
            padding: '10px 20px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
            background: sm ? `${sm.dot}18` : item.color,
            color: sm ? sm.color : '#fff',
            outline: sm ? `1.5px solid ${sm.dot}30` : 'none',
            boxShadow: sm ? 'none' : `0 4px 16px ${item.color}40`,
          }}>
            {sm ? `${t(`status.${item.userStatus}`)} ▾` : t('anime.addToList')}
          </button>
          {menu && (
            <div className="sc" style={{
              position: 'absolute', top: 'calc(100% + 8px)', left: 0,
              background: dark ? '#1C1C1E' : '#fff', borderRadius: 14, padding: 7, zIndex: 20,
              minWidth: 200, border: `1px solid ${T.bord}`,
              boxShadow: `0 10px 40px rgba(0,0,0,${dark ? .4 : .14})`,
            }}>
              {Object.entries(SM).map(([s, m]) => (
                <button key={s} className="t" onClick={() => { onStatus(item.id, s); setMenu(false) }}
                  style={{
                    display: 'flex', width: '100%', padding: '9px 12px', borderRadius: 9,
                    border: 'none', cursor: 'pointer',
                    background: item.userStatus === s ? `${m.dot}14` : 'transparent',
                    color: m.color, fontSize: 13.5, fontWeight: 500, gap: 10, alignItems: 'center', textAlign: 'left',
                  }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.dot, flexShrink: 0 }}/>
                  {t(`status.${s}`)}
                </button>
              ))}
              {item.userStatus && (
                <button className="t" onClick={() => { onStatus(item.id, item.userStatus); setMenu(false) }}
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

        {item.userStatus && (
          <div>
            <p style={{ fontSize: 11, color: T.sub, marginBottom: 7, fontWeight: 500 }}>{t('anime.myScore')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMobile ? 5 : 10}, 30px)`, gap: 4 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(s => (
                <button key={s} className="t" onClick={() => onScore(item.id, s)}
                  style={{
                    width: 30, height: 30, borderRadius: 9, border: 'none', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                    background: item.userScore >= s ? `${item.color}22` : T.surf2,
                    color: item.userScore >= s ? item.color : T.sub,
                    outline: item.userScore === s ? `2px solid ${item.color}` : 'none',
                  }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {item.userStatus && item.eps && (
          <div>
            <p style={{ fontSize: 11, color: T.sub, marginBottom: 7, fontWeight: 500 }}>{t('anime.progress')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => onEp(item.id, Math.max(0, (item.userEp || 0) - 1))}
                style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: `${item.color}22`, color: item.color, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>−</button>
              <span style={{ fontSize: 16, fontWeight: 700, color: item.color, minWidth: 52, textAlign: 'center' }}>
                {item.userEp || 0}<span style={{ fontSize: 12, color: T.sub, fontWeight: 400 }}>/{item.eps}</span>
              </span>
              <button onClick={() => onEp(item.id, Math.min(item.eps, (item.userEp || 0) + 1))}
                style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: `${item.color}22`, color: item.color, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</button>
            </div>
            <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: `${item.color}20`, width: 140 }}>
              <div style={{ height: '100%', borderRadius: 2, background: item.color, width: `${((item.userEp || 0) / item.eps) * 100}%`, transition: 'width .3s ease' }}/>
            </div>
          </div>
        )}
      </div>

      {item.userStatus && (
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 11, color: T.sub, marginBottom: 7, fontWeight: 500 }}>
            {t('anime.personalNotes')}
            {noteSaved && (
              <span style={{ color: '#34C759', marginLeft: 8, fontWeight: 400 }}>
                {t('anime.notesSaved')}
              </span>
            )}
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
      )}

    </>
  )

  return (
    <div className="main-content" style={{ paddingLeft: 0, paddingRight: 0 }}>

      {banner ? (
        <>
          {/* ── AniList banner hero ── */}
          <div style={{ position: 'relative', height: isMobile ? 220 : 400, overflow: 'hidden', flexShrink: 0 }}>
            <img src={banner} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 25%' }}/>
            {/* gradient: darkens top for button legibility, fades to page bg at bottom */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `linear-gradient(to bottom, rgba(0,0,0,.45) 0%, rgba(0,0,0,.05) 50%, ${T.bg} 100%)`,
            }}/>
            {/* Back + Status */}
            <div style={{
              position: 'absolute', top: 18, left: 40, right: 40, zIndex: 3,
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
                  background: `${sm.dot}50`, border: `1px solid ${sm.dot}70`,
                  backdropFilter: 'blur(12px)',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sm.dot, boxShadow: `0 0 6px ${sm.dot}` }}/>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{t(`status.${item.userStatus}`)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Poster + Info — flush below banner */}
          <div style={{
            display: 'flex', gap: isMobile ? 16 : 32, alignItems: 'stretch',
            padding: isMobile ? '16px 16px 28px' : '24px 40px 36px',
            borderBottom: `1px solid ${T.bord}`,
          }}>
            <div style={{
              width: isMobile ? 110 : 180, aspectRatio: '2/3', flexShrink: 0, borderRadius: 12, overflow: 'hidden',
              border: `1px solid ${T.bord}`,
              boxShadow: dark ? '0 8px 40px rgba(0,0,0,.5)' : '0 8px 32px rgba(0,0,0,.14)',
            }}>
              <img src={item.img} alt={item.title} loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              {infoContent}
            </div>
          </div>
        </>
      ) : (
        /* ── Fallback: color-wash header (no banner available) ── */
        <div style={{
          background: dark
            ? `linear-gradient(180deg,${item.color}22 0%,${T.bg} 100%)`
            : `linear-gradient(180deg,${item.color}14 0%,${T.bg} 100%)`,
          borderBottom: `1px solid ${T.bord}`,
          paddingBottom: 36,
        }}>
          <div style={{ padding: isMobile ? '0 16px' : '0 40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 0 28px' }}>
              <button onClick={onClose} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 16px', borderRadius: 20,
                border: `1px solid ${T.bord}`, background: T.surf,
                color: T.txt, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>← {t('anime.back')}</button>
              {sm && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 20,
                  background: `${sm.dot}18`, border: `1px solid ${sm.dot}35`,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sm.dot, boxShadow: `0 0 6px ${sm.dot}` }}/>
                  <span style={{ fontSize: 12, fontWeight: 600, color: sm.color }}>{t(`status.${item.userStatus}`)}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 16 : 32, alignItems: 'stretch' }}>
              <div style={{
                width: isMobile ? 110 : 180, aspectRatio: '2/3', flexShrink: 0, borderRadius: 12, overflow: 'hidden',
                border: `1px solid ${T.bord}`, minHeight: isMobile ? 160 : 300,
                boxShadow: dark ? '0 8px 40px rgba(0,0,0,.5)' : '0 8px 32px rgba(0,0,0,.14)',
              }}>
                <img src={item.img} alt={item.title} loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
                {infoContent}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ padding: isMobile ? '0 16px 80px' : '0 40px 60px' }}>

        <div style={{ display: 'flex', gap: 12, margin: '24px 0', flexWrap: 'wrap' }}>
          <StatBox label={t('anime.globalScore')} val={item.score || '—'} color={item.color} icon="★" fill />
          <StatBox label={t('anime.members')} val={fmt(item.members || 0)} icon="👥" fill />
          {item.eps && <StatBox label={t('anime.eps')} val={item.eps} icon="📺" fill />}
          {totalMinutes && <StatBox label={t('anime.totalDuration')} val={fmtTime(totalMinutes)} icon="⏱" fill />}
        </div>

        {!item.comingSoon && (
          <>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.txt, marginBottom: 12 }}>{t('anime.whereToWatch')}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(item.streaming || []).map(s => (
                  <a key={s}
                    href={STREAMING_URLS[s]?.(item.title) ?? `https://www.google.com/search?q=${encodeURIComponent(item.title + ' ' + s)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="t hbtn"
                    style={{
                      padding: '9px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                      textDecoration: 'none', display: 'inline-block',
                      background: `${SC[s] ?? '#888'}15`, color: SC[s] ?? T.sub,
                      outline: `1px solid ${SC[s] ?? '#888'}30`,
                    }}>
                    ▶ {s}
                  </a>
                ))}
                <a href={STREAMING_URLS.Stremio(item.title)} target="_blank" rel="noopener noreferrer"
                  className="t hbtn"
                  style={{
                    padding: '9px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                    textDecoration: 'none', display: 'inline-block',
                    background: `${SC.Stremio}15`, color: SC.Stremio,
                    outline: `1px solid ${SC.Stremio}30`,
                  }}>
                  ▶ Stremio
                </a>
              </div>
            </div>

            {isPremium && <WatchPanel item={item} onEp={onEp} onStatus={onStatus} />}
          </>
        )}

        {item.trailer && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.txt, marginBottom: 12 }}>{t('anime.trailer')}</p>
            <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: 16, overflow: 'hidden', background: '#000' }}>
              <iframe
                src={`${item.trailer}?rel=0&modestbranding=1`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`Trailer ${item.title}`}
              />
            </div>
          </div>
        )}

        {allChars.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.txt, marginBottom: 14, letterSpacing: '.02em' }}>
              {t('anime.characters')}
            </p>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 6 }}>
              {allChars.map((c, i) => (
                <div key={i} style={{ flexShrink: 0, width: 96, textAlign: 'center' }}>
                  <img src={c.img} alt="" loading="lazy"
                    style={{ width: 96, height: 128, objectFit: 'cover', borderRadius: 12, display: 'block', marginBottom: 6 }}
                  />
                  <p style={{ fontSize: 11, fontWeight: 600, color: T.txt, marginBottom: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                  <p style={{ fontSize: 10, color: c.role === 'Main' ? item.color : T.sub, fontWeight: 500 }}>
                    {c.role === 'Main' ? t('anime.mainRole') : t('anime.supportRole')}
                  </p>
                  {c.va && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'center' }}>
                      {c.vaImg && (
                        <img src={c.vaImg} alt="" loading="lazy"
                          style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      )}
                      <p style={{ fontSize: 10, color: T.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.va}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <AnimeComments animeId={item.id} color={item.color} onLogin={onLogin} />

        {recs.length > 0 && (
          <ShelfRow
            title={t('anime.recommendations')}
            items={recs}
            loading={false}
            onOpen={onOpen}
            onStatus={onStatus}
          />
        )}
      </div>
    </div>
  )
}
