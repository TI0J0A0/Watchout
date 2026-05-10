import { useState, useEffect, useMemo } from 'react'
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

function AppInner() {
  const { T } = useTheme()
  const { user } = useAuth()
  const {
    data, loading,
    topData, topLoaded, loadTop,
    setStatus, setScore, setEp, setNotes,
    importFromMAL, addToData,
  } = useLibrary()

  const [page,     setPage]     = useState('seasonal')
  const [detailId, setDetailId] = useState(null)
  const [typeF,    setTypeF]    = useState('all')
  const [toast,    setToast]    = useState(null)
  const [heroIdx,  setHeroIdx]  = useState(0)
  const [showAuth,     setShowAuth]     = useState(false)
  const [showMAL,      setShowMAL]      = useState(false)
  const [friendId,     setFriendId]     = useState(null)
  const [friendshipId, setFriendshipId] = useState(null)
  const [isPremium,    setIsPremium]    = useState(false)
  const [userProfile, setUserProfile] = useState(null)

  const notify = msg => { setToast(msg); setTimeout(() => setToast(null), 2400) }

  useEffect(() => {
    if (!user) { setIsPremium(false); return }
    if (isAdmin(user)) { setIsPremium(true); return }
    loadPremiumStatus(user.id).then(setIsPremium).catch(() => {})
  }, [user?.id])

  useEffect(() => {
    if (!user) { setUserProfile(null); return }
    getProfile(user.id).then(setUserProfile).catch(() => {})
  }, [user?.id])

  const refreshProfile = () => {
    if (!user) return
    getProfile(user.id).then(setUserProfile).catch(() => {})
  }

  useEffect(() => {
    if (page === 'top') loadTop()
  }, [page])

  const airingItems = useMemo(() => data.filter(i => i.airing), [data])

  useEffect(() => {
    if (airingItems.length <= 1) return
    const t = setInterval(() => setHeroIdx(h => (h + 1) % airingItems.length), 5000)
    return () => clearInterval(t)
  }, [airingItems.length])

  const navigate = (p) => { setPage(p); setDetailId(null); setFriendId(null); setFriendshipId(null) }

  const openDetail = (item) => {
    addToData(item)
    setDetailId(item.id)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const handleStatus = (id, s) => {
    const msg = setStatus(id, s)
    if (msg) notify(msg)
  }

  const library  = useMemo(() => data.filter(i => i.userStatus), [data])
  const seasonal = useMemo(() => data.filter(i => typeF === 'all' || i.type === typeF), [data, typeF])

  const hero = airingItems[heroIdx % Math.max(airingItems.length, 1)] || data[0]

  return (
    <div style={{
      minHeight: '100vh', background: T.bg, color: T.txt,
      fontFamily: "-apple-system,'SF Pro Display','Helvetica Neue',sans-serif",
      transition: 'background .3s,color .3s',
    }}>
      <Nav page={page} setPage={navigate}
        libraryCount={library.length}
        userProfile={userProfile}
        onLogin={() => setShowAuth(true)} onShowMAL={() => setShowMAL(true)}/>

      {friendId !== null ? (
        <FriendProfilePage
          userId={friendId}
          friendshipId={friendshipId}
          onClose={() => { setFriendId(null); setFriendshipId(null) }}
          onOpen={(item) => { setFriendId(null); setFriendshipId(null); openDetail(item) }}
          onNavigate={navigate}/>
      ) : detailId !== null ? (
        <AnimePage
          item={data.find(d => d.id === detailId)}
          onClose={() => setDetailId(null)}
          onStatus={handleStatus} onScore={setScore} onEp={setEp} onNotes={setNotes}
          onOpen={openDetail} isPremium={isPremium}
          onLogin={() => setShowAuth(true)} />
      ) : (
        <div className="main-content" style={{ padding: '0 28px' }}>
          {page === 'seasonal' && (
            <SeasonalPage
              seasonal={seasonal} data={data} hero={hero} heroIdx={heroIdx} setHeroIdx={setHeroIdx}
              airingItems={airingItems} typeF={typeF} setTypeF={setTypeF}
              loading={loading} onOpen={openDetail} onStatus={handleStatus}/>
          )}
          {page === 'top' && (
            <TopPage topData={topData} loading={!topLoaded} onOpen={openDetail}/>
          )}
          {page === 'calendar' && (
            <CalendarPage data={data} onOpen={openDetail}/>
          )}
          {page === 'search' && (
            <SearchPage
              onOpen={openDetail} onStatus={handleStatus}
              onAddToData={addToData}/>
          )}
          {page === 'profile' && (
            <ProfilePage
              library={library}
              onOpen={openDetail} onStatus={handleStatus} onLogin={() => setShowAuth(true)}
              onViewFriend={(id, fid) => { setFriendId(id); setFriendshipId(fid) }}
              onProfileSaved={refreshProfile}/>
          )}
          {page === 'news' && (
            <NewsPage data={data} loading={loading} onOpen={openDetail}/>
          )}
          {page === 'community' && (
            <CommunityPage onLogin={() => setShowAuth(true)} />
          )}
        </div>
      )}

      {toast    && <Toast message={toast}/>}
      {showAuth && <AuthPage onClose={() => setShowAuth(false)}/>}
      {showMAL  && <MALImport onImport={importFromMAL} onClose={() => setShowMAL(false)}/>}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppInner/>
      </ThemeProvider>
    </AuthProvider>
  )
}
