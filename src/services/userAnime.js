import { supabase } from './supabase'

function toAnimeRow(item) {
  return {
    id:        item.id,
    title:     item.title,
    img:       item.img,
    type:      item.type,
    eps:       item.eps,
    duration:  item.duration,
    score:     item.score,
    color:     item.color,
    color_b:   item.colorB,
    genres:    item.genres,
    studio:    item.studio,
    year:      item.year,
    airing:    item.airing,
    air_day:   item.airDay,
    synopsis:  item.synopsis,
    streaming: item.streaming,
    members:   item.members,
    updated_at: new Date().toISOString(),
  }
}

function toUserAnimeRow(userId, item) {
  return {
    user_id:     userId,
    anime_id:    item.id,
    status:      item.userStatus,
    user_score:  item.userScore,
    ep_progress: item.userEp || 0,
    notes:       item.userNotes || '',
    updated_at:  new Date().toISOString(),
  }
}

function fromRow(row) {
  // row.animes is populated after split migration; fall back to row columns if null
  const a = row.animes || row
  return {
    id:         row.anime_id,
    title:      a.title,
    img:        a.img,
    type:       a.type,
    eps:        a.eps,
    duration:   a.duration,
    score:      a.score,
    color:      a.color,
    colorB:     a.color_b,
    genres:     a.genres || [],
    studio:     a.studio,
    year:       a.year,
    airing:     a.airing,
    airDay:     a.air_day,
    synopsis:   a.synopsis,
    streaming:  a.streaming || [],
    members:    a.members,
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
    .select('*, animes(*)')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
  if (error) throw error
  const seen = new Set()
  return data.filter(row => {
    if (seen.has(row.anime_id)) return false
    seen.add(row.anime_id)
    return true
  }).map(fromRow)
}

export async function upsertAnime(userId, item) {
  if (!supabase) return
  const { error: e1 } = await supabase
    .from('animes')
    .upsert(toAnimeRow(item), { onConflict: 'id' })
  if (e1) throw e1
  const { error: e2 } = await supabase
    .from('user_anime')
    .upsert(toUserAnimeRow(userId, item), { onConflict: 'user_id,anime_id' })
  if (e2) throw e2
}

export async function upsertAnimesBatch(userId, items) {
  if (!supabase || items.length === 0) return
  const CHUNK = 50
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK)
    const { error: e1 } = await supabase
      .from('animes')
      .upsert(chunk.map(toAnimeRow), { onConflict: 'id' })
    if (e1) throw e1
    const { error: e2 } = await supabase
      .from('user_anime')
      .upsert(chunk.map(item => toUserAnimeRow(userId, item)), { onConflict: 'user_id,anime_id' })
    if (e2) throw e2
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
    .select('*, animes(*)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  return (data ?? []).map(fromRow)
}
