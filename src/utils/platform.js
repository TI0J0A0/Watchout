// Detects whether the SPA is running inside the native Android TV wrapper.
// The wrapper sets a window flag (after page start) AND tags the User-Agent
// (available synchronously at first render), so we check both.

export function isAndroidTV() {
  if (typeof window === 'undefined') return false
  if (window.__IS_ANDROID_TV__ === true) return true
  return /AndroidTV/i.test(navigator.userAgent || '')
}
