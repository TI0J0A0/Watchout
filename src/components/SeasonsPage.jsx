import { useState, useEffect, useMemo } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { fetchSeasonPage } from '../services/jikan'
import { getSafeExternalLinkProps } from '../utils/externalLinks'
import { LoadingGrid } from './LoadingGrid'
import { fmt } from '../utils'
import { useTmdbImage } from '../hooks/useTmdbImage'

const SEASONS = [
  { id: 'winter', label: 'Winter' },
  { id: 'spring', label: 'Spring' },
  { id: 'summer', label: 'Summer' },
  { id: 'fall',   label: 'Fall' },
]

const CUR_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CUR_YEAR - 1999 }, (_, i) => CUR_YEAR - i)

function currentSeason() {
  const m = new Date().getMonth()
  if (m <= 2) return 'winter'
  if (m <= 5) return 'spring'
  if (m <= 8) return 'summer'
  return 'fall'
}

function SeasonCard({ item, onOpen }) {
  const { T, dark } = useTheme()
  const poster = useTmdbImage(item, 'poster')
  const malUrl = `https://myanimelist.net/anime/${item.id}`
  const alUrl  = `https://anilist.co/search/anime?search=${encodeURIComponent(item.title)}`
  const subtitle = item.titleRomaji && item.titleRomaji !== item.title ? item.titleRomaji : null

  const extBtn = (label, url) => {
    const props = getSafeExternalLinkProps(url)
    if (!props) return null
    return (
      <a {...props} className="t hbtn" onClick={e => e.stopPropagation()}
        style={{
          padding: '5px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 700,
          textDecoration: 'none', color: T.sub, background: T.surf2,
          border: `1px solid ${T.bord}`, letterSpacing: '.03em',
        }}>{label}</a>
    )
  }

  return (
    <div className="card t" onClick={() => onOpen(item)} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item) } }}
      style={{
        display: 'flex', gap: 14, padding: 14, borderRadius: 16,
        background: T.surf, border: `1px solid ${T.bord}`, cursor: 'pointer',
        boxShadow: dark ? '0 6px 24px rgba(0,0,0,.3)' : '0 6px 18px rgba(0,0,0,.08)',
      }}>
      <div style={{ width: 104, flexShrink: 0, aspectRatio: '2/3', borderRadius: 10,
        overflow: 'hidden', border: `1px solid ${T.bord}`, background: T.surf2 }}>
        <img src={poster} alt={item.title} loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 700, color: T.txt, lineHeight: 1.25,
          letterSpacing: '-.01em', display: '-webkit-box', WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.title}
        </h3>
        {subtitle && (
          <p style={{ fontSize: 12, fontStyle: 'italic', color: item.color, marginTop: 2,
            display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {subtitle}
          </p>
        )}

        {item.synopsis && (
          <p style={{ fontSize: 12.5, color: T.sub, lineHeight: 1.55, marginTop: 8,
            display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.synopsis}
          </p>
        )}

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto', paddingTop: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: T.sub }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%',
              background: item.airing ? '#34C759' : item.comingSoon ? '#FF9F0A' : T.sub }} />
            {item.format || 'TV'}
          </span>
          {item.year && <span style={{ fontSize: 11.5, fontWeight: 600, color: T.sub }}>{item.year}</span>}
          {item.members > 0 && (
            <span style={{ fontSize: 11.5, fontWeight: 600, color: T.sub }}>👥 {fmt(item.members)}</span>
          )}
        </div>

        {/* Actions + genres */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {extBtn('AL', alUrl)}
          {extBtn('MAL', malUrl)}
          {(item.genres || []).slice(0, 5).map(g => (
            <span key={g} style={{
              padding: '3px 10px', borderRadius: 14, fontSize: 11, fontWeight: 600,
              background: `${item.color}18`, color: item.color, border: `1px solid ${item.color}30`,
            }}>{g}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SeasonsPage({ onOpen }) {
  const { T, dark } = useTheme()
  const isMobile = useIsMobile()
  const [year, setYear]       = useState(CUR_YEAR)
  const [season, setSeason]   = useState(currentSeason())
  const [page, setPage]       = useState(1)
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [lastPage, setLastPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => { setPage(1) }, [year, season])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    fetchSeasonPage(year, season, page)
      .then(({ items, lastPage }) => {
        if (cancelled) return
        setItems(items)
        setLastPage(lastPage)
      })
      // The data source (Jikan → MyAnimeList) can be down or rate-limited. Flag
      // it as an error so we don't render the "no titles" message — which would
      // wrongly imply the season is empty rather than temporarily unavailable.
      .catch(() => { if (!cancelled) { setItems([]); setLastPage(1); setError(true) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [year, season, page, reloadKey])

  const pageNumbers = useMemo(() => {
    const total = Math.min(lastPage, 8)
    return Array.from({ length: total }, (_, i) => i + 1)
  }, [lastPage])

  function goPage(p) {
    if (p < 1 || p > lastPage || p === page) return
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pageBtn = (key, label, target, disabled, active) => (
    <button key={key} className="t" disabled={disabled} onClick={() => goPage(target)}
      style={{
        minWidth: 36, height: 36, padding: '0 10px', borderRadius: 10, cursor: disabled ? 'default' : 'pointer',
        border: `1px solid ${active ? '#8B5CF6' : T.bord}`,
        background: active ? 'rgba(139,92,246,.18)' : T.surf,
        color: active ? '#A78BFA' : (disabled ? T.bord : T.sub),
        fontSize: 13, fontWeight: 700,
      }}>{label}</button>
  )

  return (
    <div className="fu" style={{ paddingTop: 24, paddingBottom: 60 }}>

      {/* Season selector */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: isMobile ? 8 : 16, flexWrap: 'wrap', marginBottom: 22 }}>
        {SEASONS.map((s, i) => (
          <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
            <button className="t" onClick={() => setSeason(s.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: isMobile ? 22 : 30, lineHeight: 1,
                fontWeight: season === s.id ? 800 : 700, letterSpacing: '-.02em',
                color: season === s.id ? T.txt : T.sub,
                opacity: season === s.id ? 1 : 0.5,
              }}>
              {s.label}
            </button>
            {i < SEASONS.length - 1 && (
              <span style={{ color: T.sub, opacity: 0.4, fontSize: isMobile ? 20 : 26, fontWeight: 300 }}>/</span>
            )}
          </span>
        ))}
      </div>

      {/* Year dropdown */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <div style={{ position: 'relative' }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{
              appearance: 'none', WebkitAppearance: 'none',
              padding: '10px 40px 10px 18px', borderRadius: 12, fontSize: 15, fontWeight: 600,
              background: T.surf, color: T.txt, border: `1px solid ${T.bord}`, cursor: 'pointer',
              outline: 'none', minWidth: 160,
            }}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none', color: T.sub, fontSize: 12 }}>▼</span>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <LoadingGrid count={6} />
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: T.sub, fontSize: 14, marginBottom: 16 }}>
            Couldn't load this season. MyAnimeList may be temporarily down.
          </p>
          <button className="t" onClick={() => setReloadKey(k => k + 1)}
            style={{
              padding: '9px 20px', borderRadius: 10, cursor: 'pointer',
              border: `1px solid ${T.bord}`, background: T.surf, color: T.txt,
              fontSize: 13, fontWeight: 700,
            }}>
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <p style={{ textAlign: 'center', color: T.sub, fontSize: 14, padding: '40px 0' }}>
          No titles found for this season.
        </p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(440px, 1fr))',
          gap: 16,
        }}>
          {items.map(it => <SeasonCard key={it.id} item={it} onOpen={onOpen} />)}
        </div>
      )}

      {/* Pagination */}
      {!loading && lastPage > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          gap: 6, marginTop: 28 }}>
          {pageBtn('prev', '‹', page - 1, page <= 1, false)}
          {pageNumbers.map(p => pageBtn(`n${p}`, p, p, false, p === page))}
          {pageBtn('next', '›', page + 1, page >= lastPage, false)}
        </div>
      )}
    </div>
  )
}
