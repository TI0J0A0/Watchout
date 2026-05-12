import { supabase } from './supabase'

// ── Forum ─────────────────────────────────────────────────────────────────────

export async function fetchTopics() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('forum_topics')
    .select('id, title, anime_id, anime_title, reply_count, views, created_at, profiles(username, display_name, avatar_grad)')
    .order('updated_at', { ascending: false })
    .limit(60)
  if (error) throw error
  return data ?? []
}

export async function fetchTopic(id) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('forum_topics')
    .select('id, title, anime_id, anime_title, content, reply_count, views, created_at, user_id, profiles(username, display_name, avatar_grad)')
    .eq('id', id)
    .single()
  if (error) throw error
  supabase.from('forum_topics').update({ views: (data.views ?? 0) + 1 }).eq('id', id)
  return data
}

export async function fetchPosts(topicId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('forum_posts')
    .select('id, content, created_at, user_id, profiles(username, display_name, avatar_grad)')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createTopic({ userId, title, content, animeId, animeTitle }) {
  if (!supabase) throw new Error('Not configured')
  const { data, error } = await supabase
    .from('forum_topics')
    .insert({ user_id: userId, title, content, anime_id: animeId ?? null, anime_title: animeTitle ?? null })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function createPost({ userId, topicId, content }) {
  if (!supabase) throw new Error('Not configured')
  const { error } = await supabase
    .from('forum_posts')
    .insert({ user_id: userId, topic_id: topicId, content })
  if (error) throw error
}

export async function deleteTopic(id) {
  if (!supabase) return
  await supabase.from('forum_topics').delete().eq('id', id)
}

export async function deleteTopicWithPosts(id) {
  if (!supabase) return
  await supabase.from('forum_posts').delete().eq('topic_id', id)
  await supabase.from('forum_topics').delete().eq('id', id)
}

export async function deletePost(id) {
  if (!supabase) return
  await supabase.from('forum_posts').delete().eq('id', id)
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export async function fetchFeedback() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('feedback')
    .select('id, type, title, description, status, votes, created_at, profiles(username, display_name)')
    .order('votes', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createFeedback({ userId, type, title, description }) {
  if (!supabase) throw new Error('Not configured')
  const { error } = await supabase
    .from('feedback')
    .insert({ user_id: userId, type, title, description })
  if (error) throw error
}

export async function toggleVote(feedbackId, userId, currentVotes, hasVoted) {
  if (!supabase) return currentVotes
  const newVotes = hasVoted ? Math.max(0, currentVotes - 1) : currentVotes + 1
  if (hasVoted) {
    await supabase.from('feedback_votes').delete()
      .eq('feedback_id', feedbackId).eq('user_id', userId)
  } else {
    await supabase.from('feedback_votes').insert({ feedback_id: feedbackId, user_id: userId })
  }
  await supabase.from('feedback').update({ votes: newVotes }).eq('id', feedbackId)
  return newVotes
}

export async function fetchMyVotes(userId) {
  if (!supabase || !userId) return new Set()
  const { data } = await supabase
    .from('feedback_votes')
    .select('feedback_id')
    .eq('user_id', userId)
  return new Set((data ?? []).map(r => r.feedback_id))
}

export async function updateFeedbackStatus(id, status) {
  if (!supabase) return
  await supabase.from('feedback').update({ status }).eq('id', id)
}

export async function deleteFeedback(id) {
  if (!supabase) return
  await supabase.from('feedback').delete().eq('id', id)
}

// ── Anime Comments ─────────────────────────────────────────────────────────────

export async function fetchAnimeComments(animeId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('anime_comments')
    .select('id, content, created_at, user_id, profiles(username, display_name, avatar_grad, avatar_url)')
    .eq('anime_id', animeId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data ?? []
}

export async function createAnimeComment({ userId, animeId, content }) {
  if (!supabase) throw new Error('Not configured')
  const { error } = await supabase
    .from('anime_comments')
    .insert({ user_id: userId, anime_id: animeId, content })
  if (error) throw error
}

export async function deleteAnimeComment(id) {
  if (!supabase) return
  await supabase.from('anime_comments').delete().eq('id', id)
}
