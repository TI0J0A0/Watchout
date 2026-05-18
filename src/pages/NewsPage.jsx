import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { fetchUpcoming } from '../services/jikan'
import { NEWS_PAGE_DEFAULT_TAB, NEWS_PAGE_TABS } from './newsPageState'

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

  const move = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top)  / r.height
    setT({ rx: (0.5 - y) * maxDeg * 2, ry: (x - 0.5) * maxDeg * 2, gx: x * 100, gy: y * 100, on: true })
  }

  const leave = () => setT({ rx: 0, ry: 0, gx: 50, gy: 50, on: false })

  const tiltStyle = {
    transform: `perspective(700px) rotateX(${t.rx}deg) rotateY(${t.ry}deg) scale(${t.on ? 1.03 : 1})`,
    transition: t.on ? 'transform 0.08s linear' : 'transform 0.5s cubic-bezier(0.23,1,0.32,1)',
    willChange: 'transform',
  }

  return { ref, tiltStyle, gx: t.gx, gy: t.gy, on: t.on, move, leave }
}

function TrailerCard({ item, isPlaying, onToggle, T }) {
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
        <img src={item.img} alt={item.title}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'top' }} />
        <div style={{ position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,.08), rgba(0,0,0,.55))' }} />
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

function NewsCard({ item, onOpen, badge, badgeColor, T }) {
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
        <img src={item.img} alt={item.title}
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

export function NewsPage({ data, loading, onOpen }) {
  const { T, dark } = useTheme()
  const { t }       = useTranslation()

  const [tab, setTab]                         = useState(NEWS_PAGE_DEFAULT_TAB)
  const [upcoming, setUpcoming]               = useState([])
  const [upcomingLoading, setUpcomingLoading] = useState(true)
  const [playing, setPlaying]                 = useState(null)

  useEffect(() => {
    fetchUpcoming()
      .then(setUpcoming)
      .catch(() => {})
      .finally(() => setUpcomingLoading(false))
  }, [])

  const trailers = data.filter(item => item.trailer)
  const releases = data.filter(item => item.airing)

  const tabCounts = { trailers: trailers.length, onair: releases.length, upcoming: upcoming.length }
  const tabs = NEWS_PAGE_TABS.map(item => ({ ...item, label: t(item.labelKey), count: tabCounts[item.id] ?? 0 }))

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
        loading ? <Spinner T={T} /> :
        trailers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 38, opacity: .14, marginBottom: 10 }}>▶</p>
            <p style={{ fontSize: 14, color: T.sub }}>{t('news.noTrailers')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
            {trailers.map(item => (
              <TrailerCard key={item.id} item={item} T={T}
                isPlaying={playing === item.id}
                onToggle={() => setPlaying(playing === item.id ? null : item.id)} />
            ))}
          </div>
        )
      )}

      {/* On Air */}
      {tab === 'onair' && (
        loading ? <Spinner T={T} /> :
        releases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 38, opacity: .14, marginBottom: 10 }}>📡</p>
            <p style={{ fontSize: 14, color: T.sub }}>{t('news.noOnAir')}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 18 }}>
            {releases.map(item => (
              <NewsCard key={item.id} item={item} onOpen={onOpen} T={T}
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
              <NewsCard key={item.id} item={item} onOpen={onOpen} T={T}
                badge="SOON" badgeColor="#FF9F0A" />
            ))}
          </div>
        )
      )}
    </div>
  )
}
