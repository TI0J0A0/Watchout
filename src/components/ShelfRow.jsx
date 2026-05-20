import { memo, useRef, useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { MediaCard } from './MediaCard'

export const ShelfRow = memo(function ShelfRow({ title, emoji, subtitle, items, loading, onOpen, onStatus, headerRight, matchScores = {} }) {
  const { T, dark } = useTheme()
  const isMobile = useIsMobile()
  const scrollRef = useRef(null)
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(true)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 8)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    el.addEventListener('scroll', checkScroll, { passive: true })
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect() }
  }, [items])

  const scroll = dir => scrollRef.current?.scrollBy({ left: dir * 620, behavior: 'smooth' })

  if (!loading && items.length === 0) return null

  return (
    <section style={{ marginBottom: 44 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            {emoji && <span style={{ fontSize: 18, lineHeight: 1 }}>{emoji}</span>}
            <h2 style={{ fontSize: 20, fontWeight: 700, color: T.txt, letterSpacing: '-.02em' }}>
              {title}
            </h2>
          </div>
          {subtitle && (
            <p style={{ fontSize: 13, color: T.sub, marginTop: 3, paddingLeft: emoji ? 26 : 0 }}>
              {subtitle}
            </p>
          )}
        </div>
        {headerRight}
      </div>

      {/* Scroll container */}
      <div style={{ position: 'relative' }}>

        {/* Left fade + arrow */}
        {!isMobile && canLeft && !loading && (
          <>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 8, width: 80,
              background: `linear-gradient(to right,${T.bg} 20%,transparent)`,
              pointerEvents: 'none', zIndex: 9 }}/>
            <button className="t" onClick={() => scroll(-1)}
              style={{ position: 'absolute', left: 6, top: '50%',
                transform: 'translateY(calc(-50% - 4px))', zIndex: 10,
                width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: dark ? 'rgba(36,36,36,.96)' : 'rgba(255,255,255,.96)',
                boxShadow: '0 2px 14px rgba(0,0,0,.28)', color: T.txt,
                fontSize: 22, lineHeight: 1, paddingRight: 1 }}>
              ‹
            </button>
          </>
        )}

        {/* Right fade + arrow */}
        {!isMobile && canRight && !loading && (
          <>
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 8, width: 80,
              background: `linear-gradient(to left,${T.bg} 20%,transparent)`,
              pointerEvents: 'none', zIndex: 9 }}/>
            <button className="t" onClick={() => scroll(1)}
              style={{ position: 'absolute', right: 6, top: '50%',
                transform: 'translateY(calc(-50% - 4px))', zIndex: 10,
                width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: dark ? 'rgba(36,36,36,.96)' : 'rgba(255,255,255,.96)',
                boxShadow: '0 2px 14px rgba(0,0,0,.28)', color: T.txt,
                fontSize: 22, lineHeight: 1, paddingLeft: 1 }}>
              ›
            </button>
          </>
        )}

        <div ref={scrollRef} style={{ display: 'flex', gap: 14, overflowX: 'auto',
          paddingBottom: 8, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x', overscrollBehaviorX: 'contain',
          scrollSnapType: isMobile ? 'x proximity' : undefined }}>
          {loading
            ? Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="shimmer" style={{ flexShrink: 0, width: 178,
                  borderRadius: 16, overflow: 'hidden', background: T.surf,
                  animationDelay: `${i * 100}ms` }}>
                  <div style={{ paddingTop: '133%', background: T.surf2 }}/>
                  <div style={{ padding: '10px 12px 14px', display: 'flex',
                    flexDirection: 'column', gap: 8 }}>
                    <div style={{ height: 12, borderRadius: 6, background: T.surf2, width: '80%' }}/>
                    <div style={{ height: 10, borderRadius: 6, background: T.surf2, width: '50%' }}/>
                  </div>
                </div>
              ))
            : items.map((it, i) => (
                <MediaCard key={it.id} item={it} delay={i * 40}
                  onOpen={onOpen} onStatus={onStatus} variant="shelf"
                  matchPct={matchScores[it.id] ?? undefined}/>
              ))
          }
        </div>
      </div>
    </section>
  )
})
