import { supabase } from './supabase'

export async function fetchExactCount(table, applyQuery = query => query) {
  if (!supabase) return 0
  const { count, error } = await applyQuery(
    supabase.from(table).select('id', { count: 'exact', head: true })
  )
  if (error) throw error
  return count ?? 0
}

export function incrementCounter(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount)
}

export function mapById(items, key = 'id') {
  return new Map((items ?? []).map(item => [item[key], item]))
}

export function sortByNumericFieldsDesc(a, b, fields) {
  for (const field of fields) {
    const diff = (b[field] ?? 0) - (a[field] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}
