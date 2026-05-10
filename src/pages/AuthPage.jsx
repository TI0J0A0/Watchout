import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useClickOutside } from '../hooks/useClickOutside'

const MODES = { login: 'login', signup: 'signup', reset: 'reset' }

export function AuthPage({ onClose }) {
  const { T, dark } = useTheme()
  const { signIn, signUp, resetPassword } = useAuth()
  const { t } = useTranslation()
  const [mode, setMode]         = useState(MODES.login)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const boxRef = useRef(null)
  useClickOutside(boxRef, onClose)

  const reset = () => { setError(''); setSuccess('') }

  async function handleSubmit(e) {
    e.preventDefault()
    reset()
    if (mode === MODES.signup && password !== confirm) {
      setError(t('auth.passwordMismatch'))
      return
    }
    setLoading(true)
    try {
      if (mode === MODES.login) {
        const { error: err } = await signIn(email, password)
        if (err) throw err
        onClose()
      } else if (mode === MODES.signup) {
        const { error: err } = await signUp(email, password)
        if (err) throw err
        setSuccess(t('auth.accountCreated'))
      } else {
        const { error: err } = await resetPassword(email)
        if (err) throw err
        setSuccess(t('auth.resetLinkSent', { email }))
      }
    } catch (err) {
      setError(translateError(err.message, t))
    } finally {
      setLoading(false)
    }
  }

  const titles = {
    login:  t('auth.signIn'),
    signup: t('auth.createAccount'),
    reset:  t('auth.resetPassword'),
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:2000,
      background:'rgba(0,0,0,.55)',backdropFilter:'blur(18px)',
      display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div ref={boxRef} className="sc" style={{
        position:'relative',
        width:'100%',maxWidth:400,
        background:T.surf,borderRadius:24,
        padding:'32px 28px',
        boxShadow:`0 32px 80px rgba(0,0,0,${dark ? .6 : .22})`}}>

        {/* Logo */}
        <div style={{display:'flex',justifyContent:'center',marginBottom:24}}>
          <div style={{width:40,height:40,borderRadius:10,
            background:'linear-gradient(135deg,#0A84FF,#BF5AF2)',
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontSize:20,fontWeight:800,color:'#fff',lineHeight:1}}>w</span>
          </div>
        </div>

        <h2 style={{fontSize:22,fontWeight:700,color:T.txt,textAlign:'center',
          letterSpacing:'-.02em',marginBottom:6}}>
          {titles[mode]}
        </h2>
        <p style={{fontSize:13,color:T.sub,textAlign:'center',marginBottom:24}}>
          {mode === MODES.reset
            ? t('auth.resetHint')
            : mode === MODES.signup
            ? t('auth.createHint')
            : t('auth.welcomeBack')}
        </p>

        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:12}}>
          <input
            type="email" placeholder={t('auth.emailPlaceholder')} value={email}
            onChange={e => setEmail(e.target.value)} required
            style={inputStyle(T, dark)}
          />

          {mode !== MODES.reset && (
            <input
              type="password" placeholder={t('auth.passwordPlaceholder')} value={password}
              onChange={e => setPassword(e.target.value)} required
              style={inputStyle(T, dark)}
            />
          )}

          {mode === MODES.signup && (
            <input
              type="password" placeholder={t('auth.confirmPasswordPlaceholder')} value={confirm}
              onChange={e => setConfirm(e.target.value)} required
              style={inputStyle(T, dark)}
            />
          )}

          {error && (
            <div style={{padding:'10px 14px',borderRadius:10,
              background:'rgba(255,59,48,.12)',
              border:'1px solid rgba(255,59,48,.25)',
              color:'#FF3B30',fontSize:13}}>
              {error}
            </div>
          )}

          {success && (
            <div style={{padding:'10px 14px',borderRadius:10,
              background:'rgba(52,199,89,.12)',
              border:'1px solid rgba(52,199,89,.25)',
              color:'#34C759',fontSize:13}}>
              {success}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{marginTop:4,padding:'13px',borderRadius:14,border:'none',
              background: loading ? T.surf2 : 'linear-gradient(135deg,#0A84FF,#BF5AF2)',
              color: loading ? T.sub : '#fff',
              fontSize:15,fontWeight:600,cursor: loading ? 'default' : 'pointer',
              transition:'opacity .2s'}}>
            {loading ? t('auth.loading') : titles[mode]}
          </button>
        </form>

        {/* Footer links */}
        <div style={{marginTop:18,display:'flex',flexDirection:'column',gap:8,alignItems:'center'}}>
          {mode === MODES.login && (
            <>
              <button className="t" onClick={() => { setMode(MODES.reset); reset() }}
                style={linkStyle(T)}>
                {t('auth.forgotPassword')}
              </button>
              <span style={{fontSize:13,color:T.sub}}>
                {t('auth.noAccount')}{' '}
                <button className="t" onClick={() => { setMode(MODES.signup); reset() }}
                  style={{...linkStyle(T), display:'inline', fontWeight:600}}>
                  {t('auth.createAccount')}
                </button>
              </span>
            </>
          )}
          {mode === MODES.signup && (
            <span style={{fontSize:13,color:T.sub}}>
              {t('auth.haveAccount')}{' '}
              <button className="t" onClick={() => { setMode(MODES.login); reset() }}
                style={{...linkStyle(T), display:'inline', fontWeight:600}}>
                {t('auth.signIn')}
              </button>
            </span>
          )}
          {mode === MODES.reset && (
            <button className="t" onClick={() => { setMode(MODES.login); reset() }}
              style={linkStyle(T)}>
              {t('auth.backToLogin')}
            </button>
          )}
        </div>

        <button onClick={onClose} style={{position:'absolute',top:16,right:16,
          width:28,height:28,borderRadius:'50%',border:'none',
          background:T.surf2,color:T.sub,fontSize:12,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center'}}>
          ✕
        </button>
      </div>
    </div>
  )
}

function inputStyle(T, dark) {
  return {
    padding:'12px 14px',borderRadius:12,fontSize:14,
    background: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.05)',
    border: `1px solid ${T.bord}`,
    color: T.txt,
    outline:'none',
  }
}

function linkStyle(T) {
  return {
    background:'transparent',border:'none',color:'#0A84FF',
    fontSize:13,cursor:'pointer',padding:0,
  }
}

function translateError(msg, t) {
  if (!msg) return t('auth.errors.unknown')
  if (msg.includes('Invalid login credentials')) return t('auth.errors.invalidCredentials')
  if (msg.includes('Email not confirmed'))       return t('auth.errors.emailNotConfirmed')
  if (msg.includes('User already registered'))   return t('auth.errors.userAlreadyRegistered')
  if (msg.includes('Password should be'))        return t('auth.errors.passwordTooShort')
  if (msg.includes('rate limit'))                return t('auth.errors.rateLimit')
  return msg
}
