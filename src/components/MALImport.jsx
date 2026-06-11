import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'

const S_COLOR = {
  'watching':      '#34C759',
  'completed':     '#BF5AF2',
  'plan_to_watch': '#0A84FF',
  'dropped':       '#FF3B30',
}

const STATUS_MAP = {
  'Watching':      'watching',
  'Completed':     'completed',
  'On-Hold':       'watching',
  'Dropped':       'dropped',
  'Plan to Watch': 'plan_to_watch',
}

const PALETTES = [
  ['#FF6B35','#FF9A5C'],['#5856D6','#AF52DE'],['#34AADC','#5AC8FA'],
  ['#30B0C7','#64D2FF'],['#FF9F0A','#FFD60A'],['#BF5AF2','#DA8FFF'],
  ['#32ADE6','#5AC8FA'],['#FF2D55','#FF6B81'],['#34C759','#30D158'],
  ['#636366','#98989D'],
]

function parseMALXML(xmlText, t) {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml')
  if (doc.querySelector('parsererror')) throw new Error('invalid xml')
  const entries = Array.from(doc.querySelectorAll('anime'))
  if (entries.length === 0) throw new Error('no anime entries')
  const allItems = entries.map(a => {
    const id   = parseInt(a.querySelector('series_animedb_id')?.textContent || '0')
    const [color, colorB] = PALETTES[id % PALETTES.length]
    const type = a.querySelector('series_type')?.textContent === 'Movie' ? 'film' : 'anime'
    const status = STATUS_MAP[a.querySelector('my_status')?.textContent] || null
    return {
      id, type, color, colorB,
      title:      a.querySelector('series_title')?.textContent || '',
      eps:        parseInt(a.querySelector('series_episodes')?.textContent) || null,
      score:      0, studio:'—', year:'',
      genres:     [], airing:false, airDay:null, duration:24,
      img:'', synopsis:'', streaming:[], members:0, trailer:null,
      userStatus: status,
      userScore:  parseInt(a.querySelector('my_score')?.textContent) || null,
      userEp:     parseInt(a.querySelector('my_watched_episodes')?.textContent) || 0,
      userNotes:  '',
    }
  }).filter(i => i.id > 0 && i.userStatus)
  return [...new Map(allItems.map(i => [i.id, i])).values()]
}

export function MALImport({ onImport, onClose }) {
  const { T, dark } = useTheme()
  const { t } = useTranslation()
  const [step,      setStep]      = useState('idle')
  const [items,     setItems]     = useState([])
  const [errMsg,    setErrMsg]    = useState('')
  const [drag,      setDrag]      = useState(false)
  const [importing, setImporting] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    try {
      let text
      if (file.name.endsWith('.gz')) {
        const stream = file.stream().pipeThrough(new DecompressionStream('gzip'))
        text = await new Response(stream).text()
      } else {
        text = await file.text()
      }
      const parsed = parseMALXML(text, t)
      if (parsed.length === 0) { setErrMsg(t('mal.noStatus')); setStep('error'); return }
      setItems(parsed)
      setStep('preview')
    } catch {
      setErrMsg(t('mal.invalidFile'))
      setStep('error')
    }
  }

  const grouped = items.reduce((acc, i) => {
    const s = i.userStatus || 'unknown'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{position:'fixed',inset:0,zIndex:500,display:'flex',
      alignItems:'center',justifyContent:'center',
      background:'rgba(0,0,0,.6)',backdropFilter:'blur(8px)'}}
      onClick={onClose}>
      <div className="sc" style={{background:T.surf,borderRadius:20,padding:28,
        width:'100%',maxWidth:440,margin:'0 16px',
        maxHeight:'min(86vh, 86dvh)',overflowY:'auto',
        border:`1px solid ${T.bord}`,
        boxShadow:`0 24px 80px rgba(0,0,0,${dark?.5:.2})`}}
        onClick={e => e.stopPropagation()}>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <h2 style={{fontSize:17,fontWeight:700,color:T.txt}}>{t('mal.title')}</h2>
            <p style={{fontSize:13,color:T.sub,marginTop:3}}>{t('mal.subtitle')}</p>
          </div>
          <button className="t" onClick={onClose}
            style={{width:30,height:30,borderRadius:'50%',border:'none',
              background:T.surf2,color:T.sub,fontSize:18,display:'flex',
              alignItems:'center',justifyContent:'center'}}>×</button>
        </div>

        {step === 'idle' && (
          <>
            <div style={{background:T.surf2,borderRadius:14,padding:14,marginBottom:16}}>
              <p style={{fontSize:11,fontWeight:700,color:T.sub,letterSpacing:'.06em',marginBottom:10}}>
                {t('mal.howToExport')}
              </p>
              {[t('mal.step1'), t('mal.step2'), t('mal.step3'), t('mal.step4')].map((s, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,
                  marginBottom: i < 3 ? 8 : 0}}>
                  <span style={{width:20,height:20,borderRadius:'50%',background:'#0A84FF',
                    color:'#fff',fontSize:11,fontWeight:700,flexShrink:0,
                    display:'flex',alignItems:'center',justifyContent:'center'}}>{i+1}</span>
                  <span style={{fontSize:13,color:T.txt}}>{s}</span>
                </div>
              ))}
            </div>

            <label style={{display:'block',cursor:'pointer'}}
              onDragOver={e => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}>
              <input type="file" accept=".xml,.gz" style={{display:'none'}}
                onChange={e => handleFile(e.target.files[0])}/>
              <div style={{border:`2px dashed ${drag ? '#0A84FF' : T.bord}`,borderRadius:14,
                padding:'28px 20px',textAlign:'center',
                background: drag ? 'rgba(10,132,255,.06)' : 'transparent',
                transition:'all .2s'}}>
                <div style={{fontSize:32,marginBottom:8}}>📁</div>
                <p style={{fontSize:14,fontWeight:600,color:T.txt,marginBottom:4}}>
                  {t('mal.dropzone')}
                </p>
                <p style={{fontSize:12,color:T.sub}}>{t('mal.dropzoneHint')}</p>
              </div>
            </label>
          </>
        )}

        {step === 'preview' && (
          <>
            <div style={{background:T.surf2,borderRadius:14,padding:16,marginBottom:20}}>
              <p style={{fontSize:15,fontWeight:600,color:T.txt,marginBottom:14}}>
                {t('mal.found', { count: items.length })}
              </p>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {Object.entries(grouped).map(([status, count]) => (
                  <div key={status} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{width:8,height:8,borderRadius:'50%',flexShrink:0,
                        background:S_COLOR[status]||T.sub}}/>
                      <span style={{fontSize:13,color:T.txt}}>{t(`status.${status}`, status)}</span>
                    </div>
                    <span style={{fontSize:13,fontWeight:600,color:T.sub}}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:'flex',gap:10}}>
              <button className="t" onClick={() => setStep('idle')}
                style={{flex:1,padding:'11px 0',borderRadius:14,
                  border:`1px solid ${T.bord}`,background:'transparent',
                  color:T.txt,fontSize:14,fontWeight:500,cursor:'pointer'}}>
                {t('mal.cancel')}
              </button>
              <button className="t" disabled={importing}
                onClick={async () => {
                  setImporting(true)
                  try {
                    await onImport(items)
                    setStep('done')
                  } catch (e) {
                    setErrMsg(t('mal.saveError', { error: e?.message || t('mal.retry') }))
                    setStep('error')
                  } finally {
                    setImporting(false)
                  }
                }}
                style={{flex:2,padding:'11px 0',borderRadius:14,
                  border:'none',
                  background: importing ? '#555' : '#0A84FF',
                  color:'#fff',fontSize:14,fontWeight:600,cursor: importing ? 'default' : 'pointer'}}>
                {importing ? t('mal.importing') : t('mal.importAll')}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <div style={{textAlign:'center',padding:'16px 0 8px'}}>
            <div style={{fontSize:44,marginBottom:12}}>✓</div>
            <p style={{fontSize:15,fontWeight:600,color:T.txt,marginBottom:8}}>
              {t('mal.done')}
            </p>
            <p style={{fontSize:13,color:T.sub,marginBottom:20}}>
              {t('mal.doneMessage', { count: items.length })}
            </p>
            <button className="t" onClick={onClose}
              style={{padding:'11px 32px',borderRadius:14,
                border:'none',background:'#0A84FF',color:'#fff',
                fontSize:14,fontWeight:600,cursor:'pointer'}}>
              {t('mal.close')}
            </button>
          </div>
        )}

        {step === 'error' && (
          <div style={{textAlign:'center',padding:'16px 0 8px'}}>
            <div style={{fontSize:36,marginBottom:12}}>⚠</div>
            <p style={{fontSize:14,fontWeight:600,color:T.txt,marginBottom:8}}>{t('mal.error')}</p>
            <p style={{fontSize:13,color:T.sub,marginBottom:20}}>{errMsg}</p>
            <button className="t" onClick={() => setStep('idle')}
              style={{padding:'10px 24px',borderRadius:14,
                border:'none',background:T.surf2,color:T.txt,
                fontSize:14,fontWeight:500,cursor:'pointer'}}>
              {t('mal.retry')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
