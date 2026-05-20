const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled]):not([type="hidden"])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]',
].join(', ')

function isVisible(element) {
  if (!(element instanceof HTMLElement)) return false

  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') return false

  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function getRectCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

export function getTvFocusableElements() {
  return Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isVisible)
}

export function focusFirstTvElement() {
  const first = getTvFocusableElements()[0]
  first?.focus()
  return first
}

export function ensureTvElementVisible(element) {
  if (!(element instanceof HTMLElement)) return

  element.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
    behavior: 'smooth',
  })
}

export function moveTvFocus(direction) {
  const elements = getTvFocusableElements()
  if (!elements.length) return null

  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
  if (!active || !elements.includes(active)) {
    const first = focusFirstTvElement()
    ensureTvElementVisible(first)
    return first
  }

  const activeRect = active.getBoundingClientRect()
  const activeCenter = getRectCenter(activeRect)

  let best = null
  let bestScore = Number.POSITIVE_INFINITY

  for (const candidate of elements) {
    if (candidate === active) continue

    const rect = candidate.getBoundingClientRect()
    const center = getRectCenter(rect)
    const dx = center.x - activeCenter.x
    const dy = center.y - activeCenter.y

    if (direction === 'right' && dx <= 12) continue
    if (direction === 'left' && dx >= -12) continue
    if (direction === 'down' && dy <= 12) continue
    if (direction === 'up' && dy >= -12) continue

    const primary = direction === 'left' || direction === 'right' ? Math.abs(dx) : Math.abs(dy)
    const cross = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx)
    const overlapX = Math.max(0, Math.min(activeRect.right, rect.right) - Math.max(activeRect.left, rect.left))
    const overlapY = Math.max(0, Math.min(activeRect.bottom, rect.bottom) - Math.max(activeRect.top, rect.top))
    const overlapBonus = direction === 'left' || direction === 'right' ? overlapY : overlapX
    const score = primary + cross * 2.4 - overlapBonus * 0.35

    if (score < bestScore) {
      best = candidate
      bestScore = score
    }
  }

  if (!best) return active

  best.focus()
  ensureTvElementVisible(best)
  return best
}
