import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { SM } from '../constants'
import { AvatarPic } from '../components/AvatarPic'
import { StatBox } from '../components/StatBox'
import { useTmdbPosterBatch } from '../hooks/useTmdbPosterBatch'
import { fmtTime } from '../utils'
import { getProfile, deleteFriendship } from '../services/friends'
import { loadFriendLibrary } from '../services/userAnime'

export function FriendProfilePage({ userId, friendshipId, onClose, onOpen, onNavigate }) {
  const { T, dark } = useTheme()
  const { t } = useTranslation()

  const [profile, setProfile] = useState(null)
  const [library, setLibrary] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [unfriending, setUnfriending] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    Promise.all([getProfile(userId), loadFriendLibrary(userId)])
      .then(([p, lib]) => { if (!active) return; setProfile(p); setLibrary(lib) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [userId, reloadKey])

  const handleUnfriend = async () => {
    if (!friendshipId) return
    setUnfriending(true)
    try {
      await deleteFriendship(friendshipId)
      onClose()
    } catch {
      setUnfriending(false)
    }
  }

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

  const genreList = useMemo(() => {
    const map = {}
    animeLib.forEach(i => (i.genres || []).forEach(g => { map[g] = (map[g] || 0) + 1 }))
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [animeLib])

  const autoBannerAnime = useMemo(() => {
    if (!animeScoredItems.length) return animeLib[0] ?? null
    return [...animeScoredItems].sort((a, b) => b.userScore - a.userScore)[0]
  }, [animeLib, animeScoredItems])

  // Fetch TMDB posters for displayed items + autoBannerAnime
  const tmdbPosterBatch = useTmdbPosterBatch([...(library || []), autoBannerAnime].filter(Boolean))

  // Helper to get TMDB poster with fallback
  const getPosterUrl = (item) => tmdbPosterBatch[item?.id] ?? item?.img ?? null

  const autoBannerColor = useMemo(() => {
    if (!animeLib.length) return { a:'#0A84FF', b:'#BF5AF2' }
    const cc = {}
    animeLib.forEach(i => { cc[i.color] = (cc[i.color] || 0) + 1 })
    const top = Object.entries(cc).sort((a, b) => b[1] - a[1])[0][0]
    return { a: top, b: animeLib.find(i => i.color === top)?.colorB ?? top }
  }, [animeLib])

  const name     = profile?.display_name || profile?.username || t('profile.friendProfile')

  return (
    <div style={{ minHeight:'100vh', background:T.bg, color:T.txt,
      fontFamily:"-apple-system,'SF Pro Display','Helvetica Neue',sans-serif" }}>
      <div className="main-content" style={{ padding:'0 28px', paddingBottom:60 }}>

        {/* ── Top bar ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          paddingTop:20, marginBottom:0 }}>
          <button className="t" onClick={() => { onClose(); onNavigate?.('profile') }}
            style={{ background:'none', border:'none', cursor:'pointer',
              fontSize:14, fontWeight:600, color:T.sub, padding:'6px 0' }}>
            ← {t('profile.title')}
          </button>
          {friendshipId && (
            <button className="t" onClick={handleUnfriend} disabled={unfriending}
              style={{ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer',
                background:'rgba(255,59,48,.1)', color:'#FF3B30',
                fontSize:12, fontWeight:600, opacity: unfriending ? .5 : 1 }}>
              {t('profile.unfriend')}
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
            gap:14, paddingTop:80 }}>
            <div style={{ width:26, height:26, borderRadius:'50%',
              border:`3px solid ${T.bord}`, borderTopColor:'#0A84FF',
              animation:'spin .7s linear infinite' }}/>
            <p style={{ fontSize:13, color:T.sub }}>{t('profile.loadingProfile')}</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : error ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
            gap:14, paddingTop:80, textAlign:'center' }}>
            <div style={{ fontSize:38, opacity:.5 }}>⚠️</div>
            <p style={{ fontSize:15, fontWeight:700, color:T.txt }}>{t('profile.friendsLoadError')}</p>
            <button className="t" onClick={() => setReloadKey(k => k + 1)}
              style={{ padding:'8px 20px', borderRadius:20, border:'none', cursor:'pointer',
                background:'#0A84FF', color:'#fff', fontSize:13, fontWeight:700 }}>
              {t('profile.retry')}
            </button>
          </div>
        ) : !profile ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
            gap:14, paddingTop:80, textAlign:'center' }}>
            <div style={{ width:72, height:72, borderRadius:'50%',
              background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:30, color:T.sub }}>?</div>
            <p style={{ fontSize:16, fontWeight:700, color:T.txt }}>{t('profile.accountUnavailable')}</p>
            <p style={{ fontSize:13, color:T.sub, maxWidth:300, lineHeight:1.55 }}>
              {t('profile.accountUnavailableDesc')}
            </p>
            {friendshipId && (
              <button className="t" onClick={handleUnfriend} disabled={unfriending}
                style={{ padding:'8px 20px', borderRadius:20, border:'none', cursor:'pointer',
                  background:'rgba(255,59,48,.12)', color:'#FF3B30', fontSize:13, fontWeight:700,
                  opacity: unfriending ? .5 : 1 }}>
                {t('profile.removeConnection')}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Banner + avatar ── */}
            <div style={{ position:'relative', marginTop:8 }}>
              <div style={{ borderRadius:24, overflow:'hidden', height:220, position:'relative',
                background:`linear-gradient(135deg,${autoBannerColor.a},${autoBannerColor.b})`,
                boxShadow:`0 12px 48px ${autoBannerColor.a}44` }}>
                {getPosterUrl(autoBannerAnime) && (
                  <img src={getPosterUrl(autoBannerAnime)} alt="" style={{ position:'absolute', inset:0,
                    width:'100%', height:'100%', objectFit:'cover',
                    filter:'blur(28px)', transform:'scale(1.15)',
                    opacity: dark ? .35 : .22 }}/>
                )}
                <div style={{ position:'absolute', inset:0,
                  background:`linear-gradient(135deg,${autoBannerColor.a}99,${autoBannerColor.b}88)` }}/>
                <div style={{ position:'absolute', inset:0,
                  background:'linear-gradient(to bottom,transparent 50%,rgba(0,0,0,.28) 100%)' }}/>
              </div>

              {/* Avatar */}
              <div style={{ position:'absolute', bottom:-40, left:16, zIndex:3,
                width:84, height:84, borderRadius:'50%',
                border:`4px solid ${T.bg}`,
                boxShadow:'0 4px 24px rgba(0,0,0,.28)',
                overflow:'hidden' }}>
                <AvatarPic profile={profile} size={84} />
              </div>
            </div>

            {/* ── Name + tagline ── */}
            <div style={{ paddingLeft:116, paddingTop:10, marginBottom:20, minHeight:50 }}>
              <p style={{ fontSize:18, fontWeight:700, color:T.txt, letterSpacing:'-.02em',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:400 }}>
                {name}
              </p>
              <p style={{ fontSize:13, color:T.sub, marginTop:3 }}>
                {animeLib.length} anime
                {animeAvgScore !== '—' ? ` · ${t('profile.avgScoreLabel')} ${animeAvgScore}` : ''}
              </p>
            </div>

            {/* ── Stats ── */}
            <div style={{ display:'grid',
              gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:36 }}>
              <StatBox fill label={t('profile.animes')}   val={animeLib.length      || '—'} color="#0A84FF" icon="📺"/>
              <StatBox fill label={t('profile.episodes')} val={animeWatchedEps      || '—'} color="#34C759" icon="▶"/>
              <StatBox fill label={t('profile.time')}     val={fmtTime(animeWatchTimeMin)}   color="#BF5AF2" icon="⏱"/>
              <StatBox fill label={t('profile.avgScore')} val={animeAvgScore}                color="#FF9F0A" icon="★"/>
            </div>

            {/* ── Watching Now ── */}
            {watchingNow.length > 0 && (
              <section style={{ marginBottom:36 }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:14 }}>
                  <h2 style={{ fontSize:18, fontWeight:700, color:T.txt, letterSpacing:'-.02em' }}>
                    {t('profile.watchingNow')}
                  </h2>
                  <span style={{ fontSize:12, fontWeight:600, color:'#34C759',
                    background:'rgba(52,199,89,.12)', padding:'2px 8px', borderRadius:10 }}>
                    {watchingNow.length}
                  </span>
                </div>
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
                          <img src={getPosterUrl(item)} alt=""
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
              </section>
            )}

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
                    <div key={status} style={{ padding:'14px 16px', borderRadius:16,
                      background:`${dot}12`, border:`1px solid ${dot}20` }}>
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
                        <img src={getPosterUrl(item)} alt=""
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
            {genreList.length > 0 && (
              <section style={{ marginBottom:36 }}>
                <h2 style={{ fontSize:18, fontWeight:700, color:T.txt,
                  letterSpacing:'-.02em', marginBottom:14 }}>{t('profile.favoriteGenres')}</h2>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {genreList.map(([genre, count], idx) => {
                    const top3 = idx < 3
                    return (
                      <div key={genre} style={{ display:'flex', alignItems:'center', gap:6,
                        padding:top3?'8px 16px':'6px 13px', borderRadius:22,
                        background:top3?'rgba(10,132,255,.15)':'rgba(10,132,255,.08)',
                        border:`1px solid rgba(10,132,255,${top3?.3:.15})` }}>
                        <span style={{ fontSize:top3?13.5:13, fontWeight:600, color:'#0A84FF' }}>{genre}</span>
                        <span style={{ fontSize:11, fontWeight:700, color:'#0A84FF',
                          background:'rgba(10,132,255,.15)', borderRadius:10,
                          padding:'1px 6px', lineHeight:1.6 }}>{count}</span>
                      </div>
                    )
                  })}
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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
