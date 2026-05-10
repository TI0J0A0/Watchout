import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAuth } from '../context/AuthContext'
import { SM, AVATAR_GRADS, AVATAR_PRESETS, BANNER_THEMES } from '../constants'
import { AvatarPic } from '../components/AvatarPic'
import { StatBox } from '../components/StatBox'
import { MediaCard } from '../components/MediaCard'
import { fmtTime } from '../utils'
import { supabase } from '../services/supabase'
import {
  upsertProfile, getFriendsWithProfiles, getPendingRequests,
  searchProfiles, sendFriendRequest, acceptFriendRequest, deleteFriendship,
} from '../services/friends'
import { ADMIN_EMAIL, isAdmin, adminSearchUsers, grantPremium, revokePremium } from '../services/premium'
import { computeTasteProfile, personalityText } from '../utils/tasteProfile'


function initMeta(user) {
  const m = user?.user_metadata ?? {}
  return {
    displayName:   m.displayName   ?? '',
    avatarGrad:    typeof m.avatarGrad === 'number' ? m.avatarGrad : 0,
    avatarUrl:     m.avatarUrl     ?? '',
    bannerTheme:   typeof m.bannerTheme === 'number' ? m.bannerTheme : null,
    bannerUrl:      m.bannerUrl      ?? null,
    bannerAnimeId:  m.bannerAnimeId  ?? null,
    pinnedAnimeId:  m.pinnedAnimeId  ?? null,
  }
}

const SORTS = {
  title:   (a, b) => a.title.localeCompare(b.title),
  score:   (a, b) => b.score - a.score,
  myscore: (a, b) => (b.userScore || 0) - (a.userScore || 0),
}

export function ProfilePage({ library, onOpen, onStatus, onLogin, onViewFriend = () => {}, onProfileSaved = () => {} }) {
  const { T, dark, setDark } = useTheme()
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const isMobile = useIsMobile()
  const isEN = i18n.language === 'en' || i18n.language.startsWith('en')

  const [committed, setCommitted] = useState(() => initMeta(user))
  const [editOpen,  setEditOpen]  = useState(false)
  const [draft,     setDraft]     = useState(committed)
  const [saving,    setSaving]    = useState(false)
  const [presetImgs,    setPresetImgs]    = useState({})
  const [bannerLoading, setBannerLoading] = useState(null)
  const [avatarBroken,  setAvatarBroken]  = useState(false)

  const [friends,            setFriends]            = useState([])
  const [friendsLoading,     setFriendsLoading]     = useState(true)
  const [pendingRequests,    setPendingRequests]     = useState([])
  const [showFriendModal,    setShowFriendModal]    = useState(false)
  const [friendSearch,       setFriendSearch]       = useState('')
  const [friendResults,      setFriendResults]      = useState([])
  const [friendSearchLoading,setFriendSearchLoading]= useState(false)
  const [sentRequests,       setSentRequests]       = useState(new Set())

  const [adminQuery,         setAdminQuery]         = useState('')
  const [adminResults,       setAdminResults]       = useState([])
  const [adminLoading,       setAdminLoading]       = useState(false)
  const [adminUpdating,      setAdminUpdating]      = useState(null)

  const [libF,      setLibF]      = useState('all')
  const [libSort,   setLibSort]   = useState('title')
  const [libSearch, setLibSearch] = useState('')
  const libSectionRef = useRef(null)

  useEffect(() => {
    if (!user) return
    setFriendsLoading(true)
    Promise.all([getFriendsWithProfiles(user.id), getPendingRequests(user.id)])
      .then(([f, p]) => { setFriends(f); setPendingRequests(p) })
      .catch(() => {})
      .finally(() => setFriendsLoading(false))
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    setCommitted(initMeta(user))
  }, [user?.id])

  useEffect(() => {
    setAvatarBroken(false)
  }, [active.avatarUrl])

  useEffect(() => {
    if (!editOpen) return
    const fields = AVATAR_PRESETS.map(p => `c${p.anilistId}:Character(id:${p.anilistId}){image{large}}`).join(' ')
    fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `{${fields}}` }),
    })
      .then(r => r.json())
      .then(json => {
        const map = {}
        for (const [k, v] of Object.entries(json.data ?? {})) {
          if (v?.image?.large) map[parseInt(k.slice(1))] = v.image.large
        }
        setPresetImgs(map)
      })
      .catch(() => {})
  }, [editOpen])

  async function pickAnimeBanner(item) {
    setBannerLoading(item.id)
    try {
      const query = `query($id:Int){Media(idMal:$id,type:ANIME){bannerImage}}`
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { id: item.id } }),
      })
      const json = await res.json()
      const url  = json?.data?.Media?.bannerImage
      if (url) setDraft(d => ({ ...d, bannerUrl: url, bannerTheme: null, bannerAnimeId: item.id }))
    } catch {}
    setBannerLoading(null)
  }

  const active = editOpen ? draft : committed

  const openEdit   = () => { setDraft({ ...committed }); setEditOpen(true) }
  const cancelEdit = () => setEditOpen(false)
  const saveEdit   = async () => {
    setSaving(true)
    if (supabase) {
      await supabase.auth.updateUser({ data: draft }).catch(console.error)
      await upsertProfile(user, draft).catch(console.error)
    }
    setCommitted(draft)
    setEditOpen(false)
    setSaving(false)
    onProfileSaved()
  }

  const username    = user?.email?.split('@')[0] ?? ''
  const displayName = active.displayName || username
  const initials    = displayName.slice(0, 2).toUpperCase()
  const avatarGrad  = AVATAR_GRADS[active.avatarGrad] ?? AVATAR_GRADS[0]

  const animeLib = useMemo(() => library.filter(i => i.type === 'anime'), [library])

  const animeWatchedEps = useMemo(() =>
    animeLib.reduce((acc, i) =>
      acc + (i.userEp || (i.userStatus === 'completed' && i.eps ? i.eps : 0)), 0)
  , [animeLib])

  const animeWatchTimeMin = useMemo(() =>
    animeLib.reduce((acc, i) => {
      const eps = i.userEp || (i.userStatus === 'completed' && i.eps ? i.eps : 0)
      return acc + eps * (i.duration || 24)
    }, 0)
  , [animeLib])

  const animeScoredItems = useMemo(() => animeLib.filter(i => i.userScore), [animeLib])

  const animeAvgScore = animeScoredItems.length
    ? (animeScoredItems.reduce((a, i) => a + i.userScore, 0) / animeScoredItems.length).toFixed(1)
    : '—'

  const statusCounts = useMemo(() =>
    Object.fromEntries(Object.keys(SM).map(s => [s, animeLib.filter(i => i.userStatus === s).length]))
  , [animeLib])

  const watchingNow = useMemo(() => animeLib.filter(i => i.userStatus === 'watching'), [animeLib])

  const lib = useMemo(() =>
    animeLib.filter(i => libF === 'all' || i.userStatus === libF).sort(SORTS[libSort])
  , [animeLib, libF, libSort])

  const displayed = libSearch.trim()
    ? lib.filter(i => i.title.toLowerCase().includes(libSearch.toLowerCase()))
    : lib

  const topRated = useMemo(() =>
    [...animeScoredItems].sort((a, b) => b.userScore - a.userScore).slice(0, 8)
  , [animeScoredItems])

  const scoreDistrib = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => ({
      score: i + 1,
      count: animeLib.filter(it => it.userScore === i + 1).length,
    }))
  , [animeLib])

  const maxScoreCount = Math.max(...scoreDistrib.map(s => s.count), 1)

  const tasteProfile = useMemo(() => computeTasteProfile(animeLib, { minItems: 1 }), [animeLib])
  const personality  = useMemo(() => personalityText(tasteProfile), [tasteProfile])

  const autoBannerAnime = useMemo(() => {
    if (!animeLib.length) return null
    const scored = [...animeScoredItems].sort((a, b) => b.userScore - a.userScore)
    return scored[0] ?? animeLib[0]
  }, [animeLib, animeScoredItems])

  const autoBannerColor = useMemo(() => {
    if (!animeLib.length) return { a:'#0A84FF', b:'#BF5AF2' }
    const cc = {}
    animeLib.forEach(i => { cc[i.color] = (cc[i.color] || 0) + 1 })
    const top = Object.entries(cc).sort((a, b) => b[1] - a[1])[0][0]
    return { a: top, b: animeLib.find(i => i.color === top)?.colorB ?? top }
  }, [animeLib])

  const pinnedAnime = useMemo(() =>
    active.pinnedAnimeId ? (animeLib.find(i => i.id === active.pinnedAnimeId) ?? null) : null
  , [animeLib, active.pinnedAnimeId])

  const hasCustomBanner = active.bannerTheme !== null && active.bannerTheme !== undefined
  const bannerColor     = hasCustomBanner ? BANNER_THEMES[active.bannerTheme] : autoBannerColor

  const pinnedYtId     = pinnedAnime?.trailer?.match(/embed\/([^?]+)/)?.[1]
  const bannerYtThumb  = pinnedYtId ? `https://img.youtube.com/vi/${pinnedYtId}/maxresdefault.jpg` : null
  const bannerBlurImg  = bannerYtThumb ? null : (pinnedAnime?.img ?? (hasCustomBanner ? null : autoBannerAnime?.img))

  // Friends handlers
  const handleFriendSearch = async (q) => {
    setFriendSearch(q)
    if (q.length < 2) { setFriendResults([]); return }
    setFriendSearchLoading(true)
    try {
      const results = await searchProfiles(q)
      setFriendResults(results.filter(p => p.id !== user?.id))
    } catch {}
    setFriendSearchLoading(false)
  }

  const handleSendRequest = async (addresseeId) => {
    try {
      await sendFriendRequest(user.id, addresseeId)
      setSentRequests(prev => new Set([...prev, addresseeId]))
    } catch {}
  }

  const handleAccept = async (friendshipId) => {
    try {
      await acceptFriendRequest(friendshipId)
      setPendingRequests(prev => prev.filter(r => r.id !== friendshipId))
      getFriendsWithProfiles(user.id).then(setFriends).catch(() => {})
    } catch {}
  }

  const handleDecline = async (friendshipId) => {
    try {
      await deleteFriendship(friendshipId)
      setPendingRequests(prev => prev.filter(r => r.id !== friendshipId))
    } catch {}
  }

  const closeFriendModal = () => {
    setShowFriendModal(false)
    setFriendSearch('')
    setFriendResults([])
  }

  const handleAdminSearch = async (q) => {
    setAdminQuery(q)
    if (!q.trim()) { setAdminResults([]); return }
    setAdminLoading(true)
    try {
      const results = await adminSearchUsers(q)
      setAdminResults(results.filter(p => p.id !== user?.id))
    } catch {}
    setAdminLoading(false)
  }

  const handleTogglePremium = async (profile) => {
    setAdminUpdating(profile.id)
    try {
      if (profile.is_premium) {
        await revokePremium(profile.id)
      } else {
        await grantPremium(profile.id)
      }
      setAdminResults(prev => prev.map(p =>
        p.id === profile.id ? { ...p, is_premium: !p.is_premium } : p
      ))
    } catch {}
    setAdminUpdating(null)
  }

  if (!user) {
    return (
      <div className="fu" style={{ display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', paddingTop:100, paddingBottom:100, gap:16 }}>
        <div style={{ width:72, height:72, borderRadius:'50%',
          background:'linear-gradient(135deg,#0A84FF,#BF5AF2)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:28, color:'#fff', fontWeight:700, opacity:.4 }}>?</div>
        <p style={{ fontSize:17, fontWeight:600, color:T.txt }}>{t('profile.title')}</p>
        <p style={{ fontSize:14, color:T.sub, textAlign:'center', maxWidth:280, lineHeight:1.55 }}>
          {t('profile.loginPrompt')}
        </p>
        <button onClick={onLogin} style={{ marginTop:8, padding:'10px 28px', borderRadius:22,
          background:'#0A84FF', color:'#fff', border:'none', fontSize:14, fontWeight:600,
          cursor:'pointer' }}>
          {t('profile.signIn')}
        </button>
      </div>
    )
  }

  return (
    <div className="fu" style={{ paddingBottom:60 }}>
      <style>{`@keyframes avatarSpin { to { transform: rotate(360deg) } }`}</style>

      {/* ── Banner + avatar ── */}
      <div style={{ position:'relative', marginTop:28, marginBottom:0 }}>

        <div style={{ borderRadius:24, overflow:'hidden', height:280, position:'relative',
          background:`linear-gradient(135deg,${bannerColor.a},${bannerColor.b})`,
          boxShadow:`0 12px 48px ${bannerColor.a}44` }}>

          {active.bannerUrl ? (
            <img src={active.bannerUrl} alt="" style={{ position:'absolute', inset:0,
              width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 25%' }}/>
          ) : bannerYtThumb ? (
            <img src={bannerYtThumb} alt="" style={{ position:'absolute', inset:0,
              width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }}/>
          ) : bannerBlurImg ? (
            <img src={bannerBlurImg} alt="" style={{ position:'absolute', inset:0,
              width:'100%', height:'100%', objectFit:'cover',
              filter:'blur(28px)', transform:'scale(1.15)',
              opacity: dark ? .35 : .22 }}/>
          ) : null}

          <div style={{ position:'absolute', inset:0,
            background: (active.bannerUrl || bannerYtThumb)
              ? 'linear-gradient(to bottom, rgba(0,0,0,.08) 0%, rgba(0,0,0,.42) 100%)'
              : `linear-gradient(135deg,${bannerColor.a}99,${bannerColor.b}88)` }}/>
          {!active.bannerUrl && !bannerYtThumb && (
            <div style={{ position:'absolute', inset:0,
              background:'linear-gradient(to bottom,transparent 50%,rgba(0,0,0,.3) 100%)' }}/>
          )}
        </div>

        {/* Edit / Cancel button */}
        <button className="t" onClick={editOpen ? cancelEdit : openEdit}
          style={{ position:'absolute', top:12, right:12, zIndex:4,
            padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer',
            background:'rgba(0,0,0,.38)', backdropFilter:'blur(8px)',
            color:'#fff', fontSize:12, fontWeight:600,
            display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ fontSize:13 }}>{editOpen ? '✕' : '✏'}</span>
          {editOpen ? t('profile.cancel') : t('profile.editProfile')}
        </button>

        {/* Animated avatar */}
        <div style={{ position:'absolute', bottom:-54, left:16, zIndex:3,
          width:108, height:108 }}>
          {/* spinning conic border */}
          <div style={{ position:'absolute', inset:0, borderRadius:'50%',
            background:`conic-gradient(from 0deg, ${avatarGrad[0]}, ${avatarGrad[1]}, ${avatarGrad[0]})`,
            animation:'avatarSpin 3s linear infinite' }}/>
          {/* separator ring */}
          <div style={{ position:'absolute', inset:3, borderRadius:'50%', background:T.bg }}/>
          {/* avatar content */}
          <div style={{ position:'absolute', inset:6, borderRadius:'50%',
            overflow: (active.avatarUrl && !avatarBroken) ? 'hidden' : 'visible',
            background: (active.avatarUrl && !avatarBroken)
              ? 'transparent'
              : `linear-gradient(135deg,${avatarGrad[0]},${avatarGrad[1]})`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:22, fontWeight:700, color:'#fff' }}>
            {(active.avatarUrl && !avatarBroken)
              ? <img src={active.avatarUrl} alt=""
                  style={{ width:'100%', height:'100%', objectFit:'cover' }}
                  onError={() => setAvatarBroken(true)}
                />
              : initials
            }
          </div>
        </div>
      </div>

      {/* ── Name + tagline ── */}
      <div style={{ paddingLeft:136, paddingTop:10, marginBottom:20, minHeight:60 }}>
        <p style={{ fontSize:18, fontWeight:700, color:T.txt, letterSpacing:'-.02em',
          maxWidth:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {displayName}
        </p>
        <p style={{ fontSize:13, color:T.sub, marginTop:3 }}>
          {t('profile.animeCount', { count: animeLib.length })}
          {animeAvgScore !== '—' ? ` · ${t('profile.avgScoreLabel')} ${animeAvgScore}` : ''}
        </p>
      </div>

      {/* Mobile lang toggle */}
      {isMobile && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className="t hbtn" onClick={() => i18n.changeLanguage(isEN ? 'pt-BR' : 'en')}
            style={{ height: 36, padding: '0 14px', borderRadius: 18, border: `1px solid ${T.bord}`,
              background: T.surf, fontSize: 12, fontWeight: 700, color: T.sub, letterSpacing: '.04em' }}>
            {isEN ? 'PT' : 'EN'}
          </button>
        </div>
      )}

      {/* ── Featured Anime card ── */}
      {pinnedAnime && !editOpen && (
        <div className="t" onClick={() => onOpen(pinnedAnime)}
          style={{ borderRadius:18, overflow:'hidden', cursor:'pointer', position:'relative', height:88,
            background:`linear-gradient(135deg,${pinnedAnime.color},${pinnedAnime.colorB})`,
            boxShadow:`0 8px 28px ${pinnedAnime.color}33`, marginBottom:24 }}>
          <img src={pinnedAnime.img} alt="" style={{ position:'absolute', inset:0,
            width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top', opacity:.28 }}/>
          <div style={{ position:'absolute', inset:0,
            background:'linear-gradient(90deg, rgba(0,0,0,.62) 55%, transparent)' }}/>
          <div style={{ position:'relative', display:'flex', alignItems:'center',
            gap:12, padding:'12px 16px', height:'100%', boxSizing:'border-box' }}>
            <img src={pinnedAnime.img} alt="" style={{ width:46, height:62, objectFit:'cover',
              borderRadius:10, flexShrink:0, boxShadow:'0 2px 12px rgba(0,0,0,.45)' }}/>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,.6)',
                letterSpacing:'.06em', marginBottom:3 }}>
                ⭐ {t('profile.pinnedAnime').toUpperCase()}
              </p>
              <p style={{ fontSize:15, fontWeight:700, color:'#fff', lineHeight:1.2, marginBottom:4,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {pinnedAnime.title}
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {pinnedAnime.userScore && (
                  <span style={{ fontSize:12, color:'#FFD60A', fontWeight:700 }}>
                    ★ {pinnedAnime.userScore}/10
                  </span>
                )}
                {pinnedAnime.userStatus && SM[pinnedAnime.userStatus] && (
                  <span style={{ fontSize:11, color:'rgba(255,255,255,.7)' }}>
                    {t(`status.${pinnedAnime.userStatus}`)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Panel ── */}
      {editOpen && (
        <div className="sc" style={{ borderRadius:20, padding:'20px',
          background:T.surf, border:`1px solid ${T.bord}`,
          boxShadow:`0 8px 32px rgba(0,0,0,${dark?.22:.10})`,
          marginBottom:28 }}>

          {/* Display name */}
          <div style={{ marginBottom:20 }}>
            <p style={{ fontSize:12, fontWeight:600, color:T.sub,
              letterSpacing:'.04em', textTransform:'uppercase', marginBottom:8 }}>
              {t('profile.displayName')}
            </p>
            <input
              type="text" placeholder={username}
              value={draft.displayName}
              maxLength={30}
              onChange={e => setDraft(d => ({ ...d, displayName: e.target.value }))}
              style={{ width:'100%', padding:'10px 14px', borderRadius:12, fontSize:14,
                background: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)',
                border:`1px solid ${T.bord}`, color:T.txt, outline:'none',
                fontFamily:'inherit', boxSizing:'border-box' }}
            />
          </div>

          {/* Profile picture */}
          <div style={{ marginBottom:20 }}>
            <p style={{ fontSize:12, fontWeight:600, color:T.sub,
              letterSpacing:'.04em', textTransform:'uppercase', marginBottom:8 }}>
              {t('profile.profilePicture')}
            </p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
              {AVATAR_GRADS.map(([a, b], i) => (
                <button key={i} onClick={() => setDraft(d => ({ ...d, avatarGrad:i, avatarUrl:'' }))}
                  style={{ width:40, height:40, borderRadius:'50%', border:'none', cursor:'pointer',
                    background:`linear-gradient(135deg,${a},${b})`,
                    outline: draft.avatarGrad === i && !draft.avatarUrl
                      ? `3px solid ${T.txt}` : `3px solid transparent`,
                    outlineOffset:2, transition:'outline .15s' }}/>
              ))}
            </div>
            {/* Character presets */}
            <p style={{ fontSize: 11, fontWeight: 600, color: T.sub, marginBottom: 6 }}>
              Personagens populares
            </p>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5, marginBottom: 10,
            }}>
              {AVATAR_PRESETS.map(p => {
                const imgUrl = presetImgs[p.anilistId]
                const selected = imgUrl && draft.avatarUrl === imgUrl
                return (
                  <button key={p.name} className="t" title={p.name}
                    onClick={() => imgUrl && setDraft(d => ({ ...d, avatarUrl: imgUrl }))}
                    style={{
                      padding: 0, border: selected ? '2.5px solid #0A84FF' : '2.5px solid transparent',
                      borderRadius: 8, overflow: 'hidden', cursor: imgUrl ? 'pointer' : 'default',
                      aspectRatio: '1', background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)',
                    }}>
                    {imgUrl
                      ? <img src={imgUrl} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${dark?'rgba(255,255,255,.2)':'rgba(0,0,0,.15)'}`, borderTopColor:'#0A84FF', animation:'spin .7s linear infinite' }}/>
                        </div>
                    }
                  </button>
                )
              })}
            </div>
            <input
              type="url" placeholder={t('profile.pasteImageUrl')}
              value={draft.avatarUrl}
              onChange={e => setDraft(d => ({ ...d, avatarUrl: e.target.value }))}
              style={{ width:'100%', padding:'9px 14px', borderRadius:12, fontSize:13,
                background: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)',
                border:`1px solid ${T.bord}`, color:T.txt, outline:'none',
                fontFamily:'inherit', boxSizing:'border-box' }}
            />
          </div>

          {/* Banner */}
          <div style={{ marginBottom:20 }}>
            <p style={{ fontSize:12, fontWeight:600, color:T.sub,
              letterSpacing:'.04em', textTransform:'uppercase', marginBottom:8 }}>
              {t('profile.banner')}
            </p>
            {/* Gradients row */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
              <button onClick={() => setDraft(d => ({ ...d, bannerTheme: null, bannerUrl: null, bannerAnimeId: null }))}
                style={{ height:36, padding:'0 14px', borderRadius:12, border:'none',
                  cursor:'pointer', fontSize:12, fontWeight:600,
                  background: draft.bannerTheme === null && !draft.bannerUrl
                    ? (dark ? '#3A3A3C' : '#1D1D1F') : T.surf2,
                  color: draft.bannerTheme === null && !draft.bannerUrl ? '#fff' : T.sub,
                  transition:'all .15s' }}>
                {t('profile.auto')}
              </button>
              {BANNER_THEMES.map(({ a, b }, i) => (
                <button key={i} onClick={() => setDraft(d => ({ ...d, bannerTheme: i, bannerUrl: null, bannerAnimeId: null }))}
                  style={{ width:36, height:36, borderRadius:12, border:'none', cursor:'pointer',
                    background:`linear-gradient(135deg,${a},${b})`,
                    outline: draft.bannerTheme === i && !draft.bannerUrl
                      ? `3px solid ${T.txt}` : `3px solid transparent`,
                    outlineOffset:2, transition:'outline .15s' }}/>
              ))}
            </div>
            {/* Library anime banners */}
            {animeLib.length > 0 && (
              <>
                <p style={{ fontSize:11, fontWeight:600, color:T.sub, marginBottom:6 }}>Banner de um anime</p>
                <div style={{ display:'flex', gap:7, overflowX:'auto', scrollbarWidth:'none', paddingBottom:4 }}>
                  {[...animeLib].sort((a,b) => (b.userScore??0)-(a.userScore??0)).slice(0,20).map(item => {
                    const loading  = bannerLoading === item.id
                    const selected = draft.bannerUrl && bannerLoading !== item.id &&
                      draft.bannerAnimeId === item.id
                    return (
                      <button key={item.id} className="t" title={item.title}
                        onClick={() => pickAnimeBanner(item)}
                        style={{
                          flexShrink:0, padding:0, borderRadius:10, overflow:'hidden', cursor:'pointer',
                          width:72, height:100, position:'relative',
                          border: selected ? '2.5px solid #0A84FF' : '2.5px solid transparent',
                          background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)',
                        }}>
                        <img src={item.img} alt={item.title}
                          style={{ width:'100%', height:'100%', objectFit:'cover', display:'block', opacity: loading ? .4 : 1 }} />
                        {loading && (
                          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <div style={{ width:16, height:16, borderRadius:'50%', border:'2.5px solid rgba(255,255,255,.3)', borderTopColor:'#fff', animation:'spin .7s linear infinite' }}/>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Featured anime */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <p style={{ fontSize:12, fontWeight:600, color:T.sub,
                letterSpacing:'.04em', textTransform:'uppercase' }}>
                {t('profile.pinnedAnime')}
              </p>
              {draft.pinnedAnimeId && (
                <button onClick={() => setDraft(d => ({ ...d, pinnedAnimeId: null }))}
                  style={{ fontSize:12, color:'#FF3B30', background:'none', border:'none',
                    cursor:'pointer', fontFamily:'inherit' }}>
                  {t('profile.removePinned')}
                </button>
              )}
            </div>
            {draft.pinnedAnimeId && (() => {
              const p = animeLib.find(i => i.id === draft.pinnedAnimeId)
              return p ? (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                  borderRadius:12, background:'rgba(10,132,255,.1)',
                  border:'1px solid rgba(10,132,255,.2)', marginBottom:10 }}>
                  <img src={p.img} alt="" style={{ width:32, height:44, objectFit:'cover', borderRadius:6 }}/>
                  <p style={{ fontSize:13, fontWeight:600, color:'#0A84FF',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</p>
                </div>
              ) : null
            })()}
            <div style={{ display:'flex', gap:8, overflowX:'auto',
              scrollbarWidth:'none', paddingBottom:4 }}>
              {animeLib
                .filter(i => i.userStatus === 'watching' || i.userStatus === 'completed')
                .slice(0, 24)
                .map(item => (
                  <div key={item.id} className="t" onClick={() => setDraft(d => ({ ...d, pinnedAnimeId: item.id }))}
                    style={{ flexShrink:0, cursor:'pointer', borderRadius:10,
                      outline: draft.pinnedAnimeId === item.id
                        ? '2.5px solid #0A84FF' : '2.5px solid transparent',
                      outlineOffset:1, transition:'outline .15s' }}>
                    <img src={item.img} alt={item.title}
                      style={{ width:52, height:72, objectFit:'cover', borderRadius:10, display:'block' }}/>
                  </div>
                ))
              }
            </div>
            <p style={{ fontSize:11, color:T.sub, marginTop:6 }}>{t('profile.selectPinned')}</p>
          </div>

          <button onClick={saveEdit} disabled={saving}
            style={{ padding:'10px 28px', borderRadius:22, border:'none', cursor:'pointer',
              background:'#0A84FF', color:'#fff', fontSize:14, fontWeight:600,
              opacity: saving ? .6 : 1, transition:'opacity .2s' }}>
            {saving ? t('profile.saving') : t('profile.save')}
          </button>
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ display:'grid',
        gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:36 }}>
        <StatBox fill label={t('profile.animes')}   val={animeLib.length      || '—'} color="#0A84FF" icon="📺"/>
        <StatBox fill label={t('profile.episodes')} val={animeWatchedEps      || '—'} color="#34C759" icon="▶"/>
        <StatBox fill label={t('profile.time')}     val={fmtTime(animeWatchTimeMin)}   color="#BF5AF2" icon="⏱"/>
        <StatBox fill label={t('profile.avgScore')} val={animeAvgScore}                color="#FF9F0A" icon="★"/>
      </div>

      {/* ── Personality card ── */}
      {personality && (
        <div style={{
          padding: '16px 20px', borderRadius: 16, marginBottom: 24,
          background: `linear-gradient(135deg, ${bannerColor.a}18, ${bannerColor.b}10)`,
          border: `1px solid ${bannerColor.a}25`,
        }}>
          <p style={{ fontSize: 12, color: T.sub, fontWeight: 500, marginBottom: 4 }}>Your taste</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: T.txt }}>{personality.text}</p>
          <p style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>
            Top genres: {tasteProfile.topGenres.slice(0, 3).join(' · ')}
          </p>
        </div>
      )}

      {/* ── Friends ── */}
      <section style={{ marginBottom:36 }}>
        <div style={{ display:'flex', alignItems:'center',
          justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <h2 style={{ fontSize:18, fontWeight:700, color:T.txt, letterSpacing:'-.02em' }}>
              {t('profile.friends')}
            </h2>
            {pendingRequests.length > 0 && (
              <span style={{ fontSize:11, fontWeight:700, color:'#fff',
                background:'#FF3B30', borderRadius:10, padding:'2px 7px' }}>
                {pendingRequests.length}
              </span>
            )}
          </div>
          <button className="t" onClick={() => setShowFriendModal(true)}
            style={{ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer',
              background:'rgba(10,132,255,.12)', color:'#0A84FF', fontSize:12, fontWeight:600 }}>
            + {t('profile.addFriend')}
          </button>
        </div>

        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <div style={{ marginBottom:16, padding:'12px 14px', borderRadius:14,
            background:'rgba(255,59,48,.07)', border:'1px solid rgba(255,59,48,.18)' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#FF3B30',
              letterSpacing:'.05em', marginBottom:10 }}>
              {t('profile.pendingRequests').toUpperCase()} ({pendingRequests.length})
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {pendingRequests.map(req => (
                <div key={req.id} style={{ display:'flex', alignItems:'center',
                  justifyContent:'space-between', gap:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <AvatarPic profile={req.profile} size={34}/>
                    <p style={{ fontSize:13, fontWeight:600, color:T.txt }}>
                      {req.profile?.display_name || req.profile?.username || '?'}
                    </p>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="t" onClick={() => handleAccept(req.id)}
                      style={{ padding:'5px 12px', borderRadius:14, border:'none',
                        cursor:'pointer', background:'rgba(52,199,89,.15)',
                        color:'#34C759', fontSize:12, fontWeight:600 }}>
                      {t('profile.accept')}
                    </button>
                    <button className="t" onClick={() => handleDecline(req.id)}
                      style={{ padding:'5px 12px', borderRadius:14, border:'none',
                        cursor:'pointer', background:'rgba(255,59,48,.1)',
                        color:'#FF3B30', fontSize:12, fontWeight:600 }}>
                      {t('profile.decline')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends grid */}
        {friendsLoading ? (
          <p style={{ fontSize:13, color:T.sub }}>…</p>
        ) : friends.length === 0 ? (
          <p style={{ fontSize:13, color:T.sub, fontStyle:'italic' }}>
            {t('profile.noFriends')}
          </p>
        ) : (
          <div style={{ display:'flex', gap: isMobile ? 8 : 12, flexWrap:'wrap' }}>
            {friends.map(f => (
              <div key={f.id} className="t"
                onClick={() => onViewFriend(f.id, f.friendshipId)}
                style={{ display:'flex', flexDirection:'column', alignItems:'center',
                  gap:6, cursor:'pointer', padding:'10px 14px', borderRadius:14,
                  background:T.surf, border:`1px solid ${T.bord}` }}>
                <AvatarPic profile={f.profile} size={44}/>
                <p style={{ fontSize:11, fontWeight:600, color:T.txt, maxWidth:70,
                  textAlign:'center', overflow:'hidden',
                  textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {f.profile?.display_name || f.profile?.username || '?'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Watching Now ── */}
      <section style={{ marginBottom:36 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:14 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:T.txt, letterSpacing:'-.02em' }}>
            {t('profile.watchingNow')}
          </h2>
          {watchingNow.length > 0 && (
            <span style={{ fontSize:12, fontWeight:600, color:'#34C759',
              background:'rgba(52,199,89,.12)', padding:'2px 8px', borderRadius:10 }}>
              {watchingNow.length}
            </span>
          )}
        </div>
        {watchingNow.length === 0 ? (
          <p style={{ fontSize:13, color:T.sub, fontStyle:'italic' }}>
            {t('profile.nothingWatching')}
          </p>
        ) : (
          <div style={{ display:'flex', gap:12, overflowX:'auto',
            paddingBottom:6, scrollbarWidth:'none' }}>
            {watchingNow.map(item => {
              const progress = item.eps && item.userEp
                ? Math.min(item.userEp / item.eps, 1) : 0
              return (
                <div key={item.id} className="t" onClick={() => onOpen(item)}
                  style={{ flexShrink:0, width:110, cursor:'pointer' }}>
                  <div style={{ borderRadius:14, overflow:'hidden', marginBottom:7,
                    boxShadow:`0 4px 18px rgba(0,0,0,${dark?.22:.10})`,
                    position:'relative' }}>
                    <img src={item.img} alt=""
                      style={{ width:'100%', height:155, objectFit:'cover', display:'block' }}/>
                    <div style={{ position:'absolute', top:7, left:7,
                      width:8, height:8, borderRadius:'50%',
                      background:'#34C759', boxShadow:'0 0 6px #34C759' }}/>
                    {item.eps && (
                      <div style={{ position:'absolute', bottom:0, left:0, right:0,
                        padding:'3px 6px', background:'rgba(0,0,0,.55)' }}>
                        <div style={{ height:3, borderRadius:2,
                          background:'rgba(255,255,255,.25)', overflow:'hidden' }}>
                          <div style={{ height:'100%', borderRadius:2,
                            background:'#34C759', width:`${progress*100}%` }}/>
                        </div>
                        <p style={{ fontSize:9.5, color:'rgba(255,255,255,.7)',
                          marginTop:3, textAlign:'right' }}>
                          {item.userEp||0}/{item.eps}
                        </p>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize:11.5, fontWeight:600, color:T.txt, lineHeight:1.3,
                    overflow:'hidden', textOverflow:'ellipsis',
                    display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                    {item.title}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── By Status ── */}
      <section style={{ marginBottom:36 }}>
        <h2 style={{ fontSize:18, fontWeight:700, color:T.txt,
          letterSpacing:'-.02em', marginBottom:14 }}>{t('profile.byStatus')}</h2>
        <div style={{ display:'grid',
          gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:10 }}>
          {Object.entries(SM).map(([status, { dot }]) => {
            const count = statusCounts[status] || 0
            const pct   = animeLib.length ? Math.round((count / animeLib.length) * 100) : 0
            return (
              <div key={status} className="t" onClick={() => {
                setLibF(status)
                libSectionRef.current?.scrollIntoView({ behavior:'smooth', block:'start' })
              }}
                style={{ padding:'14px 16px', borderRadius:16, cursor:'pointer',
                  background:`${dot}12`, border:`1px solid ${dot}20`,
                  transition:'transform .15s, box-shadow .15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 6px 20px ${dot}25` }}
                onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:dot,
                    boxShadow:`0 0 5px ${dot}`, flexShrink:0 }}/>
                  <p style={{ fontSize:11, fontWeight:600, color:dot,
                    letterSpacing:'.02em' }}>{t(`status.${status}`)}</p>
                </div>
                <p style={{ fontSize:28, fontWeight:700, color:dot,
                  letterSpacing:'-.03em', lineHeight:1, marginBottom:8 }}>{count}</p>
                <div style={{ height:4, borderRadius:2, background:`${dot}20`, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:2, background:dot,
                    width:`${pct}%`, transition:'width .6s ease' }}/>
                </div>
                <p style={{ fontSize:11, color:dot, opacity:.7, marginTop:4 }}>{pct}%</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── My Library ── */}
      <section ref={libSectionRef} style={{ marginBottom:36 }}>
        <h2 style={{ fontSize:18, fontWeight:700, color:T.txt,
          letterSpacing:'-.02em', marginBottom:14 }}>{t('library.title')}</h2>

        {/* Search */}
        <div style={{ marginBottom:12 }}>
          <input
            type="text" placeholder={t('library.searchPlaceholder')}
            value={libSearch} onChange={e => setLibSearch(e.target.value)}
            style={{ width:'100%', padding:'10px 14px', borderRadius:12, fontSize:14,
              background: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)',
              border:`1px solid ${T.bord}`, color:T.txt, outline:'none',
              fontFamily:'inherit', boxSizing:'border-box' }}
          />
        </div>

        {/* Filters + sort */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', gap:6, flexWrap: isMobile ? 'nowrap' : 'wrap',
            overflowX: isMobile ? 'auto' : 'visible', scrollbarWidth:'none', paddingBottom: isMobile ? 4 : 0 }}>
            {[['all', t('library.filterAll')], ...Object.keys(SM).map(s => [s, t(`status.${s}`)])].map(([v, l]) => (
              <button key={v} className="pill t" onClick={() => setLibF(v)}
                style={{ padding:'6px 14px', borderRadius:22, fontSize:13, fontWeight:500, border:'none',
                  background: libF === v ? (dark ? '#3A3A3C' : '#1D1D1F') : T.surf2,
                  color: libF === v ? '#fff' : T.sub }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {[['title', t('library.sortAZ')], ['score', t('library.sortScore')], ['myscore', t('library.sortMyScore')]].map(([v, l]) => (
              <button key={v} className="pill t" onClick={() => setLibSort(v)}
                style={{ padding:'5px 12px', borderRadius:22, fontSize:12, fontWeight:500,
                  border:`1px solid ${T.bord}`,
                  background: libSort === v ? T.surf2 : 'transparent',
                  color: libSort === v ? T.txt : T.sub }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {displayed.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px' }}>
            <p style={{ fontSize:38, marginBottom:12, opacity:.18 }}>⊘</p>
            <p style={{ fontSize:16, fontWeight:700, color:T.txt, marginBottom:6 }}>
              {libSearch.trim() ? t('library.noResults') : t('library.noTitles')}
            </p>
            <p style={{ fontSize:13, color:T.sub }}>
              {libSearch.trim() ? t('library.noResultsFor', { search: libSearch }) : t('library.explorePrompt')}
            </p>
          </div>
        ) : (
          <div style={{ display:'grid',
            gridTemplateColumns:`repeat(auto-fill,minmax(${isMobile ? 140 : 190}px,1fr))`, gap:18 }}>
            {displayed.map((it, i) => (
              <MediaCard key={it.id} item={it} delay={i * 35} onOpen={onOpen} onStatus={onStatus}/>
            ))}
          </div>
        )}
      </section>

      {/* ── Top Rated ── */}
      {topRated.length > 0 && (
        <section style={{ marginBottom:36 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:T.txt,
            letterSpacing:'-.02em', marginBottom:14 }}>{t('profile.topRated')}</h2>
          <div style={{ display:'flex', gap:12, overflowX:'auto',
            paddingBottom:6, scrollbarWidth:'none' }}>
            {topRated.map(item => (
              <div key={item.id} className="t" onClick={() => onOpen(item)}
                style={{ flexShrink:0, width:120, cursor:'pointer' }}>
                <div style={{ borderRadius:14, overflow:'hidden', marginBottom:7,
                  boxShadow:`0 4px 18px rgba(0,0,0,${dark?.22:.10})`,
                  position:'relative' }}>
                  <img src={item.img} alt=""
                    style={{ width:'100%', height:168, objectFit:'cover', display:'block' }}/>
                  <div style={{ position:'absolute', inset:0,
                    background:'linear-gradient(to top,rgba(0,0,0,.45) 0%,transparent 55%)' }}/>
                  {SM[item.userStatus] && (
                    <div style={{ position:'absolute', top:7, left:7,
                      width:8, height:8, borderRadius:'50%',
                      background:SM[item.userStatus].dot,
                      boxShadow:`0 0 5px ${SM[item.userStatus].dot}` }}/>
                  )}
                  <div style={{ position:'absolute', top:7, right:7,
                    padding:'3px 8px', borderRadius:8,
                    background:'rgba(0,0,0,.58)', backdropFilter:'blur(4px)',
                    display:'flex', alignItems:'center', gap:3 }}>
                    <span style={{ color:'#FFD60A', fontSize:10 }}>★</span>
                    <span style={{ fontSize:13, fontWeight:800, color:'#fff' }}>{item.userScore}</span>
                  </div>
                </div>
                <p style={{ fontSize:12, fontWeight:600, color:T.txt, lineHeight:1.3,
                  overflow:'hidden', textOverflow:'ellipsis',
                  display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                  {item.title}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Score Distribution ── */}
      {animeScoredItems.length > 0 && (
        <section style={{ marginBottom:36 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:T.txt,
            letterSpacing:'-.02em', marginBottom:14 }}>{t('profile.scoreDistribution')}</h2>
          <div style={{ padding:'20px 20px 14px', borderRadius:18,
            background:T.surf, border:`1px solid ${T.bord}` }}>
            <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:140 }}>
              {scoreDistrib.map(({ score, count }) => (
                <div key={score} style={{ flex:1, display:'flex', flexDirection:'column',
                  alignItems:'center', gap:4 }}>
                  <p style={{ fontSize:10, fontWeight:700, color:'#FF9F0A',
                    opacity:count>0?1:0, lineHeight:1, minHeight:12 }}>
                    {count||''}
                  </p>
                  <div style={{ width:'100%', borderRadius:'4px 4px 0 0',
                    background: count>0
                      ? `linear-gradient(to top, #FF6B35, #FF9F0A)`
                      : T.surf2,
                    opacity: count>0 ? (.4+(count/maxScoreCount)*.6) : 1,
                    height:`${Math.max((count/maxScoreCount)*100, count>0?8:4)}px`,
                    transition:'height .4s ease',
                    boxShadow: count>0 ? `0 4px 12px rgba(255,159,10,.25)` : 'none' }}/>
                  <p style={{ fontSize:10, color:T.sub, lineHeight:1 }}>{score}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Favorite Genres ── */}
      {tasteProfile && tasteProfile.topGenres.length > 0 && (
        <section style={{ marginBottom:36 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:T.txt,
            letterSpacing:'-.02em', marginBottom:14 }}>{t('profile.favoriteGenres')}</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {tasteProfile.topGenres.slice(0, 6).map(g => {
              const pct  = Math.round(tasteProfile.weights[g] * 100)
              const mins = tasteProfile.genreMinutes[g] || 0
              const avg  = tasteProfile.avgScoreByGenre[g]
              return (
                <div key={g}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:T.txt }}>{g}</span>
                    <div style={{ display:'flex', gap:10, fontSize:11, color:T.sub }}>
                      {avg && <span>★ {avg}</span>}
                      <span>{fmtTime(mins)}</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height:6, borderRadius:3, background:T.surf2 }}>
                    <div style={{ height:'100%', borderRadius:3, width:`${pct}%`,
                      background:`linear-gradient(90deg, ${bannerColor.a}, ${bannerColor.b})`,
                      transition:'width .4s ease' }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Favorite Studios ── */}
      {tasteProfile && tasteProfile.topStudios.length > 0 && (
        <section style={{ marginBottom:36 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:T.txt,
            letterSpacing:'-.02em', marginBottom:14 }}>{t('profile.favoriteStudios')}</h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {tasteProfile.topStudios.map((s, i) => (
              <span key={s} style={{
                padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:600,
                background: i === 0 ? `${bannerColor.a}20` : T.surf2,
                color: i === 0 ? bannerColor.a : T.sub,
                border: `1px solid ${i === 0 ? bannerColor.a + '30' : T.bord}`,
              }}>{s}</span>
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state ── */}
      {animeLib.length === 0 && (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <p style={{ fontSize:38, marginBottom:12 }}>📺</p>
          <p style={{ fontSize:15, fontWeight:600, color:T.txt, marginBottom:6 }}>
            {t('profile.noAnime')}
          </p>
          <p style={{ fontSize:13, color:T.sub, lineHeight:1.55 }}>
            {t('profile.explorePrompt')}
          </p>
        </div>
      )}

      {/* ── Admin Panel ── */}
      {isAdmin(user) && (
        <section style={{ marginBottom:36 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <span style={{ fontSize:16 }}>⚙</span>
            <h2 style={{ fontSize:18, fontWeight:700, color:T.txt, letterSpacing:'-.02em' }}>
              {t('admin.title')}
            </h2>
          </div>

          <div style={{ padding:'16px 18px', borderRadius:16,
            background: dark ? 'rgba(255,159,10,.07)' : 'rgba(255,159,10,.06)',
            border:'1px solid rgba(255,159,10,.2)' }}>

            <input
              type="text"
              placeholder={t('admin.searchUsers')}
              value={adminQuery}
              onChange={e => handleAdminSearch(e.target.value)}
              style={{ width:'100%', padding:'9px 13px', borderRadius:12, fontSize:13,
                background: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)',
                border:`1px solid ${T.bord}`, color:T.txt, outline:'none',
                fontFamily:'inherit', boxSizing:'border-box', marginBottom:10 }}
            />

            {adminLoading && (
              <p style={{ fontSize:12, color:T.sub, textAlign:'center', padding:'6px 0' }}>…</p>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {adminResults.map(profile => (
                <div key={profile.id}
                  style={{ display:'flex', alignItems:'center',
                    justifyContent:'space-between', padding:'8px 0',
                    borderBottom:`1px solid ${T.bord}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                    <AvatarPic profile={profile} size={34}/>
                    <div>
                      <p style={{ fontSize:13, fontWeight:600, color:T.txt }}>
                        {profile.display_name || profile.username}
                      </p>
                      <p style={{ fontSize:11, color:T.sub }}>@{profile.username}</p>
                    </div>
                  </div>
                  <button className="t"
                    disabled={adminUpdating === profile.id}
                    onClick={() => handleTogglePremium(profile)}
                    style={{ padding:'5px 13px', borderRadius:14, border:'none', cursor:'pointer',
                      fontSize:12, fontWeight:600,
                      opacity: adminUpdating === profile.id ? .5 : 1,
                      background: profile.is_premium
                        ? 'rgba(255,59,48,.12)' : 'rgba(255,159,10,.15)',
                      color: profile.is_premium ? '#FF3B30' : '#FF9F0A' }}>
                    {profile.is_premium ? t('admin.revokePremium') : t('admin.grantPremium')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Add Friend Modal ── */}
      {showFriendModal && (
        <div style={{ position:'fixed', inset:0, zIndex:200,
          background:'rgba(0,0,0,.6)', backdropFilter:'blur(8px)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => { if (e.target === e.currentTarget) closeFriendModal() }}>
          <div style={{ width:'100%', maxWidth:400, borderRadius:20,
            background:T.surf, border:`1px solid ${T.bord}`,
            padding:24, boxShadow:'0 20px 60px rgba(0,0,0,.4)', maxHeight:'80vh',
            display:'flex', flexDirection:'column' }}>

            <div style={{ display:'flex', alignItems:'center',
              justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ fontSize:18, fontWeight:700, color:T.txt }}>
                {t('profile.addFriend')}
              </h3>
              <button onClick={closeFriendModal}
                style={{ background:'none', border:'none', cursor:'pointer',
                  fontSize:20, color:T.sub, lineHeight:1 }}>×</button>
            </div>

            <input
              type="text"
              placeholder={t('profile.searchFriend')}
              value={friendSearch}
              onChange={e => handleFriendSearch(e.target.value)}
              autoFocus
              style={{ width:'100%', padding:'10px 14px', borderRadius:12, fontSize:14,
                background: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)',
                border:`1px solid ${T.bord}`, color:T.txt, outline:'none',
                fontFamily:'inherit', boxSizing:'border-box', marginBottom:12 }}
            />

            <div style={{ overflowY:'auto', flex:1 }}>
              {friendSearchLoading && (
                <p style={{ textAlign:'center', color:T.sub, fontSize:13, padding:'10px 0' }}>…</p>
              )}
              {!friendSearchLoading && friendSearch.length >= 2 && friendResults.length === 0 && (
                <p style={{ textAlign:'center', color:T.sub, fontSize:13, padding:'10px 0' }}>
                  No users found
                </p>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                {friendResults.map(profile => {
                  const alreadyFriend = friends.some(f => f.id === profile.id)
                  const sent = sentRequests.has(profile.id)
                  return (
                    <div key={profile.id}
                      style={{ display:'flex', alignItems:'center',
                        justifyContent:'space-between', padding:'10px 0',
                        borderBottom:`1px solid ${T.bord}` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <AvatarPic profile={profile} size={38}/>
                        <div>
                          <p style={{ fontSize:14, fontWeight:600, color:T.txt }}>
                            {profile.display_name || profile.username}
                          </p>
                          <p style={{ fontSize:11, color:T.sub }}>@{profile.username}</p>
                        </div>
                      </div>
                      {alreadyFriend ? (
                        <span style={{ fontSize:12, color:T.sub }}>✓</span>
                      ) : sent ? (
                        <span style={{ fontSize:12, color:T.sub }}>{t('profile.requestSent')}</span>
                      ) : (
                        <button className="t" onClick={() => handleSendRequest(profile.id)}
                          style={{ padding:'5px 14px', borderRadius:14, border:'none',
                            cursor:'pointer', background:'rgba(10,132,255,.12)',
                            color:'#0A84FF', fontSize:12, fontWeight:600 }}>
                          {t('profile.sendRequest')}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
