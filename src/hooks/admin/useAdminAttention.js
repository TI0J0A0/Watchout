import { useState } from 'react'
import { fetchAdminAttentionQueue } from '../../services/adminAttention'

export function useAdminAttention() {
  const [queue, setQueue] = useState(null)
  const [loading, setLoading] = useState(false)

  async function loadQueue() {
    setLoading(true)
    fetchAdminAttentionQueue()
      .then(setQueue)
      .finally(() => setLoading(false))
  }

  return {
    attentionQueue: queue,
    attentionLoading: loading,
    loadAttentionQueue: loadQueue,
  }
}
