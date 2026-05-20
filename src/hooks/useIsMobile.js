import { useState, useEffect } from 'react'

const MOBILE_QUERY = '(max-width: 640px)'

function readMobileMatch() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(MOBILE_QUERY).matches
}

export function useIsMobile() {
  const [mobile, setMobile] = useState(readMobileMatch)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const query = window.matchMedia(MOBILE_QUERY)
    const update = event => setMobile(event.matches)
    setMobile(query.matches)
    if (query.addEventListener) {
      query.addEventListener('change', update)
      return () => query.removeEventListener('change', update)
    }
    query.addListener(update)
    return () => query.removeListener(update)
  }, [])

  return mobile
}
