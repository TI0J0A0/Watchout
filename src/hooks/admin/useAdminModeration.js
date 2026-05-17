import { useState } from 'react'
import {
  fetchTopics,
  deleteTopicWithPosts,
  fetchFeedback,
  updateFeedbackStatus,
  deleteFeedback,
} from '../../services/community'

export function useAdminModeration() {
  const [topics, setTopics] = useState([])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [feedback, setFeedback] = useState([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  async function loadTopics() {
    setTopicsLoading(true)
    fetchTopics().then(setTopics).finally(() => setTopicsLoading(false))
  }

  async function loadFeedback() {
    setFeedbackLoading(true)
    fetchFeedback().then(setFeedback).finally(() => setFeedbackLoading(false))
  }

  async function handleDeleteTopic(id) {
    if (!confirm('Deletar topico e todas as respostas?')) return
    await deleteTopicWithPosts(id)
    setTopics(prev => prev.filter(t => t.id !== id))
  }

  async function handleFeedbackStatus(id, status) {
    await updateFeedbackStatus(id, status)
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, status } : f))
  }

  async function handleDeleteFeedback(id) {
    if (!confirm('Deletar feedback permanentemente?')) return
    await deleteFeedback(id)
    setFeedback(prev => prev.filter(f => f.id !== id))
  }

  return {
    topics,
    topicsLoading,
    feedback,
    feedbackLoading,
    loadTopics,
    loadFeedback,
    handleDeleteTopic,
    handleFeedbackStatus,
    handleDeleteFeedback,
  }
}
