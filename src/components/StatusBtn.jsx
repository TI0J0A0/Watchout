import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { SM } from '../constants'
import { useClickOutside } from '../hooks/useClickOutside'
import { useTheme } from '../context/ThemeContext'

export function StatusBtn({ item, onStatus }) {
  const { T } = useTheme();
  const { t } = useTranslation();
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setMenu(false));
  const sm = SM[item.userStatus];

  return (
    <div ref={ref} style={{position:"relative"}}>
      <button className="t" onClick={e=>{e.stopPropagation();setMenu(!menu)}}
        style={{width:"100%",padding:"7px 10px",borderRadius:10,border:"none",fontSize:12,fontWeight:600,
          background:sm?`${sm.dot}18`:T.surf2,
          color:sm?sm.color:T.sub,
          outline:`1.5px solid ${sm?sm.dot+"30":T.bord}`}}>
        {sm ? t(`status.${item.userStatus}`) : t('common.addToList')}
      </button>
      {menu&&(
        <div className="sc" onClick={e=>e.stopPropagation()} style={{
          position:"absolute",top:"calc(100% + 6px)",left:0,right:0,zIndex:80,
          background:T.dark?"#1C1C1E":"#fff",borderRadius:12,padding:6,
          border:`1px solid ${T.bord}`,
          boxShadow:`0 8px 32px rgba(0,0,0,${T.dark?.4:.12})`}}>
          {Object.entries(SM).map(([s,m])=>(
            <button key={s} className="t" onClick={()=>{onStatus(item.id,s);setMenu(false)}}
              style={{display:"flex",width:"100%",padding:"7px 10px",borderRadius:8,border:"none",
                background:item.userStatus===s?`${m.dot}14`:"transparent",
                color:m.color,fontSize:12.5,fontWeight:500,gap:8,alignItems:"center",
                textAlign:"left",cursor:"pointer"}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:m.dot,flexShrink:0}}/>
              {t(`status.${s}`)}
            </button>
          ))}
          {item.userStatus&&(
            <button className="t" onClick={()=>{onStatus(item.id,item.userStatus);setMenu(false)}}
              style={{display:"block",width:"100%",padding:"7px 10px",borderRadius:8,border:"none",
                background:"transparent",color:T.sub,fontSize:12,fontWeight:500,textAlign:"left",
                cursor:"pointer",marginTop:2,borderTop:`1px solid ${T.bord}`}}>
              {t('common.removeFromList')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
