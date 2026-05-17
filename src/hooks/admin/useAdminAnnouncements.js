import { useState } from 'react'
import { createAnnouncement, deleteAnnouncement, fetchAnnouncements } from '../../services/announcements'

export function useAdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [annLoading, setAnnLoading] = useState(false)
  const [newAnn, setNewAnn] = useState({ content: '', type: 'info' })
  const [annSaving, setAnnSaving] = useState(false)

  function loadAnnouncements() {
    setAnnLoading(true)
    fetchAnnouncements().then(setAnnouncements).finally(() => setAnnLoading(false))
  }

  async function handleCreateAnn(e) {
    e.preventDefault()
    if (!newAnn.content.trim()) return
    setAnnSaving(true)
    try {
      await createAnnouncement(newAnn)
      const fresh = await fetchAnnouncements()
      setAnnouncements(fresh)
      setNewAnn({ content: '', type: 'info' })
    } finally {
      setAnnSaving(false)
    }
  }

  async function handleDeleteAnn(id) {
    await deleteAnnouncement(id)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  return {
    announcements,
    annLoading,
    newAnn,
    annSaving,
    setNewAnn,
    loadAnnouncements,
    handleCreateAnn,
    handleDeleteAnn,
  }
}
