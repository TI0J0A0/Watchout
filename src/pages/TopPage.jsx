import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useTmdbPosterBatch } from '../hooks/useTmdbPosterBatch'
import { LoadingGrid } from '../components/LoadingGrid'
import { ClickableCard, EmptyState } from '../components/ui'

const HERO_COLORS = [
  ["#FF9F0A","#FFD60A"],
  ["#34AADC","#5AC8FA"],
  ["#BF5AF2","#DA8FFF"],
];

export function TopPage({ topData, loading, onOpen }) {
  const { T } = useTheme();
  const { t } = useTranslation();

  if (loading) return (
    <div style={{paddingTop:32,paddingBottom:48}}>
      <p style={{fontSize:13,color:T.sub,marginBottom:3}}>{t('top.subtitle')}</p>
      <h2 style={{fontSize:26,fontWeight:700,color:T.txt,letterSpacing:"-.02em",marginBottom:28}}>{t('top.title')}</h2>
      <LoadingGrid count={6}/>
    </div>
  );

  const top3 = topData.slice(0,3);
  const rest = topData.slice(3);

  // Fetch TMDB posters for all items
  const tmdbPosterBatch = useTmdbPosterBatch(topData)

  // Helper to get TMDB poster with fallback
  const getPosterUrl = (item) => tmdbPosterBatch[item?.id] ?? item?.img ?? null

  return (
    <div className="fu" style={{paddingTop:32,paddingBottom:48}}>
      <p style={{fontSize:13,color:T.sub,marginBottom:3}}>{t('top.subtitle')}</p>
      <h2 style={{fontSize:26,fontWeight:700,color:T.txt,letterSpacing:"-.02em",marginBottom:28}}>{t('top.title')}</h2>

      <div className="top3-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:28}}>
        {top3.map((it,i)=>(
          <ClickableCard key={it.id} className="sc" onClick={()=>onOpen(it)} ariaLabel={`Open ${it.title}`} style={{borderRadius:20,overflow:"hidden",
            position:"relative",height:260,cursor:"pointer",animationDelay:`${i*70}ms`,
            background:`linear-gradient(135deg,${HERO_COLORS[i][0]},${HERO_COLORS[i][1]})`}}>
            {getPosterUrl(it) && <img src={getPosterUrl(it)} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",
              objectFit:"cover",opacity:.45}}/>}
            <div style={{position:"absolute",inset:0,
              background:"linear-gradient(to top,rgba(0,0,0,.7) 0%,transparent 55%)"}}/>
            <div style={{position:"absolute",top:16,left:16,width:36,height:36,borderRadius:"50%",
              background:"rgba(255,255,255,.22)",backdropFilter:"blur(6px)",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:16,fontWeight:800,color:"#fff"}}>{it.rank}</span>
            </div>
            <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 16px 16px"}}>
              <p style={{fontSize:14,fontWeight:700,color:"#fff",marginBottom:4,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.title}</p>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{color:"#FFD60A",fontSize:12}}>★</span>
                <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{it.score}</span>
                {it.eps&&<span style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>· {it.eps} {t('anime.eps')}</span>}
              </div>
            </div>
          </ClickableCard>
        ))}
      </div>

      {topData.length === 0 ? (
        <EmptyState icon="★" title="No ranking yet" description="Top anime will appear here when the catalog is ready." />
      ) : (
      <div style={{borderRadius:16,overflow:"hidden",border:`1px solid ${T.bord}`}}>
        {rest.map((it,i)=>(
          <ClickableCard key={it.id} className="rbtn fu" onClick={()=>onOpen(it)} ariaLabel={`Open ${it.title}`} style={{display:"flex",alignItems:"center",width:"100%",
            gap:16,padding:"14px 20px",background:T.surf,cursor:"pointer",
            animationDelay:`${(i+3)*60}ms`,
            borderBottom:i<rest.length-1?`1px solid ${T.bord}`:"none"}}>
            <span style={{width:28,textAlign:"center",fontSize:14,fontWeight:700,color:T.sub,flexShrink:0}}>{it.rank}</span>
            {getPosterUrl(it) ? (
              <img src={getPosterUrl(it)} alt="" style={{width:40,height:56,objectFit:"cover",borderRadius:7,flexShrink:0}}/>
            ) : (
              <div style={{width:40,height:56,borderRadius:7,flexShrink:0,background:`linear-gradient(135deg,${it.color},${it.colorB})`}}/>
            )}
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:15,fontWeight:600,color:T.txt,whiteSpace:"nowrap",
                overflow:"hidden",textOverflow:"ellipsis"}}>{it.title}</p>
              <p style={{fontSize:12,color:T.sub,marginTop:2}}>{it.year}{it.eps?` · ${it.eps} ${t('anime.eps')}`:""}</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
              <span style={{color:"#FF9F0A",fontSize:13}}>★</span>
              <span style={{fontSize:16,fontWeight:700,color:T.txt}}>{it.score}</span>
            </div>
          </ClickableCard>
        ))}
      </div>
      )}
    </div>
  );
}
