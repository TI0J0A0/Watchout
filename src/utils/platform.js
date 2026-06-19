// Detects the runtime platform / form factor so the SPA can adapt navigation
// (D-pad spatial nav + 10-foot UI) for Android TV, Fire TV and Android projectors.
//
// Signals, in priority order:
//  1. Dev override — `?tv=1` / `?tv=0` in the URL, persisted to localStorage so it
//     survives the SPA's in-app navigation. Lets us preview TV mode in a desktop
//     browser WITHOUT building the native app.
//  2. The native wrapper's flag (`window.__IS_ANDROID_TV__`) and User-Agent tag
//     ("AndroidTV"), set by the Capacitor MainActivity on TV devices.
//  3. Heuristics for Fire TV (UA contains an "AFT…" model) and Android TV.

const TV_OVERRIDE_KEY = 'tvMode'

// Returns true/false when a dev override is active, or null when absent.
function readTvOverride() {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.has('tv')) {
      const raw = params.get('tv')
      const on = raw !== '0' && raw !== 'false'
      localStorage.setItem(TV_OVERRIDE_KEY, on ? '1' : '0')
      return on
    }
    const stored = localStorage.getItem(TV_OVERRIDE_KEY)
    if (stored === '1') return true
    if (stored === '0') return false
  } catch {}
  return null
}

export function isAndroid() {
  if (typeof window === 'undefined') return false
  if (window.__IS_ANDROID__ === true) return true
  return /Android/i.test(navigator.userAgent || '')
}

export function isAndroidTV() {
  if (typeof window === 'undefined') return false

  const override = readTvOverride()
  if (override !== null) return override

  if (window.__IS_ANDROID_TV__ === true) return true

  const ua = navigator.userAgent || ''
  // Native wrapper tag ("AndroidTV"), generic Android TV, or a Fire TV model code
  // (AFTMM, AFTKA, AFTT, …). The AFT check is case-sensitive to avoid matching
  // unrelated substrings.
  return /AndroidTV|Android TV/i.test(ua) || /\bAFT[A-Z0-9]/.test(ua)
}
