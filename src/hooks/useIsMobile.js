import { useState, useEffect } from 'react'

const MOBILE_QUERY = '(max-width: 640px)'

// Single shared matchMedia listener for the whole app. Previously every
// MediaCard (50+ on a page) registered its own listener; now they all read
// from one source, with a single change handler fanning out to subscribers.
const subscribers = new Set()
let mql = null
let current = false

function readMatch() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(MOBILE_QUERY).matches
}

function ensureListener() {
  if (mql || typeof window === 'undefined' || !window.matchMedia) return
  mql = window.matchMedia(MOBILE_QUERY)
  current = mql.matches
  const handler = event => {
    current = event.matches
    subscribers.forEach(fn => fn(current))
  }
  if (mql.addEventListener) mql.addEventListener('change', handler)
  else mql.addListener(handler)
}

export function useIsMobile() {
  const [mobile, setMobile] = useState(readMatch)

  useEffect(() => {
    ensureListener()
    setMobile(current)
    subscribers.add(setMobile)
    return () => subscribers.delete(setMobile)
  }, [])

  return mobile
}
