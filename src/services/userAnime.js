import { supabase } from './supabase'

function toRow(userId, item) {
  return {
    user_id:     userId,
    anime_id:    item.id,
    title:       item.title,
    img:         item.img,
    type:        item.type,
    eps:         item.eps,
    duration:    item.duration,
    score:       item.score,
    color:       item.color,
    color_b:     item.colorB,
    genres:      item.genres,
    studio:      item.studio,
    year:        item.year,
    airing:      item.airing,
    air_day:     item.airDay,
    synopsis:    item.synopsis,
    streaming:   item.streaming,
    members:     item.members,
    status:      item.userStatus,
    user_score:  item.userScore,
    ep_progress: item.userEp || 0,
    notes:       item.userNotes || '',
    updated_at:  new Date().toISOString(),
  }
}

function fromRow(row) {
  return {
    id:         row.anime_id,
    title:      row.title,
    img:        row.img,
    type:       row.type,
    eps:        row.eps,
    duration:   row.duration,
    score:      row.score,
    color:      row.color,
    colorB:     row.color_b,
    genres:     row.genres || [],
    studio:     row.studio,
    year:       row.year,
    airing:     row.airing,
    airDay:     row.air_day,
    synopsis:   row.synopsis,
    streaming:  row.streaming || [],
    members:    row.members,
    userStatus: row.status,
    userScore:  row.user_score,
    userEp:     row.ep_progress || 0,
    userNotes:  row.notes || '',
  }
}

export async function loadUserLibrary() {
  if (!supabase) return []
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('user_anime')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
  if (error) throw error
  // Deduplicate by anime_id in case DB has stale duplicate rows
  const seen = new Set()
  const unique = data.filter(row => {
    if (seen.has(row.anime_id)) return false
    seen.add(row.anime_id)
    return true
  })
  return unique.map(fromRow)
}

export async function upsertAnime(userId, item) {
  if (!supabase) return
  const { error } = await supabase
    .from('user_anime')
    .upsert(toRow(userId, item), { onConflict: 'user_id,anime_id' })
  if (error) throw error
}

export async function upsertAnimesBatch(userId, items) {
  if (!supabase || items.length === 0) return
  const CHUNK = 50
  for (let i = 0; i < items.length; i += CHUNK) {
    const rows = items.slice(i, i + CHUNK).map(item => toRow(userId, item))
    const { error } = await supabase
      .from('user_anime')
      .upsert(rows, { onConflict: 'user_id,anime_id' })
    if (error) throw error
  }
}

export async function removeAnime(userId, animeId) {
  if (!supabase) return
  const { error } = await supabase
    .from('user_anime')
    .delete()
    .eq('user_id', userId)
    .eq('anime_id', animeId)
  if (error) throw error
}

export async function loadFriendLibrary(userId) {
  if (!supabase) return []
  const { data } = await supabase
    .from('user_anime')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  return (data ?? []).map(fromRow)
}
