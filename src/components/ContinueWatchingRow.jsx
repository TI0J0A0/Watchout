import { memo, useRef, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { fetchWatchEpisodes } from '../services/watchEpisodes'

const DISMISS_KEY = 'watchout_cw_dismissed'
const PROGRESS = '#FF3B30'

function fmtClock(sec) {
  const v = Number.isFinite(sec) && sec > 0 ? sec : 0
  const m = Math.floor(v / 60)
  const s = Math.floor(v % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function readResume(id) {
  try { return JSON.parse(localStorage.getItem(`watchout_resume_${id}`)) || null } catch { return null }
}

function CloseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// Watch-history style row: landscape "moldura" cards with episode badge,
// elapsed/total time, a progress bar, a remove (×) button and a trailing
// "View More" card. Progress is read from the per-anime resume key written by
// the player (watchout_resume_<id>).
export const ContinueWatchingRow = memo(function ContinueWatchingRow({
  title, subtitle, items, onOpen, onViewMore,
}) {
  const { T, dark } = useTheme()
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const scrollRef = useRef(null)
  const [canLeft, setCanLeft]   = useState(false)
  const [canRight, setCanRight] = useState(true)
  const [dismissed, setDismissed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]')) } catch { return new Set() }
  })
  // Episode stills, keyed by anime id. Fetched lazily from AniList (the same
  // per-episode thumbnails the player uses); falls back to the poster.
  const [thumbs, setThumbs] = useState({})

  useEffect(() => {
    let cancelled = false
    for (const it of items) {
      if (dismissed.has(it.id) || thumbs[it.id] !== undefined) continue
      const resume = readResume(it.id)
      const ep = resume?.ep ?? it.userEp ?? 1
      fetchWatchEpisodes(it)
        .then(r => {
          if (cancelled) return
          const thumb = r?.epMap?.[ep]?.thumbnail ?? null
          setThumbs(prev => ({ ...prev, [it.id]: thumb }))
        })
        .catch(() => { if (!cancelled) setThumbs(prev => ({ ...prev, [it.id]: null })) })
    }
    return () => { cancelled = true }
    // thumbs intentionally omitted: the per-id guard prevents refetch and
    // keeps this from re-running on every resolved thumbnail.
  }, [items, dismissed])

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 8)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect() }
  }, [checkScroll, items])

  const scroll = dir => scrollRef.current?.scrollBy({ left: dir * 660, behavior: 'smooth' })

  function handleRemove(e, id) {
    e.stopPropagation()
    setDismissed(prev => {
      const next = new Set(prev)
      next.add(id)
      try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
    try { localStorage.removeItem(`watchout_resume_${id}`) } catch {}
  }

  const visible = items.filter(it => !dismissed.has(it.id))
  if (visible.length === 0) return null

  const CARD_W = isMobile ? 248 : 320
  const IMG_H  = Math.round(CARD_W * 9 / 16)

  const arrowBtn = dir => (
    <button className="t" onClick={() => scroll(dir)}
      style={{
        position: 'absolute', [dir < 0 ? 'left' : 'right']: 6, top: IMG_H / 2,
        transform: 'translateY(-50%)', zIndex: 10,
        width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: dark ? 'rgba(36,36,36,.96)' : 'rgba(255,255,255,.96)',
        boxShadow: '0 2px 14px rgba(0,0,0,.28)', color: T.txt, fontSize: 22, lineHeight: 1,
      }}>
      {dir < 0 ? '‹' : '›'}
    </button>
  )

  return (
    <section style={{ marginBottom: 44 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>▶</span>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: T.txt, letterSpacing: '-.02em' }}>{title}</h2>
        </div>
        {subtitle && (
          <p style={{ fontSize: 13, color: T.sub, marginTop: 3, paddingLeft: 26 }}>{subtitle}</p>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        {!isMobile && canLeft && (
          <>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 8, width: 80,
              background: `linear-gradient(to right,${T.bg} 20%,transparent)`, pointerEvents: 'none', zIndex: 9 }} />
            {arrowBtn(-1)}
          </>
        )}
        {!isMobile && canRight && (
          <>
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 8, width: 80,
              background: `linear-gradient(to left,${T.bg} 20%,transparent)`, pointerEvents: 'none', zIndex: 9 }} />
            {arrowBtn(1)}
          </>
        )}

        <div ref={scrollRef} style={{ display: 'flex', gap: 14, overflowX: 'auto',
          paddingBottom: 8, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}>

          {visible.map(it => {
            const resume   = readResume(it.id)
            const ep       = resume?.ep ?? it.userEp ?? 1
            const totalSec = (it.duration || 24) * 60
            const curSec   = resume?.time ?? 0
            const pct      = totalSec ? Math.min(100, Math.max(0, (curSec / totalSec) * 100)) : 0

            return (
              <div key={it.id} style={{ flexShrink: 0, width: CARD_W }}>
                <div className="card t" onClick={() => onOpen(it)}
                  role="button" tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(it) } }}
                  style={{
                    position: 'relative', width: '100%', height: IMG_H, borderRadius: 14,
                    overflow: 'hidden', background: T.surf2, border: `1px solid ${T.bord}`,
                    boxShadow: dark ? '0 6px 24px rgba(0,0,0,.4)' : '0 6px 20px rgba(0,0,0,.12)',
                  }}>
                  <img src={thumbs[it.id] || it.img} alt={it.title} loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover',
                      objectPosition: thumbs[it.id] ? 'center' : 'center 22%', display: 'block' }} />
                  {/* legibility gradient */}
                  <div style={{ position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,.78) 0%, rgba(0,0,0,.05) 46%, transparent 70%)' }} />

                  {/* Remove */}
                  <button className="t" onClick={e => handleRemove(e, it.id)} aria-label="Remove"
                    style={{
                      position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,.25)', background: 'rgba(0,0,0,.5)',
                      backdropFilter: 'blur(8px)', color: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}>
                    <CloseIcon />
                  </button>

                  {/* Episode badge */}
                  <div style={{ position: 'absolute', left: 10, bottom: 12, padding: '3px 9px',
                    borderRadius: 7, background: 'rgba(0,0,0,.62)', backdropFilter: 'blur(6px)' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '.02em' }}>
                      EP {ep}
                    </span>
                  </div>

                  {/* Elapsed / total time */}
                  {curSec > 0 && (
                    <div style={{ position: 'absolute', right: 10, bottom: 12, padding: '3px 9px',
                      borderRadius: 7, background: 'rgba(0,0,0,.62)', backdropFilter: 'blur(6px)' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtClock(curSec)}
                        <span style={{ color: 'rgba(255,255,255,.6)', fontWeight: 500 }}>/{fmtClock(totalSec)}</span>
                      </span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(255,255,255,.18)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: PROGRESS, transition: 'width .3s ease' }} />
                  </div>
                </div>

                <p style={{ fontSize: 13, fontWeight: 600, color: T.txt, marginTop: 8, lineHeight: 1.35,
                  display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {it.title}
                </p>
              </div>
            )
          })}

          {/* View More */}
          {onViewMore && (
            <div style={{ flexShrink: 0, width: CARD_W }}>
              <button className="t" onClick={onViewMore}
                style={{
                  width: '100%', height: IMG_H, borderRadius: 14, cursor: 'pointer',
                  border: `1.5px dashed ${T.bord}`, background: 'transparent', color: T.sub,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 600,
                }}>
                {t('seasonal.viewMore', 'View More')}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
})
