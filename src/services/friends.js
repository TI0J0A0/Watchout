import { supabase } from './supabase'
import { createNotification } from './notifications'

export async function upsertProfile(user, meta) {
  if (!supabase || !user) return
  const username = user.email?.split('@')[0] ?? ''
  await supabase.from('profiles').upsert({
    id:           user.id,
    username,
    display_name: meta.displayName || username,
    avatar_url:   meta.avatarUrl || null,
    avatar_grad:  meta.avatarGrad ?? 0,
    updated_at:   new Date().toISOString(),
  }, { onConflict: 'id' })
}

export async function getProfile(userId) {
  if (!supabase) return null
  const { data } = await supabase
    .from('profiles').select('*').eq('id', userId).single()
  return data ?? null
}

export async function searchProfiles(query) {
  if (!supabase || !query) return []
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', `%${query}%`)
    .limit(10)
  return data ?? []
}

export async function sendFriendRequest(addresseeId) {
  if (!supabase) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: addresseeId })
  if (error) throw error

  const requesterProfile = await getProfile(user.id)
  const name = requesterProfile?.display_name || requesterProfile?.username || user.email
  createNotification(
    addresseeId,
    'friend_request',
    `${name} quer ser seu amigo`,
    null,
    { requester_id: user.id },
  ).catch(() => {})
}

export async function acceptFriendRequest(friendshipId) {
  if (!supabase) return
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
  if (error) throw error
}

export async function deleteFriendship(friendshipId) {
  if (!supabase) return
  const { error } = await supabase
    .from('friendships').delete().eq('id', friendshipId)
  if (error) throw error
}

export async function getFriendsWithProfiles() {
  if (!supabase) return []
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: friendships } = await supabase
    .from('friendships')
    .select('*')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

  if (!friendships?.length) return []

  const otherIds = friendships.map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )

  const { data: profiles } = await supabase
    .from('profiles').select('*').in('id', otherIds)

  return friendships.map(f => {
    const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id
    return {
      id:           otherId,
      friendshipId: f.id,
      profile:      profiles?.find(p => p.id === otherId) ?? null,
    }
  })
}

export async function getPendingRequests() {
  if (!supabase) return []
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: requests } = await supabase
    .from('friendships')
    .select('*')
    .eq('status', 'pending')
    .eq('addressee_id', user.id)

  if (!requests?.length) return []

  const requesterIds = requests.map(r => r.requester_id)
  const { data: profiles } = await supabase
    .from('profiles').select('*').in('id', requesterIds)

  return requests.map(r => ({
    id:      r.id,
    profile: profiles?.find(p => p.id === r.requester_id) ?? null,
  }))
}
