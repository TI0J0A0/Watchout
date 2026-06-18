// Pure helpers for the release calendar — turn an AniList `airingAt`
// (unix seconds) into a local weekday, clock time and countdown.

import { DAYS } from '../constants/index.js'

// Local weekday key ("Sun".."Sat") for an airingAt, or null.
export function airingDayKey(airingAt) {
  if (airingAt == null) return null
  return DAYS[new Date(airingAt * 1000).getDay()]
}

// "21:30" in the user's timezone (24h). Locale only affects separators.
export function formatClock(airingAt, locale) {
  if (airingAt == null) return null
  return new Date(airingAt * 1000)
    .toLocaleTimeString(locale || undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}

// Seconds until airing (negative once it has aired).
export function secondsUntil(airingAt, nowMs = Date.now()) {
  if (airingAt == null) return null
  return airingAt - Math.floor(nowMs / 1000)
}

// True if the episode already aired (airingAt is in the past).
export function hasAired(airingAt, nowMs = Date.now()) {
  const s = secondsUntil(airingAt, nowMs)
  return s != null && s <= 0
}

// Structured countdown for i18n formatting in the component.
// Returns { state: 'aired' | 'min' | 'hours' | 'days', h, m, d } or null.
export function countdownParts(airingAt, nowMs = Date.now()) {
  const diff = secondsUntil(airingAt, nowMs)
  if (diff == null) return null
  if (diff <= 0) return { state: 'aired' }
  if (diff < 3600) return { state: 'min', m: Math.floor(diff / 60) }
  if (diff < 24 * 3600) return { state: 'hours', h: Math.floor(diff / 3600), m: Math.floor((diff % 3600) / 60) }
  return { state: 'days', d: Math.floor(diff / (24 * 3600)) }
}

// Sort comparator for items within a day: timed entries first (ascending by
// time), untimed entries last (alphabetical by title).
export function compareAiring(a, b) {
  const aw = a.airingAt, bw = b.airingAt
  if (aw != null && bw != null) return aw - bw
  if (aw != null) return -1
  if (bw != null) return 1
  return (a.title || '').localeCompare(b.title || '')
}
