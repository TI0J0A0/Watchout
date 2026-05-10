import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { searchAnime } from '../services/jikan'
import { MediaCard } from '../components/MediaCard'
import { useIsMobile } from '../hooks/useIsMobile'

export function SearchPage({ onOpen, onStatus, onAddToData }) {
  const { T } = useTheme();
  const { t } = useTranslation();
  const isMobile = useIsMobile()
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      searchAnime(query)
        .then(items => {
          setResults(items);
          items.forEach(onAddToData);
        })
        .catch(() => setError(t('search.error')))
        .finally(() => setLoading(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="fu" style={{paddingTop:32,paddingBottom:48}}>
      <h2 style={{fontSize:26,fontWeight:700,color:T.txt,letterSpacing:"-.02em",marginBottom:22}}>
        {t('search.title')}
      </h2>

      <div style={{position:"relative",maxWidth:isMobile?"100%":560,marginBottom:28}}>
        <input value={query} onChange={e=>setQuery(e.target.value)}
          placeholder={t('search.placeholder')}
          style={{width:"100%",padding:"14px 20px 14px 46px",borderRadius:14,
            background:T.surf,border:`1px solid ${T.bord}`,color:T.txt,fontSize:16,outline:"none",
            boxShadow:`0 2px 12px rgba(0,0,0,${T.dark?.12:.06})`}}
          onFocus={e=>e.target.style.boxShadow="0 0 0 3px rgba(10,132,255,.25)"}
          onBlur={e=>e.target.style.boxShadow=`0 2px 12px rgba(0,0,0,${T.dark?.12:.06})`}/>
        <span style={{position:"absolute",left:15,top:"50%",transform:"translateY(-50%)",
          fontSize:18,color:T.sub,lineHeight:1}}>⌕</span>
        {query&&(
          <button onClick={()=>setQuery("")}
            style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",
              width:20,height:20,borderRadius:"50%",border:"none",background:T.surf2,
              color:T.sub,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        )}
      </div>

      {loading&&(
        <div style={{display:"flex",justifyContent:"center",padding:"60px 0"}}>
          <div style={{width:28,height:28,borderRadius:"50%",border:`3px solid ${T.bord}`,
            borderTopColor:"#0A84FF",animation:"spin .7s linear infinite"}}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {error&&!loading&&(
        <p style={{textAlign:"center",color:"#FF3B30",fontSize:14,padding:"40px 0"}}>{error}</p>
      )}

      {!loading&&!error&&query&&results.length===0&&(
        <div style={{textAlign:"center",padding:"60px 20px"}}>
          <p style={{fontSize:44,marginBottom:14,opacity:.18}}>⊘</p>
          <p style={{fontSize:16,color:T.sub}}>{t('search.noResults', { query })}</p>
        </div>
      )}

      {!loading&&!query&&(
        <div style={{textAlign:"center",padding:"60px 20px"}}>
          <p style={{fontSize:44,marginBottom:14,opacity:.12}}>⌕</p>
          <p style={{fontSize:16,color:T.sub}}>{t('search.hint')}</p>
        </div>
      )}

      {!loading&&results.length>0&&(
        <>
          <p style={{fontSize:13,color:T.sub,marginBottom:18}}>
            {t('search.results', { count: results.length, query })}
          </p>
          <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isMobile?140:190}px,1fr))`,gap:18}}>
            {results.map((it,i)=>(
              <MediaCard key={it.id} item={it} delay={i*30} onOpen={onOpen} onStatus={onStatus}/>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
