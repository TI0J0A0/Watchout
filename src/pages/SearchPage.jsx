import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { searchAnime } from '../services/jikan'
import { trackMetricEvent } from '../services/metrics'
import { MediaCard } from '../components/MediaCard'
import { Button, EmptyState, IconButton, LoadingState } from '../components/ui'
import { useIsMobile } from '../hooks/useIsMobile'
import { addRecentSearchResult, normalizeRecentSearchResults } from './searchState'

const MIN_QUERY_LENGTH = 2
const RECENT_KEY = 'watchout_recent_search_results'

export function SearchPage({ onOpen, onStatus, onAddToData, userId = null }) {
  const { T, dark } = useTheme()
  const isMobile = useIsMobile()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [recentResults, setRecentResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const cacheRef = useRef(new Map())
  const requestRef = useRef(0)

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
      setRecentResults(normalizeRecentSearchResults(stored))
    } catch {
      setRecentResults([])
    }
  }, [])

  useEffect(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }
    if (normalized.length < MIN_QUERY_LENGTH) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }

    const timer = setTimeout(() => {
      const requestId = requestRef.current + 1
      requestRef.current = requestId
      setLoading(true)
      setError(null)

      const cached = cacheRef.current.get(normalized)
      const load = cached ? Promise.resolve(cached) : searchAnime(normalized)

      load
        .then(items => {
          if (requestRef.current !== requestId) return
          cacheRef.current.set(normalized, items)
          setResults(items)
          items.forEach(onAddToData)
          trackMetricEvent({
            type: 'search',
            userId,
            page: 'search',
            metadata: {
              query: normalized,
              resultCount: items.length,
              topResultTitle: items[0]?.title ?? null,
              cached: Boolean(cached),
            },
          })
        })
        .catch(() => {
          if (requestRef.current !== requestId) return
          setError('Search failed. Try again in a moment.')
          trackMetricEvent({
            type: 'search_error',
            userId,
            page: 'search',
            metadata: { query: normalized },
          })
        })
        .finally(() => {
          if (requestRef.current === requestId) setLoading(false)
        })
    }, 420)

    return () => clearTimeout(timer)
  }, [query, userId])

  const saveRecentResult = (item) => {
    const next = addRecentSearchResult(recentResults, item)
    setRecentResults(next)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  }

  const clearRecentResults = () => {
    setRecentResults([])
    localStorage.removeItem(RECENT_KEY)
  }

  const openResult = (item) => {
    saveRecentResult(item)
    trackMetricEvent({
      type: 'search_result_click',
      userId,
      animeId: item.id,
      page: 'search',
      metadata: { query: query.trim().toLowerCase(), title: item.title },
    })
    onOpen(item)
  }

  const openRecent = (item) => {
    trackMetricEvent({
      type: 'search_recent_click',
      userId,
      animeId: item.id,
      page: 'search',
      metadata: { title: item.title },
    })
    onOpen(item)
  }

  const hasQuery = Boolean(query.trim())
  const shortQuery = query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH
  const showRecent = !hasQuery && recentResults.length > 0

  return (
    <div className="fu" style={{ paddingTop: isMobile ? 28 : 54, paddingBottom: 56 }}>
      <section style={{
        minHeight: isMobile ? 220 : 300,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 760,
          padding: isMobile ? '0' : '0 18px',
        }}>
          <h2 style={{ fontSize: isMobile ? 30 : 42, fontWeight: 900, color: T.txt, letterSpacing: 0, margin: '0 0 10px' }}>
            Search Anime
          </h2>
          <p style={{ fontSize: 15, color: T.sub, margin: '0 auto 24px', maxWidth: 480, lineHeight: 1.5 }}>
            Find your next watch by title, season, or the anime everyone is talking about.
          </p>

          <div style={{
            position: 'relative',
            maxWidth: 680,
            margin: '0 auto',
            padding: 3,
            borderRadius: 19,
            background: dark
              ? 'linear-gradient(135deg, rgba(10,132,255,.65), rgba(255,159,10,.45))'
              : 'linear-gradient(135deg, rgba(10,132,255,.5), rgba(52,199,89,.38))',
            boxShadow: dark ? '0 18px 60px rgba(0,0,0,.34)' : '0 18px 48px rgba(10,132,255,.12)',
          }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by anime title..."
              autoComplete="off"
              style={{
                width: '100%',
                padding: isMobile ? '15px 48px' : '18px 54px',
                borderRadius: 16,
                background: T.surf,
                border: `1px solid ${dark ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.7)'}`,
                color: T.txt,
                fontSize: isMobile ? 16 : 18,
                outline: 'none',
                textAlign: 'left',
              }}
            />
            <span style={{ position: 'absolute', left: isMobile ? 20 : 24, top: '50%', transform: 'translateY(-50%)', color: T.sub, lineHeight: 1 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            {query && (
              <IconButton
                onClick={() => setQuery('')}
                label="Clear search"
                style={{
                  position: 'absolute',
                  right: isMobile ? 18 : 22,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 28,
                  height: 28,
                  background: T.surf2,
                  fontWeight: 800,
                }}
              >
                x
              </IconButton>
            )}
          </div>

          {shortQuery && (
            <p style={{ fontSize: 13, color: T.sub, margin: '14px 0 0' }}>Type at least 2 characters to search.</p>
          )}
        </div>
      </section>

      {loading && (
        <LoadingState label="Searching..." />
      )}

      {error && !loading && (
        <EmptyState icon="!" title="Search unavailable" description={error} style={{ paddingTop: 30 }} />
      )}

      {showRecent && (
        <section style={{ maxWidth: 980, margin: '0 auto 38px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div>
              <h3 style={{ color: T.txt, fontSize: 18, fontWeight: 850, margin: '0 0 3px' }}>Recent Search Results</h3>
              <p style={{ color: T.sub, fontSize: 12.5, margin: 0 }}>Jump back into titles you opened from search.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={clearRecentResults} style={{ color: T.sub }}>
              Clear
            </Button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(${isMobile ? 126 : 150}px,1fr))`, gap: 14 }}>
            {recentResults.map(item => (
              <button
                key={item.id}
                onClick={() => openRecent(item)}
                style={{
                  padding: 0,
                  border: `1px solid ${T.bord}`,
                  borderRadius: 14,
                  overflow: 'hidden',
                  background: T.surf,
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: dark ? '0 10px 28px rgba(0,0,0,.18)' : '0 10px 24px rgba(0,0,0,.06)',
                }}
              >
                <div style={{ position: 'relative', aspectRatio: '16/10', background: `linear-gradient(135deg,${item.color},${item.colorB})` }}>
                  {item.img && <img src={item.img} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.65), transparent 58%)' }} />
                  <span style={{ position: 'absolute', bottom: 8, left: 9, color: '#fff', fontSize: 11, fontWeight: 800 }}>
                    {item.year || item.type}
                  </span>
                </div>
                <p style={{
                  color: T.txt,
                  fontSize: 13,
                  fontWeight: 750,
                  margin: 0,
                  padding: '10px 11px 12px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.title}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && query.trim().length >= MIN_QUERY_LENGTH && results.length === 0 && (
        <EmptyState
          icon="⌕"
          title="No results"
          description={`No results for "${query.trim()}".`}
          style={{ paddingTop: 42 }}
        />
      )}

      {!loading && results.length > 0 && (
        <section style={{ maxWidth: 1180, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: T.sub, marginBottom: 18 }}>
            {results.length} results for "{query.trim()}"
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill,minmax(${isMobile ? 140 : 190}px,1fr))`, gap: 18 }}>
            {results.map((it, i) => (
              <MediaCard key={it.id} item={it} delay={i * 30} onOpen={openResult} onStatus={onStatus} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
