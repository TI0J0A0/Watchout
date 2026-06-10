import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useClickOutside } from '../hooks/useClickOutside'
import { AvatarPic } from './AvatarPic'
import { NotificationBell } from './NotificationBell'
import { isAdmin } from '../services/premium'
import funnyrollLogo from "../../img/Logo sem fundo.png";
import { GENRES } from '../constants/browse'

const PAGE_ICONS = {
  seasonal: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  top: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  calendar: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  library: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
    </svg>
  ),
  search: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  news: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/>
      <line x1="18" y1="14" x2="10" y2="14"/><line x1="15" y1="18" x2="10" y2="18"/><rect x="10" y="6" width="8" height="4"/>
    </svg>
  ),
  community: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  categories: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  seasons: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
      <line x1="4.9" y1="4.9" x2="7" y2="7"/><line x1="17" y1="17" x2="19.1" y2="19.1"/>
      <line x1="4.9" y1="19.1" x2="7" y2="17"/><line x1="17" y1="7" x2="19.1" y2="4.9"/>
    </svg>
  ),
}

export function Nav({ page, setPage, userProfile, onLogin, onShowMAL, onSelectCategory, onOpenNotificationAnime }) {
  const { T, dark, setDark } = useTheme()
  const { user, signOut }    = useAuth()
  const { t }                = useTranslation()
  const [menu, setMenu]      = useState(false)
  const [browseMenu, setBrowseMenu] = useState(null)
  const menuRef              = useRef(null)
  const browseRef            = useRef(null)
  useClickOutside(menuRef, () => setMenu(false))
  useClickOutside(browseRef, () => setBrowseMenu(null))

  const navigate = (nextPage) => {
    setPage(nextPage)
    setMenu(false)
    setBrowseMenu(null)
  }

  const PAGES = [
    ["seasonal",   t('nav.discover')],
    ["top",        t('nav.top')],
    ["seasons",    "Seasons"],
    ["calendar",   t('nav.calendar')],
    ["categories", "Categories"],
    ["search",     t('nav.search')],
    ["news",       t('nav.news')],
    ["community",  "Community"],
  ]

  const MOBILE_LABELS = {
    seasonal:   t('nav.discover'),
    top:        'Top',
    seasons:    'Seasons',
    calendar:   t('nav.calendar').slice(0, 6),
    categories: 'Categ.',
    search:     t('nav.search'),
    news:       t('nav.news'),
    community:  'Comm.',
  }

  const navButtonStyle = (active) => ({
    padding:"7px 14px", borderRadius:999, border:`1px solid ${active ? 'rgba(167,139,250,.36)' : 'transparent'}`, fontSize:13,
    whiteSpace:"nowrap", flexShrink:0,
    fontWeight: active ? 800 : 600,
    background: active ? "rgba(139,92,246,.18)" : "transparent",
    color: active ? "#A78BFA" : T.sub,
    cursor: "pointer",
  })
  const dropdownPanelStyle = {
    position:"absolute", top:"calc(100% + 8px)", left:0,
    background:T.surf, borderRadius:14, padding:6, zIndex:300, minWidth:220,
    border:`1px solid ${T.bord}`,
    boxShadow:`0 10px 40px rgba(0,0,0,${dark ? .4 : .14})`,
  }
  const dropdownItemStyle = {
    display:"flex", width:"100%", padding:"9px 12px", borderRadius:9,
    border:"none", cursor:"pointer", background:"transparent",
    color:T.txt, fontSize:13.5, fontWeight:500, alignItems:"center", gap:8,
    textAlign:"left",
  }
  return (
    <>
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:200,
      background:dark?"rgba(5,5,9,.92)":"rgba(245,245,247,.95)",
      backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)",
      transform:"translateZ(0)", willChange:"transform",
      borderBottom:`1px solid ${dark ? 'rgba(255,255,255,.08)' : T.bord}`,
      boxShadow: dark ? "0 14px 40px rgba(0,0,0,.22)" : "none"}}>
      <div style={{display:"flex",alignItems:"center",
        padding:"0 28px",height:56}}>

        {/* Logo */}
        <button type="button" aria-label="Go to Discover" onClick={() => navigate("seasonal")}
          style={{display:"flex",alignItems:"center",gap:9,marginRight:26,flexShrink:0,cursor:"pointer",
            border:"none",background:"transparent",padding:0}}>
          <img
            src={funnyrollLogo}
            alt="Funnyroll"
            style={{height:34,width:154,objectFit:"contain",objectPosition:"left center",display:"block"}}
          />
        </button>

        {/* Links */}
        <div ref={browseRef} className="hide-sm" style={{display:"flex",gap:2,flex:1,overflowX:"visible",scrollbarWidth:"none"}}>
          {PAGES.filter(([id])=>id!=="search" && id!=="categories").map(([id,l])=>(
            <button key={id} className="navbtn t" onClick={()=>navigate(id)}
              style={navButtonStyle(page===id)}>
              {l}
            </button>
          ))}

          <div style={{position:"relative",flexShrink:0}}>
            <button className="navbtn t" onClick={()=>setBrowseMenu(browseMenu === 'categories' ? null : 'categories')}
              style={navButtonStyle(page==="categories")}>
              Categories ▾
            </button>
            {browseMenu === 'categories' && (
              <div className="sc" style={{...dropdownPanelStyle, maxHeight:420, overflowY:"auto"}}>
                {GENRES.map(g => (
                  <button key={g.id} className="t rbtn" onClick={() => {
                    onSelectCategory?.(g.id)
                    setBrowseMenu(null)
                  }} style={dropdownItemStyle}>
                    <span style={{width:20,textAlign:"center"}}>{g.icon}</span> {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div style={{display:"flex",gap:8,alignItems:"center",marginLeft:8}}>
          {/* Search icon — desktop only */}
          <button className="t hbtn hide-sm" onClick={()=>navigate("search")}
            style={{width:34,height:34,borderRadius:"50%",border:`1px solid ${page==="search"?"#8B5CF6":T.bord}`,
              background:page==="search"?"rgba(139,92,246,.16)":T.surf,
              display:"flex",alignItems:"center",justifyContent:"center",
              flexShrink:0,color:page==="search"?"#A78BFA":T.sub}}>
            {PAGE_ICONS.search}
          </button>

          {user && <NotificationBell userId={user.id} onOpenAnime={onOpenNotificationAnime} />}

          {user ? (
            <div ref={menuRef} style={{position:"relative"}}>
              <button className="t" onClick={() => setMenu(!menu)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
                <AvatarPic
                  profile={userProfile ?? { username: user?.email?.slice(0, 2) ?? '?', avatar_grad: 0 }}
                  size={32}
                />
              </button>
              {menu&&(
                <div className="sc" style={{position:"absolute",top:"calc(100% + 8px)",right:0,
                  background:T.surf,borderRadius:14,padding:"6px",zIndex:300,minWidth:200,
                  border:`1px solid ${T.bord}`,
                  boxShadow: `0 10px 40px rgba(0,0,0,${dark ? .4 : .14})`}}>
                  <div style={{padding:"10px 12px",borderBottom:`1px solid ${T.bord}`,marginBottom:4}}>
                    <p style={{fontSize:11,color:T.sub,marginBottom:2}}>{t('nav.connectedAs')}</p>
                    <p style={{fontSize:13,fontWeight:600,color:T.txt,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:176}}>
                      {user.email}
                    </p>
                  </div>
                  <button className="t rbtn" onClick={()=>navigate("profile")}
                    style={{display:"flex",width:"100%",padding:"9px 12px",borderRadius:9,
                      border:"none",cursor:"pointer",background:"transparent",
                      color:T.txt,fontSize:13.5,fontWeight:500,alignItems:"center",gap:8}}>
                    <span style={{fontSize:15}}>◎</span> {t('nav.myProfile')}
                  </button>
                  <button className="t rbtn" onClick={()=>{onShowMAL?.();setMenu(false)}}
                    style={{display:"flex",width:"100%",padding:"9px 12px",borderRadius:9,
                      border:"none",cursor:"pointer",background:"transparent",
                      color:T.txt,fontSize:13.5,fontWeight:500,alignItems:"center",gap:8}}>
                    <span style={{fontSize:15}}>⇪</span> {t('nav.importMAL')}
                  </button>
                  {isAdmin(user) && (
                    <button className="t rbtn" onClick={() => navigate("admin")}
                      style={{ display:"flex", width:"100%", padding:"9px 12px", borderRadius:9,
                        border:"none", cursor:"pointer", background:"transparent",
                        color:"#FF9F0A", fontSize:13.5, fontWeight:600, alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:15 }}>⚙️</span> Painel Admin
                    </button>
                  )}
                  <button className="t" onClick={()=>{signOut();setMenu(false)}}
                    style={{display:"flex",width:"100%",padding:"9px 12px",borderRadius:9,
                      border:"none",cursor:"pointer",background:"transparent",
                      color:"#FF3B30",fontSize:13.5,fontWeight:500,alignItems:"center",gap:8}}>
                    <span style={{fontSize:15}}>→</span> {t('nav.signOut')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button className="t hbtn hide-sm" onClick={onLogin}
                style={{padding:"6px 14px",borderRadius:20,
                  fontSize:13,fontWeight:600,background:"#8B5CF6",color:"#fff",border:"none",flexShrink:0}}>
                {t('nav.signIn')}
              </button>
              <button className="t show-sm" onClick={onLogin}
                style={{width:32,height:32,borderRadius:"50%",border:"none",flexShrink:0,
                  background:"#8B5CF6",color:"#fff",fontSize:15,cursor:"pointer",
                  alignItems:"center",justifyContent:"center"}}>
                ↗
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
    <div aria-hidden="true" className="nav-spacer" />


    {/* Mobile bottom tab bar */}
    <div className="mobile-nav" style={{
      background: dark ? 'rgba(5,5,9,.94)' : 'rgba(245,245,247,.98)',
      borderTop: `1px solid ${dark ? 'rgba(255,255,255,.08)' : T.bord}`,
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    }}>
      {PAGES.map(([id, label]) => {
        const active = page === id
        return (
          <button key={id} className="t nav-tab" aria-current={active ? 'page' : undefined} onClick={() => navigate(id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 4, padding: '8px 4px 6px',
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: active ? '#A78BFA' : T.sub, position: 'relative',
              minHeight: 60,
            }}>
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 20, height: 3, borderRadius: '0 0 3px 3px', background: '#8B5CF6',
              }}/>
            )}
            <span style={{ lineHeight: 1, opacity: active ? 1 : 0.65 }}>{PAGE_ICONS[id]}</span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, lineHeight: 1.3, letterSpacing: '.01em' }}>
              {MOBILE_LABELS[id]}
            </span>
          </button>
        )
      })}
    </div>
    </>
  );
}
