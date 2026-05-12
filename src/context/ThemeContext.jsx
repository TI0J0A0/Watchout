import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const PALETTES = {
  dark: {
    bg:    '#050509',
    surf:  '#101018',
    surf2: '#151522',
    txt:   '#F8FAFC',
    sub:   '#A1A1AA',
    bord:  'rgba(255,255,255,.08)',
  },
  light: {
    bg:    '#F2F2F7',
    surf:  '#FFFFFF',
    surf2: '#E5E5EA',
    txt:   '#000000',
    sub:   '#6E6E73',
    bord:  'rgba(0,0,0,.1)',
  },
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(true)
  const palette = dark ? PALETTES.dark : PALETTES.light
  const T = { ...palette, dark }

  useEffect(() => {
    const root = document.documentElement
    Object.entries(palette).forEach(([k, v]) => root.style.setProperty(`--${k}`, v))
    root.style.colorScheme = dark ? 'dark' : 'light'
    root.classList.toggle('dark', dark)
  }, [dark])

  return (
    <ThemeContext.Provider value={{ T, dark, setDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
