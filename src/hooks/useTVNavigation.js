import { useEffect } from 'react'

/**
 * D-Pad spatial navigation for the Android TV wrapper.
 *
 * The SPA has no URL router and mounts/unmounts whole screens via state
 * (and React.lazy/Suspense). Rather than maintaining a static focus graph,
 * this hook recomputes focus targets **live on every key press** from the DOM,
 * so lazily-mounted shelves, the AnimePage overlay, etc. are always included
 * the moment they exist. Overlays push a "focus scope" so navigation is
 * trapped inside them and focus is restored when they close.
 */

// ── Focus scope stack ────────────────────────────────────────────────────────
// While a scope is on the stack, spatial nav is constrained to its subtree.
const scopeStack = [] // [{ el, prevFocus }]

function pushFocusScope(el) {
  if (!el) return
  scopeStack.push({ el, prevFocus: document.activeElement })
  requestAnimationFrame(() => getFocusables(el)[0]?.focus())
}

function popFocusScope(el) {
  const idx = scopeStack.findIndex(s => s.el === el)
  if (idx === -1) return
  const [scope] = scopeStack.splice(idx, 1)
  requestAnimationFrame(() => {
    if (scope.prevFocus && document.contains(scope.prevFocus)) scope.prevFocus.focus()
  })
}

function activeRoot() {
  for (let i = scopeStack.length - 1; i >= 0; i--) {
    if (document.contains(scopeStack[i].el)) return scopeStack[i].el
  }
  return document
}

// ── Focusable discovery ──────────────────────────────────────────────────────
const FOCUSABLE_SELECTOR = [
  '[data-focusable]',
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function isVisible(el) {
  const style = window.getComputedStyle(el)
  if (style.visibility === 'hidden' || style.display === 'none') return false
  const r = el.getBoundingClientRect()
  return r.width > 0 || r.height > 0
}

function getFocusables(root = activeRoot()) {
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isVisible)
}

// ── Geometry-based candidate selection ───────────────────────────────────────
function centerOf(el) {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

function pickInDirection(dir, current, candidates) {
  const c = centerOf(current)
  let best = null
  let bestScore = Infinity
  for (const el of candidates) {
    if (el === current) continue
    const t = centerOf(el)
    const dx = t.x - c.x
    const dy = t.y - c.y
    const horizontal = dir === 'ArrowLeft' || dir === 'ArrowRight'
    if (dir === 'ArrowRight' && dx <= 2) continue
    if (dir === 'ArrowLeft' && dx >= -2) continue
    if (dir === 'ArrowDown' && dy <= 2) continue
    if (dir === 'ArrowUp' && dy >= -2) continue
    const primary = horizontal ? Math.abs(dx) : Math.abs(dy)
    const cross = horizontal ? Math.abs(dy) : Math.abs(dx)
    // Strongly prefer staying in the same row/column.
    const score = primary + cross * 3
    if (score < bestScore) {
      bestScore = score
      best = el
    }
  }
  return best
}

const DIRECTIONS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

export function useTVNavigation(enabled) {
  useEffect(() => {
    if (!enabled) return
    document.documentElement.classList.add('tv-mode')

    function onKeyDown(e) {
      // Enter / DPAD-center: let the focused element activate natively.
      if (e.key === 'Enter' || e.key === ' ') return
      if (!DIRECTIONS.includes(e.key)) return

      const focusables = getFocusables()
      if (focusables.length === 0) return

      const current = document.activeElement
      if (!current || current === document.body || !focusables.includes(current)) {
        e.preventDefault()
        const first = focusables[0]
        first.focus()
        first.scrollIntoView({ block: 'nearest', inline: 'nearest' })
        return
      }

      const next = pickInDirection(e.key, current, focusables)
      if (next) {
        e.preventDefault()
        next.focus()
        next.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    // Give initial focus once the first screen has painted.
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) getFocusables()[0]?.focus()
    })

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.documentElement.classList.remove('tv-mode')
    }
  }, [enabled])
}

/**
 * Trap D-Pad focus inside an overlay (e.g. AnimePage) while it is mounted,
 * and restore focus to the previously-focused element when it unmounts.
 * No-op when `active` is false (so it costs nothing off-TV).
 */
export function useFocusScope(ref, active = true) {
  useEffect(() => {
    if (!active) return
    const el = ref.current
    if (!el) return
    pushFocusScope(el)
    return () => popFocusScope(el)
  }, [active, ref])
}
