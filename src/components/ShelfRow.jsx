import { memo, useRef, useState, useEffect, useCallback } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { MediaCard } from './MediaCard'

function RefreshButton({ onClick, busy, T, label }) {
  return (
    <button className="t" onClick={onClick} disabled={busy} aria-label={label}
      style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        border: `1px solid ${T.bord}`, background: T.surf, color: T.sub,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: busy ? 'default' : 'pointer', opacity: busy ? .55 : 1 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        style={{ animation: busy ? 'spin .7s linear infinite' : 'none' }}>
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    </button>
  )
}

export const ShelfRow = memo(function ShelfRow({ title, emoji, subtitle, items, loading, onOpen, onStatus, headerRight, matchScores = {}, onRefresh, refreshing, showStatus = true }) {
  const { T, dark } = useTheme()
  const isMobile = useIsMobile()
  const scrollRef = useRef(null)
  const rafRef = useRef(0)
  const scrollStateRef = useRef({ left: false, right: true })
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(true)

  const checkScrollNow = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const next = {
      left: el.scrollLeft > 8,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    }
    const prev = scrollStateRef.current
    if (prev.left === next.left && prev.right === next.right) return
    scrollStateRef.current = next
    setCanLeft(next.left)
    setCanRight(next.right)
  }, [])

  const checkScroll = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      checkScrollNow()
    })
  }, [checkScrollNow])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScrollNow()
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    el.addEventListener('scroll', checkScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [items, checkScroll, checkScrollNow])

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {headerRight}
          {onRefresh && (
            <RefreshButton onClick={onRefresh} busy={refreshing} T={T} label="Refresh" />
          )}
        </div>
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
                <div key={i} className="shimmer" style={{ flexShrink: 0, width: isMobile ? 170 : 250,
                  borderRadius: 16, overflow: 'hidden', background: T.surf,
                  animationDelay: `${i * 100}ms` }}>
                  <div style={{ paddingTop: '150%', background: T.surf2 }}/>
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
                  showStatus={showStatus}
                  matchPct={matchScores[it.id] ?? undefined}/>
              ))
          }
        </div>
      </div>
    </section>
  )
})
