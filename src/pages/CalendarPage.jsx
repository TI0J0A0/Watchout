import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DAYS, SC, SM } from '../constants'
import { useTheme } from '../context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { Chip, ClickableCard } from '../components/ui'
import { getStreamingProviderName } from '../utils/streaming'

const FULL_DAY_KEY = {
  Sun:"Sun", Mon:"Mon", Tue:"Tue", Wed:"Wed", Thu:"Thu", Fri:"Fri", Sat:"Sat",
};

export function CalendarPage({ data, onOpen }) {
  const { T } = useTheme();
  const { t } = useTranslation();
  const isMobile = useIsMobile()
  const todayIdx    = new Date().getDay();
  const today       = DAYS[todayIdx];
  const sectionRefs = useRef({});

  const airing = data.filter(i => i.airing && i.airDay);
  const byDay  = Object.fromEntries(DAYS.map(d => [d, airing.filter(i => i.airDay === d)]));

  const orderedDays = [...DAYS.slice(todayIdx), ...DAYS.slice(0, todayIdx)];
  const activeDays  = orderedDays.filter(d => byDay[d].length > 0);

  const scrollTo = day =>
    sectionRefs.current[day]?.scrollIntoView({ behavior:'smooth', block:'start' });

  return (
    <div className="fu" style={{paddingTop:32,paddingBottom:48}}>
      <p style={{fontSize:13,color:T.sub,marginBottom:3}}>{t('calendar.subtitle')}</p>
      <h2 style={{fontSize:26,fontWeight:700,color:T.txt,letterSpacing:"-.02em",marginBottom:24}}>
        {t('calendar.title')}
      </h2>

      {/* Day pill tabs */}
      <div style={{display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",
        paddingBottom:4,marginBottom:36}}>
        {DAYS.map(day => {
          const isToday = day === today;
          const count   = byDay[day].length;
          return (
            <Chip key={day}
              active={isToday}
              tone="#0A84FF"
              onClick={() => scrollTo(day)}
              style={{flexShrink:0,
                background: isToday ? "#0A84FF" : T.surf2,
                color: isToday ? "#fff" : count > 0 ? T.txt : T.sub,
                opacity: count === 0 ? .45 : 1}}>
              {t(`days.abbr.${day}`)}
              {count > 0 && (
                <span style={{width:18,height:18,borderRadius:"50%",fontSize:10,fontWeight:700,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  background: isToday ? "rgba(255,255,255,.25)" : T.surf,
                  color: isToday ? "#fff" : T.sub}}>
                  {count}
                </span>
              )}
            </Chip>
          );
        })}
      </div>

      {/* Sections grouped by day */}
      {activeDays.length === 0 ? (
        <div style={{textAlign:"center",padding:"80px 0"}}>
          <p style={{fontSize:44,opacity:.15,marginBottom:12}}>📅</p>
          <p style={{color:T.sub,fontSize:15}}>{t('calendar.noAnime')}</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:36}}>
          {activeDays.map(day => (
            <div key={day} ref={el => sectionRefs.current[day] = el}>

              {/* Day header */}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{width:40,height:40,borderRadius:"50%",flexShrink:0,
                  background: day===today ? "#0A84FF" : T.surf2,
                  border: day===today ? "none" : `1px solid ${T.bord}`,
                  display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:12,fontWeight:700,
                    color: day===today ? "#fff" : T.sub}}>{t(`days.abbr.${day}`)}</span>
                </div>
                <div>
                  <p style={{fontSize:16,fontWeight:700,color:T.txt,lineHeight:1.2}}>
                    {day===today
                      ? `${t('calendar.today')} · ${t(`days.full.${FULL_DAY_KEY[day]}`)}`
                      : t(`days.full.${FULL_DAY_KEY[day]}`)}
                  </p>
                  <p style={{fontSize:12,color:T.sub,marginTop:1}}>
                    {t('calendar.titles', { count: byDay[day].length })}
                  </p>
                </div>
                <div style={{flex:1,height:1,background:T.bord}}/>
              </div>

              {/* Anime rows */}
              <div style={{borderRadius:16,overflow:"hidden",border:`1px solid ${T.bord}`}}>
                {byDay[day].map((item,i) => {
                  const sm = SM[item.userStatus];
                  return (
                    <ClickableCard key={item.id} className="rbtn" onClick={()=>onOpen(item)} ariaLabel={`Open ${item.title}`}
                      style={{position:"relative",display:"flex",alignItems:"center",
                        width:"100%",
                        gap: isMobile ? 12 : 14,
                        padding: isMobile ? "14px 16px 14px 20px" : "12px 16px 12px 20px",
                        background:T.surf,cursor:"pointer",
                        borderBottom:i<byDay[day].length-1?`1px solid ${T.bord}`:"none"}}>

                      <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,borderRadius:"0 2px 2px 0",
                        background:`linear-gradient(to bottom,${item.color},${item.colorB})`}}/>

                      {item.img ? (
                        <img src={item.img} alt="" style={{width: isMobile ? 52 : 48,height: isMobile ? 74 : 68,objectFit:"cover",
                          borderRadius:10,flexShrink:0}}/>
                      ) : (
                        <div style={{width: isMobile ? 52 : 48,height: isMobile ? 74 : 68,borderRadius:10,flexShrink:0,
                          background:`linear-gradient(135deg,${item.color},${item.colorB})`}}/>
                      )}

                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                          {sm && (
                            <span style={{width:7,height:7,borderRadius:"50%",flexShrink:0,
                              background:sm.dot,boxShadow:`0 0 5px ${sm.dot}`}}/>
                          )}
                          <p style={{fontSize:15,fontWeight:600,color:T.txt,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {item.title}
                          </p>
                        </div>
                        <p style={{fontSize:12,color:T.sub,marginBottom:7}}>{item.studio}</p>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {item.streaming.slice(0,3).map(provider=>{
                            const s = getStreamingProviderName(provider)
                            if (!s) return null
                            return (
                            <span key={s} style={{fontSize:11,fontWeight:600,padding:"2px 8px",
                              borderRadius:6,color:SC[s]||T.sub,
                              background:`${SC[s]||'#888'}14`}}>
                              {s}
                            </span>
                            )
                          })}
                        </div>
                      </div>

                      <div style={{textAlign:"right",flexShrink:0}}>
                        {item.score > 0 && (
                          <div style={{display:"flex",alignItems:"center",gap:3,
                            justifyContent:"flex-end",marginBottom:4}}>
                            <span style={{color:"#FF9F0A",fontSize:12}}>★</span>
                            <span style={{fontSize:15,fontWeight:700,color:T.txt}}>{item.score}</span>
                          </div>
                        )}
                        {item.eps && (
                          <p style={{fontSize:11,color:T.sub}}>{item.eps} {t('anime.eps')}</p>
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
