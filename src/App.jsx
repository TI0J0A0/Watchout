import { useState, useEffect, useRef, useMemo } from 'react'
import { useLibrary } from './hooks/useLibrary'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { TvModeProvider, useTvMode } from './context/TvModeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Nav } from './components/Nav'
import { Toast } from './components/Toast'
import { MALImport } from './components/MALImport'
import { AnimePage } from './pages/AnimePage'
import { AuthPage } from './pages/AuthPage'
import { SeasonalPage } from './pages/SeasonalPage'
import { TopPage } from './pages/TopPage'
import { CalendarPage } from './pages/CalendarPage'
import { SearchPage } from './pages/SearchPage'
import { ProfilePage } from './pages/ProfilePage'
import { NewsPage } from './pages/NewsPage'
import { FriendProfilePage } from './pages/FriendProfilePage'
import { CommunityPage } from './pages/CommunityPage'
import { loadPremiumStatus, isAdmin } from './services/premium'
import { getProfile } from './services/friends'
import { fetchAnimeById } from './services/jikan'
import { fetchHeroEntries, fetchHeroSettings } from './services/heroAdmin'
import { trackMetricEvent } from './services/metrics'
import { hasStreamingProviderLinks } from './utils/streaming'
import { AdminPage } from './pages/AdminPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { AnnouncementBanner } from './components/AnnouncementBanner'
import { getGenreById } from './constants/browse'
import { ensureTvElementVisible, focusFirstTvElement, moveTvFocus } from './utils/tvNavigation'

const VALID_PAGES = new Set(['seasonal', 'top', 'calendar', 'categories', 'search', 'profile', 'news', 'community', 'admin'])

function parseHash(hash) {
  const h = (hash || '').replace(/^#/, '')
  if (h.startsWith('anime-')) {
    const id = parseInt(h.slice(6))
    if (!isNaN(id)) return { page: 'seasonal', detailId: id }
  }
  return { page: VALID_PAGES.has(h) ? h : 'seasonal', detailId: null }
}

function buildHash(page, detailId) {
  return detailId !== null ? `#anime-${detailId}` : `#${page}`
}

const HERO_UPDATED_EVENT = 'watchout:hero-updated'

function AppInner() {
  const { T } = useTheme()
  const { user } = useAuth()
  const { isTvMode } = useTvMode()
  const {
    data, loading,
    topData, topLoaded, loadTop,
    setStatus, setScore, setEp, setNotes,
    importFromMAL, addToData,
  } = useLibrary()

  const initHash = parseHash(window.location.hash)
  const [page, setPage] = useState(initHash.page)
  const [detailId, setDetailId] = useState(initHash.detailId)
  const [typeF, setTypeF] = useState('all')
  const [toast, setToast] = useState(null)
  const [heroIdx, setHeroIdx] = useState(0)
  const [showAuth, setShowAuth] = useState(false)
  const [showMAL, setShowMAL] = useState(false)
  const [friendId, setFriendId] = useState(null)
  const [friendshipId, setFriendshipId] = useState(null)
  const [isPremium, setIsPremium] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [selectedGenreId, setSelectedGenreId] = useState(null)
  const [selectedArchiveYear, setSelectedArchiveYear] = useState(null)
  const [adminHeroItems, setAdminHeroItems] = useState([])
  const [heroMaxItems, setHeroMaxItems] = useState(5)

  const notify = msg => { setToast(msg); setTimeout(() => setToast(null), 2400) }


  useEffect(() => {
    // Remove permanentemente o rasto de visitante do navegador de todos os utilizadores.
    // Garante que a lista exibe exclusivamente o que está a ser gerido no Supabase.
    if (localStorage.getItem('watchout_v2')) {
      localStorage.removeItem('watchout_v2')
    }
  }, [])

  // ── Hash-based routing ──────────────────────────────────────────────────────

  const firstPush = useRef(true)

  // Sync state → URL hash (replaceState on first call to avoid spurious history entry)
  useEffect(() => {
    if (friendId !== null) return // friend profiles are transient, don't hash them
    const desired = buildHash(page, detailId)
    if (window.location.hash === desired) return
    if (firstPush.current) {
      firstPush.current = false
      history.replaceState(null, '', desired)
    } else {
      history.pushState(null, '', desired)
    }
  }, [page, detailId, friendId])

  // Browser back/forward → update state
  useEffect(() => {
    function onPop() {
      const { page: p, detailId: d } = parseHash(window.location.hash)
      setPage(p)
      setDetailId(d)
      setFriendId(null)
      setFriendshipId(null)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Deep-link: fetch anime data if we landed on #anime-{id} but data isn't loaded yet
  useEffect(() => {
    if (detailId === null) return
    if (data.find(i => i.id === detailId)) return
    fetchAnimeById(detailId).then(addToData).catch(() => { })
  }, [detailId, data.length])

  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) { setIsPremium(false); return }
    if (isAdmin(user)) { setIsPremium(true); return }
    loadPremiumStatus(user.id).then(setIsPremium).catch(() => { })
  }, [user?.id])

  useEffect(() => {
    if (!user) { setUserProfile(null); return }
    getProfile(user.id).then(setUserProfile).catch(() => { })
  }, [user?.id])

  const refreshProfile = () => {
    if (!user) return
    getProfile(user.id).then(setUserProfile).catch(() => { })
  }

  useEffect(() => {
    if (page === 'top') loadTop()
  }, [page])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.performance) return
    const timer = setTimeout(() => {
      const nav = performance.getEntriesByType?.('navigation')?.[0]
      const loadTimeMs = nav
        ? Math.round(nav.loadEventEnd || nav.domContentLoadedEventEnd || nav.duration)
        : Math.round(performance.now())
      trackMetricEvent({
        type: 'page_load',
        userId: user?.id ?? null,
        page,
        metadata: { page, loadTimeMs },
      })
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isTvMode) return

    const timer = window.setTimeout(() => {
      if (!(document.activeElement instanceof HTMLElement) || document.activeElement === document.body) {
        focusFirstTvElement()
      }
    }, 80)

    return () => window.clearTimeout(timer)
  }, [isTvMode, page, detailId, friendId, showAuth, showMAL])

  useEffect(() => {
    if (!isTvMode) return

    const handleFocusIn = event => {
      ensureTvElementVisible(event.target)
    }

    document.addEventListener('focusin', handleFocusIn)
    return () => document.removeEventListener('focusin', handleFocusIn)
  }, [isTvMode])

  useEffect(() => {
    if (!isTvMode) return

    const isEditableTarget = target => {
      if (!(target instanceof HTMLElement)) return false
      return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    }

    const closeTopLayer = () => {
      if (showMAL) { setShowMAL(false); return true }
      if (showAuth) { setShowAuth(false); return true }
      if (detailId !== null) { setDetailId(null); return true }
      if (friendId !== null) { setFriendId(null); setFriendshipId(null); return true }
      return false
    }

    const handleKeyDown = event => {
      if (isEditableTarget(event.target)) return

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        moveTvFocus('right')
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        moveTvFocus('left')
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        moveTvFocus('down')
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        moveTvFocus('up')
        return
      }

      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault()
        if (closeTopLayer()) return
        if (window.history.length > 1) {
          window.history.back()
        } else {
          navigate('seasonal')
        }
        return
      }

      if (event.key === ' ' || event.code === 'Space') {
        const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null
        const player = activeElement?.closest('[data-tv-player="true"]')

        if (player instanceof HTMLElement && activeElement === player) {
          event.preventDefault()
          player.dispatchEvent(new CustomEvent('tv-toggle-play', { bubbles: true }))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isTvMode, showMAL, showAuth, detailId, friendId, page])

  const airingItems = useMemo(() => data.filter(i => i.airing), [data])
  const controlledHeroItems = useMemo(() => {
    return adminHeroItems.slice(0, heroMaxItems).map(item => {
      const local = data.find(d => d.id === item.id)
      return {
        ...(local ?? item),
        heroImageUrl: item.heroImageUrl,
        heroLogoUrl: item.heroLogoUrl,
        heroHideTitle: item.heroHideTitle,
      }
    })
  }, [adminHeroItems, data, heroMaxItems])
  const heroItems = controlledHeroItems.length > 0 ? controlledHeroItems : airingItems
  const hero = heroItems[heroIdx % Math.max(heroItems.length, 1)] || data[0]

  useEffect(() => {
    if (heroItems.length <= 1) return
    const t = setInterval(() => setHeroIdx(h => (h + 1) % heroItems.length), 5000)
    return () => clearInterval(t)
  }, [heroItems.length])

  useEffect(() => {
    setHeroIdx(0)
  }, [heroItems.length])

  useEffect(() => {
    if (!hero?.id || page !== 'seasonal') return
    trackMetricEvent({
      type: 'banner_view',
      userId: user?.id ?? null,
      animeId: hero.id,
      page: 'seasonal',
      metadata: { title: hero.title, heroIndex: heroIdx },
    })
  }, [hero?.id, heroIdx, page, user?.id])

  const loadHeroConfig = () => {
    let cancelled = false
    Promise.all([
      fetchHeroEntries({ activeOnly: true }),
      fetchHeroSettings(),
    ])
      .then(async ([entries, settings]) => {
        const results = await Promise.allSettled(entries.map(async entry => {
          const anime = await fetchAnimeById(entry.anime_id)
          return {
            ...anime,
            heroImageUrl: entry.image_url,
            heroLogoUrl: entry.logo_url,
            heroHideTitle: entry.hide_title,
            heroSortOrder: entry.sort_order,
          }
        }))

        const items = results
          .filter(result => result.status === 'fulfilled')
          .map(result => result.value)
          .sort((a, b) => (a.heroSortOrder ?? 0) - (b.heroSortOrder ?? 0))

        if (cancelled) return
        setHeroMaxItems(settings?.max_items ?? 5)
        setAdminHeroItems(items)
        items.forEach(addToData)
      })
      .catch(() => {
        if (!cancelled) setAdminHeroItems([])
      })
    return () => { cancelled = true }
  }

  useEffect(() => {
    return loadHeroConfig()
  }, [])

  useEffect(() => {
    if (page !== 'seasonal') return
    return loadHeroConfig()
  }, [page])

  useEffect(() => {
    const handleHeroUpdated = () => loadHeroConfig()
    window.addEventListener(HERO_UPDATED_EVENT, handleHeroUpdated)
    return () => window.removeEventListener(HERO_UPDATED_EVENT, handleHeroUpdated)
  }, [])

  const navigate = (p) => { setPage(p); setDetailId(null); setFriendId(null); setFriendshipId(null) }

  const openCategory = (genreId) => {
    setSelectedGenreId(getGenreById(genreId).id)
    navigate('categories')
  }

  const openArchiveYear = (year) => {
    setSelectedArchiveYear(year)
    navigate('seasonal')
  }

  const openDetail = (item) => {
    openDetailFromSource(item, page)
  }

  const openAnimeById = async (animeId, source = 'notification') => {
    const local = data.find(item => item.id === animeId)
    if (local) {
      openDetailFromSource(local, source)
      return
    }
    try {
      const anime = await fetchAnimeById(animeId)
      openDetailFromSource(anime, source)
    } catch {
      setDetailId(animeId)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }

  const openDetailFromSource = (item, source = page) => {
    addToData(item)
    setDetailId(item.id)
    if (!hasStreamingProviderLinks(item.streaming)) {
      fetchAnimeById(item.id)
        .then(full => addToData({
          ...full,
          userStatus: item.userStatus,
          userScore: item.userScore,
          userEp: item.userEp,
          userNotes: item.userNotes,
        }))
        .catch(() => {})
    }
    trackMetricEvent({
      type: 'anime_open',
      userId: user?.id ?? null,
      animeId: item.id,
      page,
      metadata: { title: item.title, source },
    })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const handleStatus = (id, s) => {
    const msg = setStatus(id, s)
    if (msg) notify(msg)
  }

  const library = useMemo(() => data.filter(i => i.userStatus), [data])
  const seasonal = useMemo(() => data.filter(i => typeF === 'all' || i.type === typeF), [data, typeF])

  return (
    <div className={isTvMode ? 'tv-mode-shell' : undefined} style={{
      minHeight: '100vh', background: T.bg, color: T.txt,
      fontFamily: "-apple-system,'SF Pro Display','Helvetica Neue',sans-serif",
      transition: 'background .3s,color .3s',
    }}>
      <Nav page={page} setPage={navigate}
        userProfile={userProfile}
        onSelectCategory={openCategory}
        onSelectArchiveYear={openArchiveYear}
        onOpenNotificationAnime={(animeId) => openAnimeById(animeId, 'notification')}
        onLogin={() => setShowAuth(true)} onShowMAL={() => setShowMAL(true)} />

      <AnnouncementBanner page={page} />

      {friendId !== null ? (
        <FriendProfilePage
          userId={friendId}
          friendshipId={friendshipId}
          onClose={() => { setFriendId(null); setFriendshipId(null) }}
          onOpen={(item) => { setFriendId(null); setFriendshipId(null); openDetailFromSource(item, 'friend_profile') }}
          onNavigate={navigate} />
      ) : detailId !== null ? (
        (() => {
          const detailItem = data.find(d => d.id === detailId)
          return detailItem
            ? <AnimePage
              item={detailItem}
              onClose={() => setDetailId(null)}
              onStatus={handleStatus} onScore={setScore} onEp={setEp} onNotes={setNotes}
              onOpen={(item) => openDetailFromSource(item, 'anime_detail_related')} isPremium={isPremium}
              onLogin={() => setShowAuth(true)} />
            : <div style={{ padding: '120px 28px', textAlign: 'center', color: T.sub, fontSize: 14 }}>
              Loading…
            </div>
        })()
      ) : (
        <div className="main-content" style={{ padding: '0 28px' }}>
          {page === 'seasonal' && (
            <SeasonalPage
              seasonal={seasonal} data={data} hero={hero} heroIdx={heroIdx} setHeroIdx={setHeroIdx}
              airingItems={airingItems} heroItems={heroItems} typeF={typeF} setTypeF={setTypeF}
              loading={loading} onOpen={(item) => openDetailFromSource(item, 'seasonal')} onHeroOpen={(item) => {
                trackMetricEvent({
                  type: 'banner_click',
                  userId: user?.id ?? null,
                  animeId: item.id,
                  page: 'seasonal',
                  metadata: { title: item.title, heroIndex: heroIdx },
                })
                openDetailFromSource(item, 'hero')
              }} onStatus={handleStatus}
              initialArchiveYear={selectedArchiveYear} />
          )}

          {page === 'categories' && (
            <CategoriesPage library={library} onOpen={(item) => openDetailFromSource(item, 'categories')} onStatus={handleStatus}
              initialGenreId={selectedGenreId} />
          )}

          {page === 'admin' && user && isAdmin(user) && (
            <AdminPage />
          )}
          {page === 'top' && (
            <TopPage topData={topData} loading={!topLoaded} onOpen={(item) => openDetailFromSource(item, 'top')} />
          )}
          {page === 'calendar' && (
            <CalendarPage data={data} onOpen={(item) => openDetailFromSource(item, 'calendar')} />
          )}
          {page === 'search' && (
            <SearchPage
              onOpen={(item) => openDetailFromSource(item, 'search')} onStatus={handleStatus}
              onAddToData={addToData}
              userId={user?.id ?? null} />
          )}
          {page === 'profile' && (
            <ProfilePage
              library={library}
              onOpen={(item) => openDetailFromSource(item, 'profile')} onStatus={handleStatus} onLogin={() => setShowAuth(true)}
              onViewFriend={(id, fid) => { setFriendId(id); setFriendshipId(fid) }}
              onProfileSaved={refreshProfile} />
          )}
          {page === 'news' && (
            <NewsPage data={data} loading={loading} onOpen={(item) => openDetailFromSource(item, 'news')} />
          )}
          {page === 'community' && (
            <CommunityPage onLogin={() => setShowAuth(true)} />
          )}
        </div>
      )}

      {toast && <Toast message={toast} />}
      {showAuth && <AuthPage onClose={() => setShowAuth(false)} />}
      {showMAL && <MALImport onImport={importFromMAL} onClose={() => setShowMAL(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <TvModeProvider>
        <ThemeProvider>
          <AppInner />
        </ThemeProvider>
      </TvModeProvider>
    </AuthProvider>
  )
}
