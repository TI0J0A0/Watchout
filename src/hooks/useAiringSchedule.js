import { useState, useEffect } from 'react'
import { fetchAiringSchedule } from '../services/anilist'

// Fetches the weekly airing schedule from AniList once and returns a map keyed
// by MAL id → { airingAt, episode }, plus a loading flag. The schedule is the
// same for every anime, so this runs a single batched query regardless of how
// many titles the calendar shows.
export function useAiringSchedule(enabled = true) {
  const [schedule, setSchedule] = useState({})
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)

    // Retry a couple of times if we come back empty — the schedule always has
    // entries, so an empty result means the request was throttled/failed.
    const load = async (attempt = 0) => {
      const map = await fetchAiringSchedule().catch(() => ({}))
      if (cancelled) return
      if (Object.keys(map).length === 0 && attempt < 2) {
        setTimeout(() => { if (!cancelled) load(attempt + 1) }, 1500 * (attempt + 1))
        return
      }
      setSchedule(map)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [enabled])

  return { schedule, scheduleLoading: loading }
}
