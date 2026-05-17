import { useState } from 'react'
import { fetchSupportUser, searchSupportUsers } from '../../services/adminSupport'

export function useAdminSupport({ onPremiumChanged } = {}) {
  const [supportQuery, setSupportQuery] = useState('')
  const [supportResults, setSupportResults] = useState([])
  const [supportDetail, setSupportDetail] = useState(null)
  const [supportSearching, setSupportSearching] = useState(false)
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportError, setSupportError] = useState('')

  async function handleSupportSearch(e) {
    e.preventDefault()
    if (supportQuery.trim().length < 2) {
      setSupportError('Digite pelo menos 2 caracteres para buscar.')
      return
    }
    setSupportSearching(true)
    setSupportError('')
    try {
      const results = await searchSupportUsers(supportQuery)
      setSupportResults(results)
      if (results.length === 0) setSupportError('Nenhum usuario encontrado para essa busca.')
    } catch (error) {
      setSupportResults([])
      setSupportError(error?.message || 'Falha ao buscar usuario.')
    } finally {
      setSupportSearching(false)
    }
  }

  async function handleSelectSupportUser(userId) {
    setSupportLoading(true)
    setSupportError('')
    try {
      const detail = await fetchSupportUser(userId)
      setSupportDetail(detail)
    } catch (error) {
      setSupportDetail(null)
      setSupportError(error?.message || 'Falha ao carregar ficha de suporte.')
    } finally {
      setSupportLoading(false)
    }
  }

  async function handleOpenSupportUser(userId, setTab) {
    setTab('support')
    setSupportResults([])
    await handleSelectSupportUser(userId)
  }

  async function handleSupportPremium(userId, current) {
    await onPremiumChanged?.(userId, current)
    syncSupportPremium(userId, !current)
  }

  function syncSupportBan(userId, banned) {
    setSupportDetail(prev => prev?.profile?.id === userId
      ? { ...prev, profile: { ...prev.profile, is_banned: banned, isBanned: banned } }
      : prev)
  }

  function syncSupportPremium(userId, premium) {
    setSupportDetail(prev => prev?.profile?.id === userId
      ? { ...prev, profile: { ...prev.profile, is_premium: premium, isPremium: premium } }
      : prev)
  }

  return {
    supportQuery,
    supportResults,
    supportDetail,
    supportSearching,
    supportLoading,
    supportError,
    setSupportQuery,
    handleSupportSearch,
    handleSelectSupportUser,
    handleOpenSupportUser,
    handleSupportPremium,
    syncSupportBan,
  }
}
