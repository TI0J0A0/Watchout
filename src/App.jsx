import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react'
import { useLibrary } from './hooks/useLibrary'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Nav } from './components/Nav'
import { Toast } from './components/Toast'
import { SeasonalPage } from './pages/SeasonalPage'
import { AnimePage } from './pages/AnimePage'
import { loadPremiumStatus, isAdmin } from './services/premium'
import { getProfile } from './services/friends'
import { fetchAnimeById } from './services/jikan'
import { fetchHeroEntries, fetchHeroSettings } from './services/heroAdmin'
import { trackMetricEvent } from './services/metrics'
import { hasStreamingProviderLinks } from './utils/streaming'
import { AnnouncementBanner } from './components/AnnouncementBanner'
import { BackToTop } from './components/BackToTop'
import { getGenreById } from './constants/browse'
import { useTVNavigation } from './hooks/useTVNavigation'
import { isAndroidTV } from './utils/platform'

// Code-split rarely-used / heavy routes so they stay out of the initial bundle.
const named = (loader, key) => lazy(() => loader().then(m => ({ default: m[key] })))
const TopPage = named(() => import('./pages/TopPage'), 'TopPage')
const CalendarPage = named(() => import('./pages/CalendarPage'), 'CalendarPage')
const SearchPage = named(() => import('./pages/SearchPage'), 'SearchPage')
const ProfilePage = named(() => import('./pages/ProfilePage'), 'ProfilePage')
const NewsPage = named(() => import('./pages/NewsPage'), 'NewsPage')
const FriendProfilePage = named(() => import('./pages/FriendProfilePage'), 'FriendProfilePage')
const CommunityPage = named(() => import('./pages/CommunityPage'), 'CommunityPage')
const CategoriesPage = named(() => import('./pages/CategoriesPage'), 'CategoriesPage')
const AdminPage = named(() => import('./pages/AdminPage'), 'AdminPage')
const AuthPage = named(() => import('./pages/AuthPage'), 'AuthPage')
const MALImport = named(() => import('./components/MALImport'), 'MALImport')

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
const HERO_ROTATE_MS = 8000

function AppInner() {
  const { T } = useTheme()
  const { user } = useAuth()
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

  // Android TV: enable D-Pad spatial navigation. Detected via UA at first
  // render; the wrapper also fires `funnyroll:platform` once its JS flags land.
  const [isTV, setIsTV] = useState(() => isAndroidTV())
  useEffect(() => {
    const update = () => setIsTV(isAndroidTV())
    window.addEventListener('funnyroll:platform', update)
    return () => window.removeEventListener('funnyroll:platform', update)
  }, [])
  useTVNavigation(isTV)

  const notify = useCallback(msg => { setToast(msg); setTimeout(() => setToast(null), 2400) }, [])
  const dataById = useMemo(() => new Map(data.map(item => [item.id, item])), [data])

  // Refs so hot callbacks can read latest page/user without depending on them,
  // keeping their identity stable across the periodic hero re-render.
  const pageRef = useRef(page)
  pageRef.current = page
  const userIdRef = useRef(user?.id)
  userIdRef.current = user?.id


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
    if (dataById.has(detailId)) return
    fetchAnimeById(detailId).then(addToData).catch(() => { })
  }, [detailId, dataById])

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

  const airingItems = useMemo(() => data.filter(i => i.airing), [data])
  const controlledHeroItems = useMemo(() => {
    return adminHeroItems.slice(0, heroMaxItems).map(item => {
      const local = dataById.get(item.id)
      return {
        ...(local ?? item),
        heroImageUrl: item.heroImageUrl,
        heroLogoUrl: item.heroLogoUrl,
        heroHideTitle: item.heroHideTitle,
      }
    })
  }, [adminHeroItems, dataById, heroMaxItems])
  const heroItems = controlledHeroItems.length > 0 ? controlledHeroItems : airingItems
  const hero = heroItems[heroIdx % Math.max(heroItems.length, 1)] || data[0]

  useEffect(() => {
    // Only rotate while the hero is actually on screen (seasonal page) — avoids
    // re-rendering the whole app every few seconds on other pages.
    if (heroItems.length <= 1 || page !== 'seasonal' || detailId !== null) return
    const t = setInterval(() => setHeroIdx(h => (h + 1) % heroItems.length), HERO_ROTATE_MS)
    return () => clearInterval(t)
  }, [heroItems.length, page, detailId])

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
    const local = dataById.get(animeId)
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

  const openDetailFromSource = useCallback((item, source) => {
    const page = pageRef.current
    addToData(item)
    setDetailId(item.id)
    // Library items loaded from Supabase lack a trailer (and sometimes streaming
    // links), so re-fetch the full record from Jikan to enrich the detail view.
    if (!hasStreamingProviderLinks(item.streaming) || !item.trailer) {
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
      userId: userIdRef.current ?? null,
      animeId: item.id,
      page,
      metadata: { title: item.title, source: source ?? page },
    })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [addToData])

  const handleStatus = useCallback((id, s) => {
    const msg = setStatus(id, s)
    if (msg) notify(msg)
  }, [setStatus, notify])

  // Stable bound handler for the seasonal shelves/grid so memoized cards
  // don't re-render when the hero rotates.
  const onOpenSeasonal = useCallback(item => openDetailFromSource(item, 'seasonal'), [openDetailFromSource])

  const library = useMemo(() => data.filter(i => i.userStatus), [data])
  const seasonal = useMemo(() => data.filter(i => typeF === 'all' || i.type === typeF), [data, typeF])

  return (
    <div style={{
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

      <Suspense fallback={
        <div style={{ padding: '120px 28px', textAlign: 'center', color: T.sub, fontSize: 14 }}>
          Loading…
        </div>
      }>
      {friendId !== null ? (
        <FriendProfilePage
          userId={friendId}
          friendshipId={friendshipId}
          onClose={() => { setFriendId(null); setFriendshipId(null) }}
          onOpen={(item) => { setFriendId(null); setFriendshipId(null); openDetailFromSource(item, 'friend_profile') }}
          onNavigate={navigate} />
      ) : detailId !== null ? (
        (() => {
          const detailItem = dataById.get(detailId)
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
              heroRotateMs={HERO_ROTATE_MS}
              airingItems={airingItems} heroItems={heroItems} typeF={typeF} setTypeF={setTypeF}
              loading={loading} onOpen={onOpenSeasonal} onHeroOpen={(item) => {
                trackMetricEvent({
                  type: 'banner_click',
                  userId: user?.id ?? null,
                  animeId: item.id,
                  page: 'seasonal',
                  metadata: { title: item.title, heroIndex: heroIdx },
                })
                openDetailFromSource(item, 'hero')
              }} onStatus={handleStatus}
              onViewMore={() => navigate('profile')}
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
      </Suspense>

      <BackToTop />
      {toast && <Toast message={toast} />}
      <Suspense fallback={null}>
        {showAuth && <AuthPage onClose={() => setShowAuth(false)} />}
        {showMAL && <MALImport onImport={importFromMAL} onClose={() => setShowMAL(false)} />}
      </Suspense>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </AuthProvider>
  )
}
