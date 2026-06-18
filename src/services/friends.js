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

export async function checkDisplayNameAvailable(displayName, currentUserId) {
  if (!supabase || !displayName?.trim()) return null
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .ilike('display_name', displayName.trim())
    .neq('id', currentUserId)
    .limit(1)
  return (data?.length ?? 0) === 0
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

export async function sendFriendRequest(requesterId, addresseeId) {
  if (!supabase || !requesterId) return
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: requesterId, addressee_id: addresseeId })
  if (error) throw error

  const requesterProfile = await getProfile(requesterId)
  const name = requesterProfile?.display_name || requesterProfile?.username || ''
  createNotification(
    addresseeId,
    'friend_request',
    `${name} quer ser seu amigo`,
    null,
    { requester_id: requesterId },
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

// Quando uma conta é excluída, a linha em `profiles` some por cascade mas a
// `friendship` pode ficar órfã — apontando para um id sem perfil. Isso fazia o
// amigo aparecer como um "?" fantasma. Removemos essas linhas em background.
function cleanupOrphanFriendships(orphanIds) {
  if (!supabase || !orphanIds.length) return
  supabase
    .from('friendships')
    .delete()
    .in('id', orphanIds)
    .then(() => {}, () => {})
}

export async function getFriendsWithProfiles(userId) {
  if (!supabase || !userId) return []

  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

  if (error) throw error
  if (!friendships?.length) return []

  const otherIds = friendships.map(f =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  )

  const { data: profiles } = await supabase
    .from('profiles').select('*').in('id', otherIds)

  const friends = []
  const orphanIds = []
  for (const f of friendships) {
    const otherId = f.requester_id === userId ? f.addressee_id : f.requester_id
    const profile = profiles?.find(p => p.id === otherId) ?? null
    if (profile) {
      friends.push({ id: otherId, friendshipId: f.id, profile })
    } else {
      orphanIds.push(f.id)
    }
  }

  cleanupOrphanFriendships(orphanIds)
  return friends
}

export async function getPendingRequests(userId) {
  if (!supabase || !userId) return []

  const { data: requests, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('status', 'pending')
    .eq('addressee_id', userId)

  if (error) throw error
  if (!requests?.length) return []

  const requesterIds = requests.map(r => r.requester_id)
  const { data: profiles } = await supabase
    .from('profiles').select('*').in('id', requesterIds)

  const pending = []
  const orphanIds = []
  for (const r of requests) {
    const profile = profiles?.find(p => p.id === r.requester_id) ?? null
    if (profile) {
      pending.push({ id: r.id, profile })
    } else {
      orphanIds.push(r.id)
    }
  }

  cleanupOrphanFriendships(orphanIds)
  return pending
}
