import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { useAuth } from '../context/AuthContext'
import { SM, AVATAR_GRADS, BANNER_THEMES } from '../constants'
import { fetchAnilistBannerOnly, searchAnilistCharacters } from '../services/anilist'
import { useTmdbImage } from '../hooks/useTmdbImage'
import { useTmdbPosterBatch } from '../hooks/useTmdbPosterBatch'
import { AvatarPic } from '../components/AvatarPic'
import { MediaCard } from '../components/MediaCard'
import { ProfileStatsGrid } from '../components/profile/ProfileStatsGrid'
import {
  EmptyLibraryState,
  FavoriteGenresSection,
  FavoriteStudiosSection,
  ProfileTasteCard,
} from '../components/profile/ProfileTasteSections'
import { supabase } from '../services/supabase'
import {
  upsertProfile,
  checkDisplayNameAvailable,
} from '../services/friends'
import { useProfileStats } from '../hooks/profile/useProfileStats'
import { useProfileFriends } from '../hooks/profile/useProfileFriends'
import { getProgressiveLimit } from '../utils/progressiveList'


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

export function ProfilePage({ library, onOpen, onStatus, onLogin, onViewFriend = () => {}, onProfileSaved = () => {} }) {
  const { T, dark } = useTheme()
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const isMobile = useIsMobile()
  const isEN = i18n.language === 'en' || i18n.language.startsWith('en')

  const [committed, setCommitted] = useState(() => initMeta(user))
  const [editOpen,  setEditOpen]  = useState(false)
  const [draft,     setDraft]     = useState(committed)
  const [saving,    setSaving]    = useState(false)
  const [charQuery,     setCharQuery]     = useState('')
  const [charResults,   setCharResults]   = useState([])
  const [charLoading,   setCharLoading]   = useState(false)
  const charTimer = useRef(null)
  const [pinnedBanner,  setPinnedBanner]  = useState(null)
  const [bannerLoading, setBannerLoading] = useState(null)
  const [tmdbPosters,   setTmdbPosters]   = useState({})
  const [avatarBroken,  setAvatarBroken]  = useState(false)
  const [nameAvailable, setNameAvailable] = useState(null)
  const [nameChecking,  setNameChecking]  = useState(false)
  const nameCheckTimer = useRef(null)
  const identitySectionRef = useRef(null)
  const bannerSectionRef = useRef(null)
  const featuredSectionRef = useRef(null)

  const [libF,      setLibF]      = useState('all')
  const [libSort,   setLibSort]   = useState('title')
  const [libSearch, setLibSearch] = useState('')
  const [libraryLimit, setLibraryLimit] = useState(36)
  const libSectionRef = useRef(null)

  const {
    friends,
    friendsLoading,
    friendsError,
    pendingRequests,
    showFriendModal,
    friendSearch,
    friendResults,
    friendSearchLoading,
    sentRequests,
    removingId,
    setShowFriendModal,
    handleFriendSearch,
    handleSendRequest,
    handleAccept,
    handleDecline,
    handleRemoveFriend,
    refreshFriends,
    closeFriendModal,
  } = useProfileFriends(user)

  const [friendMenuId, setFriendMenuId] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    const meta = initMeta(user)
    setCommitted(meta)
    // Garante que a linha profiles existe — sem isso amigos vêem só iniciais
    upsertProfile(user, meta).catch(() => {})
  }, [user?.id])

  useEffect(() => {
    setAvatarBroken(false)
  }, [editOpen ? draft.avatarUrl : committed.avatarUrl])

  useEffect(() => {
    if (!editOpen) { setNameAvailable(null); return }
    const trimmed = draft.displayName?.trim() ?? ''
    const original = committed.displayName?.trim() ?? ''
    if (!trimmed || trimmed === original) { setNameAvailable(null); return }
    setNameChecking(true)
    clearTimeout(nameCheckTimer.current)
    nameCheckTimer.current = setTimeout(async () => {
      const available = await checkDisplayNameAvailable(trimmed, user?.id).catch(() => null)
      setNameAvailable(available)
      setNameChecking(false)
    }, 500)
    return () => clearTimeout(nameCheckTimer.current)
  }, [draft.displayName, editOpen])

  useEffect(() => {
    if (!editOpen) return
    setCharQuery('')
    setCharLoading(true)
    searchAnilistCharacters(null)
      .then(setCharResults)
      .catch(() => setCharResults([]))
      .finally(() => setCharLoading(false))
  }, [editOpen])

  useEffect(() => {
    clearTimeout(charTimer.current)
    if (!editOpen) return
    const q = charQuery.trim()
    if (q.length === 1) return
    charTimer.current = setTimeout(() => {
      setCharLoading(true)
      searchAnilistCharacters(q || null)
        .then(setCharResults)
        .catch(() => setCharResults([]))
        .finally(() => setCharLoading(false))
    }, 500)
    return () => clearTimeout(charTimer.current)
  }, [charQuery, editOpen])

  async function pickAnimeBanner(item) {
    setBannerLoading(item.id)
    try {
      const url = await fetchAnilistBannerOnly(item.id)
      if (url) setDraft(d => ({ ...d, bannerUrl: url, bannerTheme: null, bannerAnimeId: item.id }))
    } catch {}
    setBannerLoading(null)
  }

  const active = editOpen ? draft : committed

  const openEdit   = () => { setDraft({ ...committed }); setNameAvailable(null); setEditOpen(true) }
  const cancelEdit = () => { setNameAvailable(null); setEditOpen(false) }
  const saveEdit   = async () => {
    if (nameAvailable === false) return
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
  const hasUnsavedChanges = editOpen && JSON.stringify(draft) !== JSON.stringify(committed)

  const {
    animeLib,
    animeWatchedEps,
    animeWatchTimeMin,
    animeScoredItems,
    animeAvgScore,
    statusCounts,
    watchingNow,
    displayed,
    topRated,
    scoreDistrib,
    maxScoreCount,
    tasteProfile,
    personality,
    autoBannerAnime,
    autoBannerColor,
    pinnedAnime,
  } = useProfileStats({ library, active, libF, libSort, libSearch })

  useEffect(() => {
    if (!pinnedAnime?.id) { setPinnedBanner(null); return }
    fetchAnilistBannerOnly(pinnedAnime.id)
      .then(url => setPinnedBanner(url || null))
      .catch(() => setPinnedBanner(null))
  }, [pinnedAnime?.id])

  const hasCustomBanner = active.bannerTheme !== null && active.bannerTheme !== undefined
  const bannerColor     = hasCustomBanner ? BANNER_THEMES[active.bannerTheme] : autoBannerColor

  const bannerBlurImg = pinnedBanner ? null : (pinnedAnime?.img ?? (hasCustomBanner ? null : autoBannerAnime?.img))
  const draftPinnedAnime = animeLib.find(i => i.id === draft.pinnedAnimeId)
  const editBannerPreview = draft.bannerUrl || pinnedBanner || bannerBlurImg
  const editActionDisabled = saving || nameAvailable === false || nameChecking || !hasUnsavedChanges
  const visibleLibrary = displayed.slice(0, libraryLimit)

  // Top library titles shown in the banner picker (sorted by user score).
  const bannerPickerAnime = useMemo(
    () => [...animeLib].sort((a, b) => (b.userScore ?? 0) - (a.userScore ?? 0)).slice(0, 20),
    [animeLib]
  )

  // Resolve TMDB posters only for the items getPosterUrl actually renders: the
  // pinned/banner titles and the banner picker. The main library grid is NOT
  // included — each MediaCard resolves its own poster via useTmdbImage, so
  // feeding the whole library here would just duplicate that work.
  const tmdbPosterBatch = useTmdbPosterBatch(
    [pinnedAnime, autoBannerAnime, draftPinnedAnime, ...bannerPickerAnime].filter(Boolean)
  )

  // Helper to get TMDB poster with fallback
  const getPosterUrl = (item) => tmdbPosterBatch[item?.id] ?? item?.img ?? null

  useEffect(() => {
    setLibraryLimit(isMobile ? 24 : 36)
  }, [libF, libSort, libSearch, isMobile])

  const sectionCardStyle = {
    borderRadius: 18,
    padding: isMobile ? 16 : 18,
    background: dark ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.02)',
    border: `1px solid ${T.bord}`,
  }

  const sectionLabelStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: T.sub,
    letterSpacing: '.04em',
    textTransform: 'uppercase',
  }

  const sectionHelpStyle = {
    fontSize: 12.5,
    color: T.sub,
    lineHeight: 1.55,
  }

  const scrollToEditSection = ref => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      <style>{`
        @keyframes avatarSpin { to { transform: rotate(360deg) } }
        @keyframes profSkelPulse { 0%,100% { opacity:.55 } 50% { opacity:1 } }
        .profSkel {
          background: ${dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)'};
          animation: profSkelPulse 1.3s ease-in-out infinite;
        }
      `}</style>

      {/* ── Banner + avatar ── */}
      <div style={{ position:'relative', marginTop:28, marginBottom:0 }}>

        <div style={{ borderRadius:24, overflow:'hidden', height:280, position:'relative',
          background:`linear-gradient(135deg,${bannerColor.a},${bannerColor.b})`,
          boxShadow:`0 12px 48px ${bannerColor.a}44` }}>

          {active.bannerUrl ? (
            <img src={active.bannerUrl} alt="" style={{ position:'absolute', inset:0,
              width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 25%' }}/>
          ) : pinnedBanner ? (
            <img src={pinnedBanner} alt="" style={{ position:'absolute', inset:0,
              width:'100%', height:'100%', objectFit:'cover', objectPosition:'center' }}/>
          ) : bannerBlurImg ? (
            <img src={bannerBlurImg} alt="" style={{ position:'absolute', inset:0,
              width:'100%', height:'100%', objectFit:'cover',
              filter:'blur(28px)', transform:'scale(1.15)',
              opacity: dark ? .35 : .22 }}/>
          ) : null}

          <div style={{ position:'absolute', inset:0,
            background: (active.bannerUrl || pinnedBanner)
              ? 'linear-gradient(to bottom, rgba(0,0,0,.08) 0%, rgba(0,0,0,.42) 100%)'
              : `linear-gradient(135deg,${bannerColor.a}99,${bannerColor.b}88)` }}/>
          {!active.bannerUrl && !pinnedBanner && (
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
          <img src={getPosterUrl(pinnedAnime)} alt="" style={{ position:'absolute', inset:0,
            width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top', opacity:.28 }}/>
          <div style={{ position:'absolute', inset:0,
            background:'linear-gradient(90deg, rgba(0,0,0,.62) 55%, transparent)' }}/>
          <div style={{ position:'relative', display:'flex', alignItems:'center',
            gap:12, padding:'12px 16px', height:'100%', boxSizing:'border-box' }}>
            <img src={getPosterUrl(pinnedAnime)} alt="" style={{ width:46, height:62, objectFit:'cover',
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

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start',
            gap:16, flexWrap:'wrap', marginBottom:18 }}>
            <div>
              <h2 style={{ fontSize:22, fontWeight:800, color:T.txt, letterSpacing:'-.03em', marginBottom:6 }}>
                Customize your profile
              </h2>
              <p style={{ fontSize:13.5, color:T.sub, lineHeight:1.55, maxWidth:560 }}>
                Refine identity, banner and featured anime in one place. Changes only apply after saving.
              </p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <button className="t pill" onClick={() => scrollToEditSection(identitySectionRef)}
                style={{ padding:'7px 12px', borderRadius:999, border:`1px solid ${T.bord}`,
                  background:'transparent', color:T.sub, fontSize:12.5, fontWeight:600 }}>
                Identity
              </button>
              <button className="t pill" onClick={() => scrollToEditSection(bannerSectionRef)}
                style={{ padding:'7px 12px', borderRadius:999, border:`1px solid ${T.bord}`,
                  background:'transparent', color:T.sub, fontSize:12.5, fontWeight:600 }}>
                Banner
              </button>
              <button className="t pill" onClick={() => scrollToEditSection(featuredSectionRef)}
                style={{ padding:'7px 12px', borderRadius:999, border:`1px solid ${T.bord}`,
                  background:'transparent', color:T.sub, fontSize:12.5, fontWeight:600 }}>
                Featured
              </button>
            </div>
          </div>

          <div style={{ ...sectionCardStyle, marginBottom:18, overflow:'hidden' }}>
            <div style={{ position:'relative', borderRadius:16, overflow:'hidden', minHeight:170,
              background:`linear-gradient(135deg,${bannerColor.a},${bannerColor.b})`, marginBottom:16 }}>
              {editBannerPreview && (
                <img src={editBannerPreview} alt="" style={{ position:'absolute', inset:0,
                  width:'100%', height:'100%', objectFit:'cover',
                  opacity: draft.bannerUrl || pinnedBanner ? 1 : .28,
                  filter: draft.bannerUrl || pinnedBanner ? 'none' : 'blur(18px)',
                  transform: draft.bannerUrl || pinnedBanner ? 'none' : 'scale(1.08)' }}/>
              )}
              <div style={{ position:'absolute', inset:0,
                background:'linear-gradient(180deg, rgba(0,0,0,.1) 0%, rgba(0,0,0,.56) 100%)' }}/>
              <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'flex-end',
                gap:14, padding:18, minHeight:170 }}>
                <div style={{ width:76, height:76, borderRadius:'50%',
                  background: `linear-gradient(135deg,${avatarGrad[0]},${avatarGrad[1]})`,
                  border:'3px solid rgba(255,255,255,.88)', overflow:(draft.avatarUrl && !avatarBroken) ? 'hidden' : 'visible',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:22, fontWeight:800, color:'#fff', flexShrink:0 }}>
                  {(draft.avatarUrl && !avatarBroken)
                    ? <img src={draft.avatarUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}
                        onError={() => setAvatarBroken(true)}
                      />
                    : initials}
                </div>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.72)',
                    letterSpacing:'.08em', textTransform:'uppercase', marginBottom:6 }}>
                    Live Preview
                  </p>
                  <p style={{ fontSize:24, fontWeight:800, color:'#fff', lineHeight:1.05,
                    marginBottom:6, letterSpacing:'-.03em' }}>
                    {draft.displayName?.trim() || username}
                  </p>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,.78)', lineHeight:1.5 }}>
                    {draftPinnedAnime ? `Featured: ${draftPinnedAnime.title}` : 'No featured anime selected yet'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
              gap:12, flexWrap:'wrap' }}>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:T.txt, marginBottom:4 }}>
                  {hasUnsavedChanges ? 'Unsaved changes' : 'Everything is saved'}
                </p>
                <p style={sectionHelpStyle}>
                  {hasUnsavedChanges
                    ? 'Review the preview above and save when you are ready.'
                    : 'Make a change to update your identity, banner or featured anime.'}
                </p>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button className="t" onClick={cancelEdit}
                  style={{ padding:'10px 16px', borderRadius:12, border:`1px solid ${T.bord}`,
                    background:'transparent', color:T.sub, fontSize:13, fontWeight:700 }}>
                  {t('profile.cancel')}
                </button>
                <button onClick={saveEdit} disabled={editActionDisabled}
                  style={{ padding:'10px 18px', borderRadius:12, border:'none',
                    cursor: editActionDisabled ? 'not-allowed' : 'pointer',
                    background: nameAvailable === false ? '#FF3B30' : '#0A84FF',
                    color:'#fff', fontSize:13, fontWeight:800,
                    opacity: editActionDisabled ? .55 : 1 }}>
                  {saving ? t('profile.saving') : t('profile.save')}
                </button>
              </div>
            </div>
          </div>

          {/* Display name */}
          <div ref={identitySectionRef} style={{ ...sectionCardStyle, marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
              gap:12, flexWrap:'wrap', marginBottom:12 }}>
              <div>
                <p style={sectionLabelStyle}>{t('profile.displayName')}</p>
                <p style={{ ...sectionHelpStyle, marginTop:6 }}>
                  This is the public name shown to friends and across your profile.
                </p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, minHeight:18 }}>
                {nameChecking && (
                  <span style={{ fontSize:11, color:T.sub }}>verificando…</span>
                )}
                {!nameChecking && nameAvailable === true && (
                  <span style={{ fontSize:11, fontWeight:700, color:'#30D158' }}>✓ disponível</span>
                )}
                {!nameChecking && nameAvailable === false && (
                  <span style={{ fontSize:11, fontWeight:700, color:'#FF3B30' }}>✗ já em uso</span>
                )}
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:11, color:T.sub }}>Max 30 characters</span>
              <span style={{ fontSize:11, color:T.sub }}>{draft.displayName.length}/30</span>
            </div>
            <input
              type="text" placeholder={username}
              value={draft.displayName}
              maxLength={30}
              onChange={e => setDraft(d => ({ ...d, displayName: e.target.value }))}
              style={{ width:'100%', padding:'10px 14px', borderRadius:12, fontSize:14,
                background: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)',
                border:`1px solid ${nameAvailable === false ? '#FF3B30' : T.bord}`,
                color:T.txt, outline:'none',
                fontFamily:'inherit', boxSizing:'border-box' }}
            />
          </div>

          {/* Profile picture */}
          <div style={{ ...sectionCardStyle, marginBottom:18 }}>
            <div style={{ marginBottom:12 }}>
              <p style={sectionLabelStyle}>{t('profile.profilePicture')}</p>
              <p style={{ ...sectionHelpStyle, marginTop:6 }}>
                Choose a color avatar, search a character or paste a direct image URL.
              </p>
            </div>

            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 240px) minmax(0, 1fr)', gap:16 }}>
              <div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                  {AVATAR_GRADS.map(([a, b], i) => (
                    <button key={i} onClick={() => setDraft(d => ({ ...d, avatarGrad:i, avatarUrl:'' }))}
                      style={{ width:42, height:42, borderRadius:'50%', border:'none', cursor:'pointer',
                        background:`linear-gradient(135deg,${a},${b})`,
                        outline: draft.avatarGrad === i && !draft.avatarUrl
                          ? `3px solid ${T.txt}` : `3px solid transparent`,
                        outlineOffset:2, transition:'outline .15s' }}/>
                  ))}
                </div>

                <p style={{ fontSize: 11, fontWeight: 700, color: T.sub, marginBottom: 6, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                  Character Search
                </p>
                <input
                  type="text" placeholder="Buscar personagem…"
                  value={charQuery}
                  onChange={e => setCharQuery(e.target.value)}
                  style={{ width:'100%', padding:'10px 12px', borderRadius:10, fontSize:13,
                    background: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)',
                    border:`1px solid ${T.bord}`, color:T.txt, outline:'none',
                    fontFamily:'inherit', boxSizing:'border-box', marginBottom:10 }}
                />
                <input
                  type="url" placeholder={t('profile.pasteImageUrl')}
                  value={draft.avatarUrl}
                  onChange={e => setDraft(d => ({ ...d, avatarUrl: e.target.value }))}
                  style={{ width:'100%', padding:'10px 14px', borderRadius:12, fontSize:13,
                    background: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)',
                    border:`1px solid ${T.bord}`, color:T.txt, outline:'none',
                    fontFamily:'inherit', boxSizing:'border-box' }}
                />
              </div>

              <div>
                <div style={{
                  display: 'grid', gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(6, 1fr)', gap: 8,
                  minHeight: 100,
                }}>
                  {charLoading
                    ? Array.from({ length: isMobile ? 8 : 12 }).map((_, i) => (
                        <div key={i} style={{
                          aspectRatio:'1', borderRadius:10,
                          background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          <div style={{ width:14, height:14, borderRadius:'50%', border:`2px solid ${dark?'rgba(255,255,255,.2)':'rgba(0,0,0,.15)'}`, borderTopColor:'#0A84FF', animation:'spin .7s linear infinite' }}/>
                        </div>
                      ))
                    : charResults.map(node => {
                        const selected = draft.avatarUrl === node.image.large
                        return (
                          <button key={node.id} className="t" title={node.name.full}
                            onClick={() => setDraft(d => ({ ...d, avatarUrl: node.image.large }))}
                            style={{
                              padding: 0, border: selected ? '2.5px solid #0A84FF' : '2.5px solid transparent',
                              borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                              aspectRatio: '1', background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)',
                            }}>
                            <img src={node.image.large} alt={node.name.full}
                              style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                          </button>
                        )
                      })
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Banner */}
          <div ref={bannerSectionRef} style={{ ...sectionCardStyle, marginBottom:18 }}>
            <div style={{ marginBottom:12 }}>
              <p style={sectionLabelStyle}>{t('profile.banner')}</p>
              <p style={{ ...sectionHelpStyle, marginTop:6 }}>
                Pick an automatic banner, a gradient preset or reuse artwork from your library.
              </p>
            </div>

            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
              <button onClick={() => setDraft(d => ({ ...d, bannerTheme: null, bannerUrl: null, bannerAnimeId: null }))}
                style={{ height:38, padding:'0 14px', borderRadius:12, border:'none',
                  cursor:'pointer', fontSize:12, fontWeight:700,
                  background: draft.bannerTheme === null && !draft.bannerUrl
                    ? (dark ? '#3A3A3C' : '#1D1D1F') : T.surf2,
                  color: draft.bannerTheme === null && !draft.bannerUrl ? '#fff' : T.sub,
                  transition:'all .15s' }}>
                {t('profile.auto')}
              </button>
              {BANNER_THEMES.map(({ a, b }, i) => (
                <button key={i} onClick={() => setDraft(d => ({ ...d, bannerTheme: i, bannerUrl: null, bannerAnimeId: null }))}
                  style={{ width:38, height:38, borderRadius:12, border:'none', cursor:'pointer',
                    background:`linear-gradient(135deg,${a},${b})`,
                    outline: draft.bannerTheme === i && !draft.bannerUrl
                      ? `3px solid ${T.txt}` : `3px solid transparent`,
                    outlineOffset:2, transition:'outline .15s' }}/>
              ))}
            </div>
            {animeLib.length > 0 && (
              <>
                <p style={{ fontSize:11, fontWeight:700, color:T.sub, marginBottom:8, letterSpacing:'.04em', textTransform:'uppercase' }}>
                  Banner de um anime
                </p>
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, minmax(0, 1fr))', gap:10 }}>
                  {bannerPickerAnime.map(item => {
                    const loading  = bannerLoading === item.id
                    const selected = draft.bannerUrl && bannerLoading !== item.id &&
                      draft.bannerAnimeId === item.id
                    return (
                      <button key={item.id} className="t" title={item.title}
                        onClick={() => pickAnimeBanner(item)}
                        style={{
                          padding:0, borderRadius:12, overflow:'hidden', cursor:'pointer',
                          width:'100%', aspectRatio:'0.72', position:'relative',
                          border: selected ? '2.5px solid #0A84FF' : '2.5px solid transparent',
                          background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)',
                        }}>
                        <img src={getPosterUrl(item)} alt={item.title}
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
          <div ref={featuredSectionRef} style={{ ...sectionCardStyle, marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <div>
                <p style={sectionLabelStyle}>{t('profile.pinnedAnime')}</p>
                <p style={{ ...sectionHelpStyle, marginTop:6 }}>
                  Select one title to visually represent your taste on the profile header.
                </p>
              </div>
              {draft.pinnedAnimeId && (
                <button onClick={() => setDraft(d => ({ ...d, pinnedAnimeId: null }))}
                  style={{ fontSize:12, color:'#FF3B30', background:'none', border:'none',
                    cursor:'pointer', fontFamily:'inherit' }}>
                  {t('profile.removePinned')}
                </button>
              )}
            </div>
            {draftPinnedAnime && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
                  borderRadius:12, background:'rgba(10,132,255,.1)',
                  border:'1px solid rgba(10,132,255,.2)', marginBottom:10 }}>
                  <img src={getPosterUrl(draftPinnedAnime)} alt="" style={{ width:32, height:44, objectFit:'cover', borderRadius:6 }}/>
                  <p style={{ fontSize:13, fontWeight:600, color:'#0A84FF',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{draftPinnedAnime.title}</p>
                </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(6, minmax(0, 1fr))', gap:10 }}>
              {animeLib
                .filter(i => i.userStatus === 'watching' || i.userStatus === 'completed')
                .slice(0, 24)
                .map(item => (
                  <button key={item.id} type="button" className="t" onClick={() => setDraft(d => ({ ...d, pinnedAnimeId: item.id }))}
                    style={{ cursor:'pointer', borderRadius:12, padding:0, background:'transparent', border:'none',
                      outline: draft.pinnedAnimeId === item.id
                        ? '2.5px solid #0A84FF' : '2.5px solid transparent',
                      outlineOffset:1, transition:'outline .15s' }}>
                    <img src={item.img} alt={item.title}
                      style={{ width:'100%', aspectRatio:'0.72', objectFit:'cover', borderRadius:12, display:'block' }}/>
                  </button>
                ))
              }
            </div>
            <p style={{ fontSize:11, color:T.sub, marginTop:6 }}>{t('profile.selectPinned')}</p>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            gap:12, flexWrap:'wrap', paddingTop:4 }}>
            <p style={{ fontSize:12.5, color:T.sub }}>
              {hasUnsavedChanges ? 'Profile changes are ready to save.' : 'No pending changes.'}
            </p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className="t" onClick={cancelEdit}
                style={{ padding:'10px 16px', borderRadius:12, border:`1px solid ${T.bord}`,
                  background:'transparent', color:T.sub, fontSize:13, fontWeight:700 }}>
                {t('profile.cancel')}
              </button>
              <button onClick={saveEdit} disabled={editActionDisabled}
                style={{ padding:'10px 28px', borderRadius:22, border:'none',
              cursor: editActionDisabled ? 'not-allowed' : 'pointer',
              background: nameAvailable === false ? '#FF3B30' : '#0A84FF',
              color:'#fff', fontSize:14, fontWeight:600,
              opacity: editActionDisabled ? .6 : 1, transition:'opacity .2s,background .2s' }}>
                {saving ? t('profile.saving') : nameAvailable === false ? 'Nome indisponível' : t('profile.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <ProfileStatsGrid
        t={t}
        animeCount={animeLib.length}
        watchedEpisodes={animeWatchedEps}
        watchTimeMinutes={animeWatchTimeMin}
        averageScore={animeAvgScore}
      />

      {/* ── Personality card ── */}
      <ProfileTasteCard T={T} bannerColor={bannerColor} personality={personality} tasteProfile={tasteProfile} />

      {/* ── Friends ── */}
      <section style={{ marginBottom:36 }} onClick={() => setFriendMenuId(null)}>
        <div style={{ display:'flex', alignItems:'center',
          justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <h2 style={{ fontSize:18, fontWeight:700, color:T.txt, letterSpacing:'-.02em' }}>
              {t('profile.friends')}
            </h2>
            {!friendsLoading && !friendsError && friends.length > 0 && (
              <span style={{ fontSize:12, fontWeight:700, color:T.sub,
                background:T.surf2, borderRadius:10, padding:'2px 9px', lineHeight:1.6 }}>
                {friends.length}
              </span>
            )}
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
          <div style={{ display:'flex', gap: isMobile ? 8 : 12, flexWrap:'wrap' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center',
                gap:8, padding:'12px 16px', borderRadius:16,
                background:T.surf, border:`1px solid ${T.bord}` }}>
                <div className="profSkel" style={{ width:48, height:48, borderRadius:'50%' }}/>
                <div className="profSkel" style={{ width:52, height:9, borderRadius:5 }}/>
              </div>
            ))}
          </div>
        ) : friendsError ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            gap:12, padding:'14px 16px', borderRadius:14, flexWrap:'wrap',
            background:'rgba(255,59,48,.07)', border:'1px solid rgba(255,59,48,.18)' }}>
            <p style={{ fontSize:13, color:T.txt }}>{t('profile.friendsLoadError')}</p>
            <button className="t" onClick={refreshFriends}
              style={{ padding:'6px 14px', borderRadius:14, border:'none', cursor:'pointer',
                background:'rgba(10,132,255,.12)', color:'#0A84FF', fontSize:12, fontWeight:700 }}>
              {t('profile.retry')}
            </button>
          </div>
        ) : friends.length === 0 ? (
          <div className="t" onClick={() => setShowFriendModal(true)}
            style={{ display:'flex', alignItems:'center', gap:14, cursor:'pointer',
              padding:'18px 20px', borderRadius:16,
              background:T.surf, border:`1px dashed ${T.bord}` }}>
            <div style={{ width:44, height:44, borderRadius:'50%', flexShrink:0,
              background:'rgba(10,132,255,.12)', display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:22 }}>👥</div>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:14, fontWeight:700, color:T.txt, marginBottom:2 }}>
                {t('profile.noFriends')}
              </p>
              <p style={{ fontSize:12.5, color:'#0A84FF', fontWeight:600 }}>
                + {t('profile.addFriend')}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', gap: isMobile ? 8 : 12, flexWrap:'wrap' }}>
            {friends.map(f => {
              const fname = f.profile?.display_name || f.profile?.username || '?'
              const removing = removingId === f.friendshipId
              const menuOpen = friendMenuId === f.friendshipId
              return (
                <div key={f.id} className="t friendCard"
                  onClick={() => !removing && onViewFriend(f.id, f.friendshipId)}
                  style={{ position:'relative', display:'flex', flexDirection:'column',
                    alignItems:'center', gap:7, cursor: removing ? 'default' : 'pointer',
                    padding:'12px 16px', borderRadius:16, width: 96,
                    background:T.surf, border:`1px solid ${T.bord}`,
                    opacity: removing ? .5 : 1,
                    transition:'transform .15s, box-shadow .15s, border-color .15s' }}
                  onMouseEnter={e => { if (removing) return
                    e.currentTarget.style.transform='translateY(-3px)'
                    e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,${dark?.35:.12})`
                    e.currentTarget.style.borderColor='rgba(10,132,255,.45)' }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform=''
                    e.currentTarget.style.boxShadow=''
                    e.currentTarget.style.borderColor=T.bord }}>

                  {/* kebab menu trigger */}
                  <button className="t" aria-label="options"
                    onClick={e => { e.stopPropagation(); setFriendMenuId(menuOpen ? null : f.friendshipId) }}
                    style={{ position:'absolute', top:4, right:4, width:24, height:24,
                      borderRadius:8, border:'none', cursor:'pointer', lineHeight:1,
                      background: menuOpen ? T.surf2 : 'transparent', color:T.sub,
                      fontSize:14, fontWeight:800,
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                    ⋯
                  </button>

                  {menuOpen && (
                    <div onClick={e => e.stopPropagation()}
                      style={{ position:'absolute', top:30, right:4, zIndex:5,
                        borderRadius:10, overflow:'hidden', minWidth:120,
                        background:T.surf, border:`1px solid ${T.bord}`,
                        boxShadow:'0 8px 28px rgba(0,0,0,.35)' }}>
                      <button className="t"
                        onClick={() => { setFriendMenuId(null); onViewFriend(f.id, f.friendshipId) }}
                        style={{ width:'100%', textAlign:'left', padding:'9px 12px', border:'none',
                          background:'transparent', color:T.txt, fontSize:12.5, fontWeight:600,
                          cursor:'pointer' }}>
                        {t('profile.viewProfile')}
                      </button>
                      <button className="t"
                        onClick={() => { setFriendMenuId(null); handleRemoveFriend(f.friendshipId) }}
                        style={{ width:'100%', textAlign:'left', padding:'9px 12px', border:'none',
                          borderTop:`1px solid ${T.bord}`, background:'transparent',
                          color:'#FF3B30', fontSize:12.5, fontWeight:600, cursor:'pointer' }}>
                        {t('profile.unfriend')}
                      </button>
                    </div>
                  )}

                  <AvatarPic profile={f.profile} size={48}/>
                  <p title={fname} style={{ fontSize:11.5, fontWeight:600, color:T.txt,
                    maxWidth:72, textAlign:'center', overflow:'hidden',
                    textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {fname}
                  </p>
                </div>
              )
            })}
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
            {visibleLibrary.map((it, i) => (
              <MediaCard key={it.id} item={it} delay={i * 35} onOpen={onOpen} onStatus={onStatus}/>
            ))}
            {libraryLimit < displayed.length && (
              <button
                className="pill t"
                onClick={() => setLibraryLimit(limit => getProgressiveLimit({ current: limit, total: displayed.length, initial: isMobile ? 24 : 36, step: isMobile ? 18 : 24 }))}
                style={{
                  minHeight: isMobile ? 196 : 260,
                  borderRadius: 18,
                  border: `1px dashed ${T.bord}`,
                  background: T.surf,
                  color: T.txt,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Load more
              </button>
            )}
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
      <FavoriteGenresSection T={T} t={t} bannerColor={bannerColor} tasteProfile={tasteProfile} />

      {/* ── Favorite Studios ── */}
      <FavoriteStudiosSection T={T} t={t} bannerColor={bannerColor} tasteProfile={tasteProfile} />

      {/* ── Empty state ── */}
      <EmptyLibraryState T={T} t={t} animeCount={animeLib.length} />

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
