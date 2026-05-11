const BASE = 'https://api.aniskip.com/v2'

export async function fetchSkipTimes(malId, episode) {
  try {
    const res = await fetch(`${BASE}/skip-times/${malId}/${episode}?types[]=op&types[]=ed`)
    if (!res.ok) return { op: null, ed: null }
    const json = await res.json()
    if (!json.found) return { op: null, ed: null }
    const result = { op: null, ed: null }
    for (const entry of json.results) {
      if (entry.skipType === 'op') result.op = entry.interval  // { startTime, endTime }
      if (entry.skipType === 'ed') result.ed = entry.interval
    }
    return result
  } catch {
    return { op: null, ed: null }
  }
}
