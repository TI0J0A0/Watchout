import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'tvMode'

const TvModeContext = createContext(null)

function readStoredValue() {
  if (typeof window === 'undefined') return false

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'false') === true
  } catch {
    return false
  }
}

export function TvModeProvider({ children }) {
  const [isTvMode, setIsTvMode] = useState(readStoredValue)

  useEffect(() => {
    if (typeof window === 'undefined') return

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(isTvMode))
    document.body.classList.toggle('tv-mode', isTvMode)
    document.documentElement.classList.toggle('tv-mode', isTvMode)
  }, [isTvMode])

  const value = useMemo(() => ({
    isTvMode,
    setIsTvMode,
    toggleTvMode: () => setIsTvMode(prev => !prev),
  }), [isTvMode])

  return (
    <TvModeContext.Provider value={value}>
      {children}
    </TvModeContext.Provider>
  )
}

export function useTvMode() {
  const context = useContext(TvModeContext)

  if (!context) {
    throw new Error('useTvMode must be used within a TvModeProvider')
  }

  return context
}
