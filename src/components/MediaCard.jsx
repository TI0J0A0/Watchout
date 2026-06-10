import { memo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { SM } from '../constants'
import { useTheme } from '../context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { shouldTreatPointerAsTap } from '../utils/mobileInteraction'
import { fmt } from '../utils'
import { StatusBtn } from './StatusBtn'
import { useTmdbImage } from '../hooks/useTmdbImage'

export const MediaCard = memo(function MediaCard({ item, delay, onOpen, onStatus, variant = 'grid', matchPct }) {
  const { T } = useTheme();
  const { t } = useTranslation();
  const isShelf = variant === 'shelf';
  const isMobile = useIsMobile()
  const pointerStartRef = useRef(null)
  const sm = SM[item.userStatus];
  const poster = useTmdbImage(item, 'poster')

  const typeLabel = item.type === 'anime' ? t('anime.typeAnime')
                  : item.type === 'series' ? t('anime.typeSeries')
                  : t('anime.typeFilm')

  const handlePointerDown = e => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
  }

  const handleOpen = e => {
    const pointerStart = pointerStartRef.current
    pointerStartRef.current = null

    if (pointerStart && !shouldTreatPointerAsTap(pointerStart, { x: e.clientX, y: e.clientY })) {
      return
    }

    onOpen(item)
  }

  return (
    <div className="fu media-card-wrap" style={{
      animationDelay:`${delay}ms`,
      flexShrink: isShelf ? 0 : undefined,
      width: isShelf ? (isMobile ? 170 : 250) : undefined,
    }}>
      <div className="card media-card t" role="button" tabIndex={0}
        onPointerDown={handlePointerDown}
        onClick={handleOpen}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item) } }}
        style={{
        borderRadius: isShelf ? 18 : 22,
        overflow:"hidden",background:T.surf,
        border:`1px solid ${T.bord}`,
        boxShadow:`0 ${isShelf?4:2}px ${isShelf?20:16}px rgba(0,0,0,${T.dark?(isShelf?.18:.16):(isShelf?.08:.07)})`,
        marginBottom:10,
        touchAction: isShelf ? 'pan-x' : 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}>
        <div style={{position:"relative",paddingTop:"150%",overflow:"hidden"}}>
          {poster ? (
            <img className="cimg t" src={poster} alt="" loading="lazy" decoding="async"
              style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
          ) : (
            <div className="cimg t" style={{position:"absolute",inset:0,
              background:`linear-gradient(135deg,${item.color}CC,${item.colorB}CC)`,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:32,opacity:.6}}>📺</span>
            </div>
          )}
          <div className="media-card-gradient" style={{position:"absolute",inset:0,
            background:`linear-gradient(to top,rgba(0,0,0,.76) 0%,rgba(0,0,0,.28) 34%,transparent ${isShelf?58:60}%)`}}/>

          {/* Score */}
          <div style={{position:"absolute",top:isShelf?8:9,right:isShelf?8:9,padding:"3px 7px",
            borderRadius:8,background:"rgba(0,0,0,.66)",
            display:"flex",alignItems:"center",gap:3}}>
            <span style={{color:"#FFD60A",fontSize:10}}>★</span>
            <span style={{fontSize:12,fontWeight:700,color:"#fff"}}>{item.score}</span>
          </div>

          {/* Status dot */}
          {sm&&<div style={{position:"absolute",top:isShelf?8:9,left:isShelf?8:9,
            width:8,height:8,borderRadius:"50%",
            background:sm.dot,boxShadow:`0 0 6px ${sm.dot}`}}/>}

          {/* Airing badge */}
          {item.airing&&(
            isShelf ? (
              <div style={{position:"absolute",bottom:8,right:8,width:7,height:7,borderRadius:"50%",
                background:"#34C759",boxShadow:"0 0 5px #34C759"}}/>
            ) : (
              <div style={{position:"absolute",bottom:9,right:9,display:"flex",alignItems:"center",gap:4,
                padding:"3px 7px",borderRadius:8,
                background:"rgba(52,199,89,.2)",border:"1px solid rgba(52,199,89,.4)"}}>
                <span style={{width:5,height:5,borderRadius:"50%",background:"#34C759",display:"block"}}/>
                <span style={{fontSize:9.5,fontWeight:600,color:"#34C759"}}>{t('common.liveLabel')}</span>
              </div>
            )
          )}

          {/* Type badge */}
          <div style={{position:"absolute",bottom:isShelf?8:9,left:isShelf?8:9,padding:"2px 7px",
            borderRadius:6,background:`${item.color}CC`,
            fontSize:isShelf?10:9.5,fontWeight:isShelf?600:700,color:"#fff",
            letterSpacing:".04em",textTransform:"uppercase"}}>
            {typeLabel}
          </div>

          {/* Match score badge */}
          {matchPct != null && !item.airing && (
            <div style={{
              position: 'absolute', bottom: isShelf ? 8 : 9, right: isShelf ? 8 : 9,
              padding: '2px 7px', borderRadius: 8,
              background: matchPct >= 80 ? 'rgb(40,160,72)' : matchPct >= 60 ? 'rgb(214,130,8)' : 'rgb(110,110,116)',
              fontSize: 10, fontWeight: 700, color: '#fff',
            }}>
              {matchPct}%
            </div>
          )}

          {/* Hover info panel (desktop only) */}
          <div className="card-hover-info">
            <p className="chi-title">{item.title}</p>
            <div className="chi-rating">
              <span style={{ color:"#FFD60A" }}>★</span>
              <span style={{ fontWeight:700 }}>{item.score || "—"}</span>
              {item.members ? <span className="chi-dim">({fmt(item.members)})</span> : null}
            </div>
            <p className="chi-meta">
              {item.eps ? `${item.eps} ${t('mediaCard.episodes')}` : typeLabel}
              {item.year ? ` · ${item.year}` : ""}
            </p>
            {item.synopsis && <p className="chi-syn">{item.synopsis}</p>}
          </div>
        </div>

        <div style={{padding:"10px 12px 12px"}}>
          <p style={{fontSize:isShelf?13:13.5,fontWeight:600,color:T.txt,lineHeight:1.3,
            marginBottom:isShelf?3:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}
            title={item.title}>{item.title}</p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:4}}>
            <p style={{fontSize:isShelf?11:11.5,color:T.sub,overflow:"hidden",
              textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {isShelf ? item.studio : `${item.studio} · ${item.year}`}
            </p>
            {item.userScore&&(
              <span style={{fontSize:11,fontWeight:700,color:item.color,flexShrink:0}}>
                ★ {item.userScore}
              </span>
            )}
          </div>
        </div>
      </div>
      <StatusBtn item={item} onStatus={onStatus}/>
    </div>
  )
})
