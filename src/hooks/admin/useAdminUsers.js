import { useEffect, useState } from 'react'
import { fetchUsers, grantPremium, revokePremium, toggleBanUser } from '../../services/premium'

export function useAdminUsers(tab, userTabs) {
  const [userQuery, setUserQuery] = useState('')
  const [userDraft, setUserDraft] = useState('')
  const [users, setUsers] = useState([])
  const [userCount, setUserCount] = useState(0)
  const [userPage, setUserPage] = useState(0)
  const [usersLoading, setUsersLoading] = useState(false)

  useEffect(() => {
    if (!userTabs.includes(tab)) return
    setUsersLoading(true)
    fetchUsers({ query: userQuery, page: userPage, activeOnly: tab === 'activeUsers' })
      .then(({ data, count }) => { setUsers(data); setUserCount(count) })
      .finally(() => setUsersLoading(false))
  }, [tab, userQuery, userPage, userTabs])

  function handleUserSearch(e) {
    e.preventDefault()
    setUserPage(0)
    setUserQuery(userDraft)
  }

  async function handlePremium(userId, current) {
    current ? await revokePremium(userId) : await grantPremium(userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_premium: !current } : u))
  }

  async function handleBan(userId, current) {
    await toggleBanUser(userId, !current)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_banned: !current } : u))
  }

  return {
    userQuery,
    userDraft,
    users,
    userCount,
    userPage,
    usersLoading,
    setUserDraft,
    setUserQuery,
    setUserPage,
    handleUserSearch,
    handlePremium,
    handleBan,
  }
}
