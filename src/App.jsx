import { useState, useEffect, useRef, useMemo } from 'react'
import { useLibrary } from './hooks/useLibrary'
import { ThemeProvider, useTheme } from './context/ThemeContext'
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
import { fetchHeroEntries } from './services/heroAdmin'
import { AdminPage } from './pages/AdminPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { AnnouncementBanner } from './components/AnnouncementBanner'
import { getGenreById } from './constants/browse'

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

  const airingItems = useMemo(() => data.filter(i => i.airing), [data])
  const controlledHeroItems = useMemo(() => {
    return adminHeroItems.map(item => {
      const local = data.find(d => d.id === item.id)
      return {
        ...(local ?? item),
        heroImageUrl: item.heroImageUrl,
        heroHideTitle: item.heroHideTitle,
      }
    })
  }, [adminHeroItems, data])
  const heroItems = controlledHeroItems.length > 0 ? controlledHeroItems : airingItems

  useEffect(() => {
    if (heroItems.length <= 1) return
    const t = setInterval(() => setHeroIdx(h => (h + 1) % heroItems.length), 5000)
    return () => clearInterval(t)
  }, [heroItems.length])

  useEffect(() => {
    setHeroIdx(0)
  }, [heroItems.length])

  useEffect(() => {
    let cancelled = false
    fetchHeroEntries({ activeOnly: true })
      .then(async entries => {
        const items = await Promise.all(entries.map(async entry => {
          const anime = await fetchAnimeById(entry.anime_id)
          return {
            ...anime,
            heroImageUrl: entry.image_url,
            heroHideTitle: entry.hide_title,
          }
        }))
        if (cancelled) return
        setAdminHeroItems(items)
        items.forEach(addToData)
      })
      .catch(() => setAdminHeroItems([]))
    return () => { cancelled = true }
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
    addToData(item)
    setDetailId(item.id)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const handleStatus = (id, s) => {
    const msg = setStatus(id, s)
    if (msg) notify(msg)
  }

  const library = useMemo(() => data.filter(i => i.userStatus), [data])
  const seasonal = useMemo(() => data.filter(i => typeF === 'all' || i.type === typeF), [data, typeF])

  const hero = heroItems[heroIdx % Math.max(heroItems.length, 1)] || data[0]

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, color: T.txt,
      fontFamily: "-apple-system,'SF Pro Display','Helvetica Neue',sans-serif",
      transition: 'background .3s,color .3s',
    }}>
      <Nav page={page} setPage={navigate}
        libraryCount={library.length}
        userProfile={userProfile}
        onSelectCategory={openCategory}
        onSelectArchiveYear={openArchiveYear}
        onLogin={() => setShowAuth(true)} onShowMAL={() => setShowMAL(true)} />

      <AnnouncementBanner page={page} />

      {friendId !== null ? (
        <FriendProfilePage
          userId={friendId}
          friendshipId={friendshipId}
          onClose={() => { setFriendId(null); setFriendshipId(null) }}
          onOpen={(item) => { setFriendId(null); setFriendshipId(null); openDetail(item) }}
          onNavigate={navigate} />
      ) : detailId !== null ? (
        (() => {
          const detailItem = data.find(d => d.id === detailId)
          return detailItem
            ? <AnimePage
              item={detailItem}
              onClose={() => setDetailId(null)}
              onStatus={handleStatus} onScore={setScore} onEp={setEp} onNotes={setNotes}
              onOpen={openDetail} isPremium={isPremium}
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
              loading={loading} onOpen={openDetail} onStatus={handleStatus}
              initialArchiveYear={selectedArchiveYear} />
          )}

          {page === 'categories' && (
            <CategoriesPage library={library} onOpen={openDetail} onStatus={handleStatus}
              initialGenreId={selectedGenreId} />
          )}

          {page === 'admin' && user && isAdmin(user) && (
            <AdminPage />
          )}
          {page === 'top' && (
            <TopPage topData={topData} loading={!topLoaded} onOpen={openDetail} />
          )}
          {page === 'calendar' && (
            <CalendarPage data={data} onOpen={openDetail} />
          )}
          {page === 'search' && (
            <SearchPage
              onOpen={openDetail} onStatus={handleStatus}
              onAddToData={addToData} />
          )}
          {page === 'profile' && (
            <ProfilePage
              library={library}
              onOpen={openDetail} onStatus={handleStatus} onLogin={() => setShowAuth(true)}
              onViewFriend={(id, fid) => { setFriendId(id); setFriendshipId(fid) }}
              onProfileSaved={refreshProfile} />
          )}
          {page === 'news' && (
            <NewsPage data={data} loading={loading} onOpen={openDetail} />
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
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </AuthProvider>
  )
}
