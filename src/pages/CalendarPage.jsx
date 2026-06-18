import { useRef, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { DAYS, SC, SM } from '../constants'
import { useTheme } from '../context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { useTmdbPosterBatch } from '../hooks/useTmdbPosterBatch'
import { useAiringSchedule } from '../hooks/useAiringSchedule'
import { Chip, ClickableCard } from '../components/ui'
import { getStreamingProviderName } from '../utils/streaming'
import {
  airingDayKey,
  formatClock,
  hasAired,
  countdownParts,
  compareAiring,
} from '../utils/airingTime'

export function CalendarPage({ data, onOpen }) {
  const { T } = useTheme();
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile()
  const sectionRefs = useRef({});

  const now = Date.now()
  const todayIdx    = new Date(now).getDay();
  const today       = DAYS[todayIdx];
  const tomorrow    = DAYS[(todayIdx + 1) % 7];

  const [view, setView]           = useState('agenda')   // 'agenda' | 'week'
  const [myListOnly, setMyListOnly] = useState(false)

  const { schedule } = useAiringSchedule(true)

  // Fetch TMDB posters for all items
  const tmdbPosterBatch = useTmdbPosterBatch(data)
  const getPosterUrl = (item) => tmdbPosterBatch[item?.id] ?? item?.img ?? null

  // Enrich each airing title with its exact next-episode time (local) from the
  // AniList schedule, falling back to the Jikan broadcast weekday when missing.
  const enriched = useMemo(() => {
    return data
      .filter(i => i.airing && (i.airDay || schedule[i.id]?.airingAt != null))
      .map(i => {
        const s = schedule[i.id]
        const airingAt = s?.airingAt ?? null
        const day = airingDayKey(airingAt) ?? i.airDay
        return { ...i, airingAt, episode: s?.episode ?? null, day }
      })
      .filter(i => i.day)
  }, [data, schedule])

  const visible = useMemo(
    () => (myListOnly ? enriched.filter(i => i.userStatus) : enriched),
    [enriched, myListOnly]
  )

  const byDay = useMemo(() => {
    const m = Object.fromEntries(DAYS.map(d => [d, []]))
    visible.forEach(i => { if (m[i.day]) m[i.day].push(i) })
    Object.values(m).forEach(arr => arr.sort(compareAiring))
    return m
  }, [visible])

  // Week starting today; each day carries its calendar date.
  const week = useMemo(() =>
    DAYS.map((_, offset) => {
      const idx = (todayIdx + offset) % 7
      const date = new Date(now); date.setDate(date.getDate() + offset)
      return { day: DAYS[idx], offset, date }
    })
  , [todayIdx, now])

  const activeWeek = week.filter(w => byDay[w.day].length > 0)

  const scrollTo = day =>
    sectionRefs.current[day]?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // ── label helpers ──────────────────────────────────────────────────────────
  const dayName = day =>
    day === today ? t('calendar.today')
    : day === tomorrow ? t('calendar.tomorrow')
    : t(`days.full.${day}`)

  const fmtDate = date =>
    date.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })

  const relLabel = airingAt => {
    const p = countdownParts(airingAt, now)
    if (!p) return null
    if (p.state === 'aired')  return t('calendar.aired')
    if (p.state === 'min')    return t('calendar.inMin', { m: p.m })
    if (p.state === 'hours')  return p.m ? t('calendar.inHours', { h: p.h, m: p.m }) : t('calendar.inHoursOnly', { h: p.h })
    return t('calendar.inDays', { count: p.d })
  }

  const streamingChips = item => item.streaming.slice(0, 3).map(provider => {
    const s = getStreamingProviderName(provider)
    if (!s) return null
    return (
      <span key={s} style={{ fontSize:11, fontWeight:600, padding:'2px 8px',
        borderRadius:6, color:SC[s] || T.sub, background:`${SC[s] || '#888'}14` }}>
        {s}
      </span>
    )
  })

  const segBtn = (val, label, icon) => {
    const on = view === val
    return (
      <button key={val} className="t" onClick={() => setView(val)}
        style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
          borderRadius:20, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
          background: on ? '#0A84FF' : T.surf2, color: on ? '#fff' : T.sub }}>
        <span style={{ fontSize:13 }}>{icon}</span>{label}
      </button>
    )
  }

  return (
    <div className="fu" style={{ paddingTop:32, paddingBottom:48 }}>
      <p style={{ fontSize:13, color:T.sub, marginBottom:3 }}>{t('calendar.subtitle')}</p>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between',
        gap:12, flexWrap:'wrap', marginBottom:18 }}>
        <h2 style={{ fontSize:26, fontWeight:700, color:T.txt, letterSpacing:'-.02em' }}>
          {t('calendar.title')}
        </h2>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          {segBtn('agenda', t('calendar.viewAgenda'), '☰')}
          {segBtn('week',   t('calendar.viewWeek'),   '▦')}
          <button className="t" onClick={() => setMyListOnly(v => !v)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px',
              borderRadius:20, cursor:'pointer', fontSize:13, fontWeight:600,
              border: myListOnly ? '1px solid #34C759' : `1px solid ${T.bord}`,
              background: myListOnly ? 'rgba(52,199,89,.14)' : 'transparent',
              color: myListOnly ? '#34C759' : T.sub }}>
            <span style={{ fontSize:12 }}>{myListOnly ? '✓' : '☆'}</span>{t('calendar.myListOnly')}
          </button>
        </div>
      </div>

      <p style={{ fontSize:11.5, color:T.sub, marginBottom:24, display:'flex',
        alignItems:'center', gap:5 }}>
        <span style={{ fontSize:12 }}>🕐</span>{t('calendar.scheduleNote')}
      </p>

      {/* Day pill tabs (agenda navigation) */}
      {view === 'agenda' && (
        <div style={{ display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none',
          paddingBottom:4, marginBottom:36 }}>
          {DAYS.map(day => {
            const isToday = day === today;
            const count   = byDay[day].length;
            return (
              <Chip key={day}
                active={isToday}
                tone="#0A84FF"
                onClick={() => scrollTo(day)}
                style={{ flexShrink:0,
                  background: isToday ? '#0A84FF' : T.surf2,
                  color: isToday ? '#fff' : count > 0 ? T.txt : T.sub,
                  opacity: count === 0 ? .45 : 1 }}>
                {t(`days.abbr.${day}`)}
                {count > 0 && (
                  <span style={{ width:18, height:18, borderRadius:'50%', fontSize:10, fontWeight:700,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background: isToday ? 'rgba(255,255,255,.25)' : T.surf,
                    color: isToday ? '#fff' : T.sub }}>
                    {count}
                  </span>
                )}
              </Chip>
            );
          })}
        </div>
      )}

      {activeWeek.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 0' }}>
          <p style={{ fontSize:44, opacity:.15, marginBottom:12 }}>📅</p>
          <p style={{ color:T.sub, fontSize:15 }}>{t('calendar.noAnime')}</p>
        </div>

      ) : view === 'week' ? (
        /* ── Week grid ── */
        <div style={{ display:'grid',
          gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(7,1fr)', gap:10 }}>
          {week.map(({ day, date }) => {
            const items = byDay[day]
            const isToday = day === today
            return (
              <div key={day} style={{ borderRadius:14, overflow:'hidden',
                border: isToday ? '1px solid #0A84FF' : `1px solid ${T.bord}`,
                background: T.surf, display:'flex', flexDirection:'column' }}>
                <div style={{ padding:'8px 10px', textAlign:'center',
                  background: isToday ? '#0A84FF' : T.surf2 }}>
                  <p style={{ fontSize:11, fontWeight:700,
                    color: isToday ? '#fff' : T.txt }}>{t(`days.abbr.${day}`)}</p>
                  <p style={{ fontSize:10, marginTop:1,
                    color: isToday ? 'rgba(255,255,255,.8)' : T.sub }}>{fmtDate(date)}</p>
                </div>
                <div style={{ padding:8, display:'flex', flexDirection:'column', gap:8,
                  minHeight:60 }}>
                  {items.length === 0 ? (
                    <p style={{ fontSize:10.5, color:T.sub, textAlign:'center',
                      padding:'12px 0', opacity:.6 }}>—</p>
                  ) : items.map(item => {
                    const aired = hasAired(item.airingAt, now)
                    return (
                      <ClickableCard key={item.id} className="t" onClick={() => onOpen(item)}
                        ariaLabel={`Open ${item.title}`}
                        style={{ display:'flex', flexDirection:'column', gap:5, cursor:'pointer',
                          padding:0, background:'transparent', border:'none', opacity: aired ? .5 : 1 }}>
                        <div style={{ position:'relative', borderRadius:8, overflow:'hidden' }}>
                          {getPosterUrl(item) ? (
                            <img src={getPosterUrl(item)} alt="" style={{ width:'100%',
                              aspectRatio:'0.72', objectFit:'cover', display:'block' }}/>
                          ) : (
                            <div style={{ width:'100%', aspectRatio:'0.72',
                              background:`linear-gradient(135deg,${item.color},${item.colorB})` }}/>
                          )}
                          {item.airingAt != null && (
                            <div style={{ position:'absolute', bottom:0, left:0, right:0,
                              padding:'2px 5px', background:'rgba(0,0,0,.62)',
                              fontSize:10, fontWeight:700, color:'#fff', textAlign:'center' }}>
                              {formatClock(item.airingAt, i18n.language)}
                            </div>
                          )}
                        </div>
                        <p style={{ fontSize:10.5, fontWeight:600, color:T.txt, lineHeight:1.25,
                          overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box',
                          WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                          {item.title}
                        </p>
                      </ClickableCard>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

      ) : (
        /* ── Agenda (timeline) ── */
        <div style={{ display:'flex', flexDirection:'column', gap:36 }}>
          {activeWeek.map(({ day, date }) => (
            <div key={day} ref={el => sectionRefs.current[day] = el}>

              {/* Day header */}
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
                  background: day === today ? '#0A84FF' : T.surf2,
                  border: day === today ? 'none' : `1px solid ${T.bord}`,
                  display:'flex', flexDirection:'column', alignItems:'center',
                  justifyContent:'center', lineHeight:1 }}>
                  <span style={{ fontSize:10, fontWeight:700,
                    color: day === today ? 'rgba(255,255,255,.85)' : T.sub }}>
                    {t(`days.abbr.${day}`)}
                  </span>
                  <span style={{ fontSize:15, fontWeight:800, marginTop:2,
                    color: day === today ? '#fff' : T.txt }}>
                    {date.getDate()}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize:16, fontWeight:700, color:T.txt, lineHeight:1.2 }}>
                    {dayName(day)}
                  </p>
                  <p style={{ fontSize:12, color:T.sub, marginTop:1 }}>
                    {t('calendar.titles', { count: byDay[day].length })}
                  </p>
                </div>
                <div style={{ flex:1, height:1, background:T.bord }}/>
              </div>

              {/* Anime rows */}
              <div style={{ borderRadius:16, overflow:'hidden', border:`1px solid ${T.bord}` }}>
                {byDay[day].map((item, i) => {
                  const sm = SM[item.userStatus];
                  const aired = hasAired(item.airingAt, now)
                  const soon = item.airingAt != null && !aired &&
                    countdownParts(item.airingAt, now)?.state !== 'days'
                  return (
                    <ClickableCard key={item.id} className="rbtn" onClick={() => onOpen(item)}
                      ariaLabel={`Open ${item.title}`}
                      style={{ position:'relative', display:'flex', alignItems:'center',
                        width:'100%', gap: isMobile ? 10 : 14,
                        padding: isMobile ? '14px 16px 14px 14px' : '12px 16px 12px 14px',
                        background:T.surf, cursor:'pointer', opacity: aired ? .55 : 1,
                        boxShadow: i < byDay[day].length - 1 ? `inset 0 -1px 0 ${T.bord}` : 'none' }}>

                      {/* Time column */}
                      <div style={{ width: isMobile ? 50 : 58, flexShrink:0, textAlign:'center' }}>
                        {item.airingAt != null ? (
                          <>
                            <p style={{ fontSize:15, fontWeight:800, lineHeight:1,
                              color: soon ? '#0A84FF' : T.txt }}>
                              {formatClock(item.airingAt, i18n.language)}
                            </p>
                            <p style={{ fontSize:10, marginTop:3, fontWeight:600,
                              color: aired ? T.sub : soon ? '#0A84FF' : T.sub }}>
                              {relLabel(item.airingAt)}
                            </p>
                          </>
                        ) : (
                          <p style={{ fontSize:10.5, color:T.sub, lineHeight:1.3 }}>
                            {t('calendar.noTime')}
                          </p>
                        )}
                      </div>

                      {/* color accent */}
                      <div style={{ width:3, alignSelf:'stretch', borderRadius:2, flexShrink:0,
                        background:`linear-gradient(to bottom,${item.color},${item.colorB})` }}/>

                      {getPosterUrl(item) ? (
                        <img src={getPosterUrl(item)} alt="" style={{ width: isMobile ? 48 : 48,
                          height: isMobile ? 68 : 68, objectFit:'cover', borderRadius:10, flexShrink:0 }}/>
                      ) : (
                        <div style={{ width:48, height:68, borderRadius:10, flexShrink:0,
                          background:`linear-gradient(135deg,${item.color},${item.colorB})` }}/>
                      )}

                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                          {sm && (
                            <span style={{ width:7, height:7, borderRadius:'50%', flexShrink:0,
                              background:sm.dot, boxShadow:`0 0 5px ${sm.dot}` }}/>
                          )}
                          <p style={{ fontSize:15, fontWeight:600, color:T.txt,
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {item.title}
                          </p>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                          {item.episode != null && (
                            <span style={{ fontSize:11, fontWeight:700, color:'#0A84FF',
                              background:'rgba(10,132,255,.12)', borderRadius:6, padding:'1px 7px' }}>
                              {t('calendar.ep', { n: item.episode })}
                            </span>
                          )}
                          <p style={{ fontSize:12, color:T.sub, overflow:'hidden',
                            textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.studio}</p>
                        </div>
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {streamingChips(item)}
                        </div>
                      </div>

                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        {item.score > 0 && (
                          <div style={{ display:'flex', alignItems:'center', gap:3,
                            justifyContent:'flex-end', marginBottom:4 }}>
                            <span style={{ color:'#FF9F0A', fontSize:12 }}>★</span>
                            <span style={{ fontSize:15, fontWeight:700, color:T.txt }}>{item.score}</span>
                          </div>
                        )}
                        {item.eps && (
                          <p style={{ fontSize:11, color:T.sub }}>{item.eps} {t('anime.eps')}</p>
                        )}
                      </div>
                    </ClickableCard>
                  );
                })}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
