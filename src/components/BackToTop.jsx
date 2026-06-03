import { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'

export function BackToTop() {
  const { T, dark } = useTheme()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      setVisible(window.scrollY > 600)
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={scrollTop}
      className="back-to-top t"
      style={{
        position: 'fixed',
        right: 20,
        bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        zIndex: 180,
        width: 44, height: 44, borderRadius: '50%',
        border: `1px solid ${dark ? 'rgba(255,255,255,.12)' : T.bord}`,
        background: dark ? 'rgba(20,20,28,.82)' : 'rgba(255,255,255,.92)',
        color: '#A78BFA',
        backdropFilter: 'blur(14px) saturate(160%)',
        boxShadow: '0 10px 30px rgba(0,0,0,.28)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        pointerEvents: visible ? 'auto' : 'none',
        cursor: 'pointer',
        transition: 'opacity .25s ease, transform .25s ease, background .2s ease',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  )
}
