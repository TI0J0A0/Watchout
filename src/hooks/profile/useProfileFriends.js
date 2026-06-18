import { useEffect, useState, useCallback } from 'react'
import {
  getFriendsWithProfiles,
  getPendingRequests,
  searchProfiles,
  sendFriendRequest,
  acceptFriendRequest,
  deleteFriendship,
} from '../../services/friends'

export function useProfileFriends(user) {
  const [friends, setFriends] = useState([])
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [friendsError, setFriendsError] = useState(false)
  const [pendingRequests, setPendingRequests] = useState([])
  const [showFriendModal, setShowFriendModal] = useState(false)
  const [friendSearch, setFriendSearch] = useState('')
  const [friendResults, setFriendResults] = useState([])
  const [friendSearchLoading, setFriendSearchLoading] = useState(false)
  const [sentRequests, setSentRequests] = useState(new Set())
  const [removingId, setRemovingId] = useState(null)

  const loadFriends = useCallback(() => {
    if (!user?.id) return
    setFriendsLoading(true)
    setFriendsError(false)
    Promise.all([getFriendsWithProfiles(user.id), getPendingRequests(user.id)])
      .then(([f, p]) => { setFriends(f); setPendingRequests(p) })
      .catch(() => setFriendsError(true))
      .finally(() => setFriendsLoading(false))
  }, [user?.id])

  useEffect(() => { loadFriends() }, [loadFriends])

  async function handleFriendSearch(q) {
    setFriendSearch(q)
    if (q.length < 2) { setFriendResults([]); return }
    setFriendSearchLoading(true)
    try {
      const results = await searchProfiles(q)
      setFriendResults(results.filter(p => p.id !== user?.id))
    } catch {}
    setFriendSearchLoading(false)
  }

  async function handleSendRequest(addresseeId) {
    try {
      await sendFriendRequest(user.id, addresseeId)
      setSentRequests(prev => new Set([...prev, addresseeId]))
    } catch {}
  }

  async function handleAccept(friendshipId) {
    try {
      await acceptFriendRequest(friendshipId)
      setPendingRequests(prev => prev.filter(r => r.id !== friendshipId))
      getFriendsWithProfiles(user.id).then(setFriends).catch(() => {})
    } catch {}
  }

  async function handleDecline(friendshipId) {
    try {
      await deleteFriendship(friendshipId)
      setPendingRequests(prev => prev.filter(r => r.id !== friendshipId))
    } catch {}
  }

  async function handleRemoveFriend(friendshipId) {
    if (!friendshipId) return
    setRemovingId(friendshipId)
    try {
      await deleteFriendship(friendshipId)
      setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId))
    } catch {}
    setRemovingId(null)
  }

  function closeFriendModal() {
    setShowFriendModal(false)
    setFriendSearch('')
    setFriendResults([])
  }

  return {
    friends,
    friendsLoading,
    friendsError,
    pendingRequests,
    showFriendModal,
    friendSearch,
    friendResults,
    friendSearchLoading,
    sentRequests,
    removingId,
    setShowFriendModal,
    handleFriendSearch,
    handleSendRequest,
    handleAccept,
    handleDecline,
    handleRemoveFriend,
    refreshFriends: loadFriends,
    closeFriendModal,
  }
}
