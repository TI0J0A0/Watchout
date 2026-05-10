import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SM } from '../constants'
import { fmtTime } from '../utils'
import { useTheme } from '../context/ThemeContext'
import { MediaCard } from '../components/MediaCard'
import { StatBox } from '../components/StatBox'
import { useIsMobile } from '../hooks/useIsMobile'

export function LibraryPage({
  lib, library, libF, setLibF, libSort, setLibSort,
  watchedEps, watchTimeMin, avgScore,
  onOpen, onStatus,
}) {
  const { T } = useTheme();
  const { t } = useTranslation();
  const isMobile = useIsMobile()
  const [search, setSearch] = useState('');
  const displayed = search.trim()
    ? lib.filter(i => i.title.toLowerCase().includes(search.toLowerCase()))
    : lib;
  return (
    <div className="fu" style={{paddingTop:32,paddingBottom:48}}>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <p style={{fontSize:13,color:T.sub,marginBottom:3}}>{t('library.subtitle')}</p>
        <h2 style={{fontSize:26,fontWeight:700,color:T.txt,letterSpacing:"-.02em"}}>{t('library.title')}</h2>
      </div>

      {/* Stats cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",
        gap:12,marginBottom:28}}>
        <StatBox fill label={t('library.titles')}   val={library.length || "—"} color="#0A84FF" icon="📚"/>
        <StatBox fill label={t('library.episodes')} val={watchedEps    || "—"} color="#34C759" icon="▶"/>
        <StatBox fill label={t('library.time')}     val={fmtTime(watchTimeMin)} color="#BF5AF2" icon="⏱"/>
        <StatBox fill label={t('library.avgScore')} val={avgScore}              color="#FF9F0A" icon="★"/>
      </div>

      {/* Search */}
      <div style={{marginBottom:16}}>
        <input
          type="text" placeholder={t('library.searchPlaceholder')}
          value={search} onChange={e=>setSearch(e.target.value)}
          style={{width:"100%",padding:"10px 14px",borderRadius:12,fontSize:14,
            background:T.dark?"rgba(255,255,255,.07)":"rgba(0,0,0,.05)",
            border:`1px solid ${T.bord}`,color:T.txt,outline:"none",
            fontFamily:"inherit",boxSizing:"border-box"}}
        />
      </div>

      {/* Filters + sort */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:24,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",gap:6,flexWrap:isMobile?"nowrap":"wrap",overflowX:isMobile?"auto":"visible",scrollbarWidth:"none",paddingBottom:isMobile?4:0}}>
          {[["all", t('library.filterAll')], ...Object.keys(SM).map(s=>[s, t(`status.${s}`)])].map(([v,l])=>(
            <button key={v} className="pill t" onClick={()=>setLibF(v)}
              style={{padding:"6px 14px",borderRadius:22,fontSize:13,fontWeight:500,border:"none",
                background:libF===v?(T.dark?"#3A3A3C":"#1D1D1F"):T.surf2,
                color:libF===v?"#fff":T.sub}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:6}}>
          {[["title", t('library.sortAZ')], ["score", t('library.sortScore')], ["myscore", t('library.sortMyScore')]].map(([v,l])=>(
            <button key={v} className="pill t" onClick={()=>setLibSort(v)}
              style={{padding:"5px 12px",borderRadius:22,fontSize:12,fontWeight:500,
                border:`1px solid ${T.bord}`,
                background:libSort===v?T.surf2:"transparent",
                color:libSort===v?T.txt:T.sub}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {displayed.length===0 ? (
        <div style={{textAlign:"center",padding:"80px 20px"}}>
          <p style={{fontSize:44,marginBottom:14,opacity:.18}}>⊘</p>
          <p style={{fontSize:19,fontWeight:700,color:T.txt,marginBottom:8}}>
            {search.trim() ? t('library.noResults') : t('library.noTitles')}
          </p>
          <p style={{fontSize:14,color:T.sub}}>
            {search.trim() ? t('library.noResultsFor', { search }) : t('library.explorePrompt')}
          </p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isMobile?140:190}px,1fr))`,gap:18}}>
          {displayed.map((it,i)=>(
            <MediaCard key={it.id} item={it} delay={i*35} onOpen={onOpen} onStatus={onStatus}/>
          ))}
        </div>
      )}
    </div>
  );
}
