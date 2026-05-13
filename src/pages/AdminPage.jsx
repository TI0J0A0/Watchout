import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import {
  fetchTopics, deleteTopicWithPosts,
  fetchFeedback, updateFeedbackStatus, deleteFeedback,
} from '../services/community'
import { useIsMobile } from '../hooks/useIsMobile'
import { fetchAdminDashboard, fetchUsers, grantPremium, revokePremium, toggleBanUser } from '../services/premium'
import { fetchAnnouncements, createAnnouncement, deleteAnnouncement } from '../services/announcements'
import { createHeroEntry, deleteHeroEntry, fetchHeroEntries, fetchHeroSettings, updateHeroEntry, updateHeroSettings } from '../services/heroAdmin'
import { searchAnimeByName } from '../services/animeLookup'

const DASHBOARD_TABS = ['dashboard', 'activeUsers', 'topContent', 'recentErrors']
const USER_TABS = ['users', 'permissions', 'moderation', 'activity', 'activeUsers']

const MENU_SECTIONS = [
  {
    title: 'Dashboard',
    items: [
      { id: 'dashboard', label: 'Resumo geral do site' },
      { id: 'activeUsers', label: 'Usuários ativos' },
      { id: 'topContent', label: 'Conteúdos mais vistos' },
      { id: 'recentErrors', label: 'Erros recentes' },
    ],
  },
  {
    title: 'Usuários',
    items: [
      { id: 'users', label: 'Listar usuários' },
      { id: 'permissions', label: 'Editar permissões' },
      { id: 'moderation', label: 'Banir/suspender usuário' },
      { id: 'activity', label: 'Ver atividade recente' },
    ],
  },
  {
    title: 'Conteúdo',
    items: [
      { id: 'hero', label: 'Hero' },
      { id: 'topics', label: 'Fórum' },
      { id: 'feedbacks', label: 'Feedbacks' },
      { id: 'announcements', label: 'Comunicados' },
    ],
  },
]

export function AdminPage() {
  const { T, dark } = useTheme()
  const mobile = useIsMobile()
  const [tab, setTab] = useState('dashboard')

  const [dashboard, setDashboard] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  const [topics, setTopics] = useState([])
  const [topicsLoading, setTopicsLoading] = useState(false)

  const [feedback, setFeedback] = useState([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const [userQuery, setUserQuery] = useState('')
  const [userDraft, setUserDraft] = useState('')
  const [users, setUsers] = useState([])
  const [userCount, setUserCount] = useState(0)
  const [userPage, setUserPage] = useState(0)
  const [usersLoading, setUsersLoading] = useState(false)

  const [announcements, setAnnouncements] = useState([])
  const [annLoading, setAnnLoading] = useState(false)
  const [newAnn, setNewAnn] = useState({ content: '', type: 'info' })
  const [annSaving, setAnnSaving] = useState(false)

  const [heroEntries, setHeroEntries] = useState([])
  const [heroLoading, setHeroLoading] = useState(false)
  const [heroSaving, setHeroSaving] = useState(false)
  const [heroSettingsSaving, setHeroSettingsSaving] = useState(false)
  const [heroMaxItems, setHeroMaxItems] = useState(5)
  const [heroSearch, setHeroSearch] = useState('')
  const [heroSearchResults, setHeroSearchResults] = useState([])
  const [heroSearchLoading, setHeroSearchLoading] = useState(false)
  const [heroSearchError, setHeroSearchError] = useState('')
  const [heroFeedback, setHeroFeedback] = useState('')
  const [heroError, setHeroError] = useState('')
  const [newHero, setNewHero] = useState({
    animeId: '',
    imageUrl: '',
    sortOrder: 0,
    active: true,
    hideTitle: true,
  })

  useEffect(() => {
    if (DASHBOARD_TABS.includes(tab)) {
      setDashboardLoading(true)
      fetchAdminDashboard().then(setDashboard).finally(() => setDashboardLoading(false))
    } else if (tab === 'topics') {
      setTopicsLoading(true)
      fetchTopics().then(setTopics).finally(() => setTopicsLoading(false))
    } else if (tab === 'feedbacks') {
      setFeedbackLoading(true)
      fetchFeedback().then(setFeedback).finally(() => setFeedbackLoading(false))
    } else if (tab === 'announcements') {
      setAnnLoading(true)
      fetchAnnouncements().then(setAnnouncements).finally(() => setAnnLoading(false))
    } else if (tab === 'hero') {
      loadHeroEntries()
    }
  }, [tab])

  useEffect(() => {
    if (!USER_TABS.includes(tab)) return
    setUsersLoading(true)
    fetchUsers({ query: userQuery, page: userPage })
      .then(({ data, count }) => { setUsers(data); setUserCount(count) })
      .finally(() => setUsersLoading(false))
  }, [tab, userQuery, userPage])

  async function handleDeleteTopic(id) {
    if (!confirm('Deletar tópico e todas as respostas?')) return
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

  async function loadHeroEntries() {
    setHeroLoading(true)
    Promise.all([fetchHeroEntries(), fetchHeroSettings()])
      .then(([entries, settings]) => {
        setHeroEntries(entries)
        setHeroMaxItems(settings?.max_items ?? 5)
      })
      .finally(() => setHeroLoading(false))
  }

  async function handleCreateHero(e) {
    e.preventDefault()
    const animeId = Number(newHero.animeId)
    setHeroFeedback('')
    setHeroError('')
    if (!animeId) {
      setHeroError('Selecione ou informe um anime valido antes de adicionar.')
      return
    }
    if (!newHero.imageUrl.trim()) {
      setHeroError('Informe uma URL de imagem para o hero.')
      return
    }
    setHeroSaving(true)
    try {
      const created = await createHeroEntry({
        animeId,
        imageUrl: newHero.imageUrl.trim(),
        sortOrder: Number(newHero.sortOrder) || 0,
        active: newHero.active,
        hideTitle: newHero.hideTitle,
      })
      if (created) {
        setHeroEntries(prev => [...prev, created].sort((a, b) => a.sort_order - b.sort_order))
        setHeroFeedback(`Anime #${created.anime_id} adicionado ao hero.`)
      }
      setNewHero({ animeId: '', imageUrl: '', sortOrder: 0, active: true, hideTitle: true })
    } catch (error) {
      setHeroError(error?.message || 'Falha ao adicionar anime ao hero.')
    } finally {
      setHeroSaving(false)
    }
  }

  async function handleToggleHero(entry, field) {
    const updated = await updateHeroEntry(entry.id, {
      [field]: !entry[field === 'active' ? 'active' : 'hide_title'],
    })
    if (updated) setHeroEntries(prev => prev.map(h => h.id === entry.id ? updated : h))
  }

  async function handleHeroOrder(entry, sortOrder) {
    const updated = await updateHeroEntry(entry.id, { sortOrder })
    if (updated) setHeroEntries(prev => prev.map(h => h.id === entry.id ? updated : h).sort((a, b) => a.sort_order - b.sort_order))
  }

  async function handleEditHero(entry) {
    const animeId = Number(prompt('ID do anime no MyAnimeList/Jikan', entry.anime_id))
    if (!animeId) return
    const imageUrl = prompt('URL da imagem customizada do hero', entry.image_url)
    if (!imageUrl?.trim()) return
    const updated = await updateHeroEntry(entry.id, { animeId, imageUrl: imageUrl.trim() })
    if (updated) setHeroEntries(prev => prev.map(h => h.id === entry.id ? updated : h))
  }

  async function handleDeleteHero(id) {
    if (!confirm('Remover este item do hero?')) return
    await deleteHeroEntry(id)
    setHeroEntries(prev => prev.filter(h => h.id !== id))
  }

  async function handleSaveHeroSettings() {
    setHeroSettingsSaving(true)
    setHeroFeedback('')
    setHeroError('')
    try {
      const next = Math.min(20, Math.max(1, Number(heroMaxItems) || 1))
      const updated = await updateHeroSettings({ maxItems: next })
      setHeroMaxItems(updated.max_items)
      setHeroFeedback(`Limite do hero atualizado para ${updated.max_items}.`)
    } catch (error) {
      setHeroError(error?.message || 'Falha ao salvar o limite do hero.')
    } finally {
      setHeroSettingsSaving(false)
    }
  }

  async function handleHeroSearch(e) {
    e.preventDefault()
    if (!heroSearch.trim()) return
    setHeroSearchLoading(true)
    setHeroSearchError('')
    try {
      const items = await searchAnimeByName(heroSearch)
      setHeroSearchResults(items)
      if (items.length === 0) setHeroSearchError('Nenhum anime encontrado para essa busca.')
    } catch (error) {
      setHeroSearchResults([])
      setHeroSearchError(error?.message || 'Falha ao buscar anime.')
    } finally {
      setHeroSearchLoading(false)
    }
  }

  function handleSelectHeroAnime(item) {
    setNewHero(prev => ({
      ...prev,
      animeId: String(item.id ?? ''),
      imageUrl: item.imageUrl || prev.imageUrl || '',
    }))
    setHeroError('')
    setHeroFeedback(`Anime selecionado: ${item.title} (#${item.id}).`)
  }

  const card = {
    padding: 16, borderRadius: 12, background: T.surf,
    border: `1px solid ${T.bord}`, display: 'flex',
    flexDirection: mobile ? 'column' : 'row',
    justifyContent: 'space-between', alignItems: mobile ? 'stretch' : 'center',
    gap: mobile ? 12 : 0,
  }

  function chip(color) {
    return {
      padding: '6px 12px', background: `${color}22`, color,
      border: 'none', borderRadius: 8, fontWeight: 600,
      cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
    }
  }

  const input = {
    padding: '10px 14px', borderRadius: 10, fontSize: 14,
    background: dark ? '#1c1c1e' : '#f5f5f7',
    border: `1px solid ${T.bord}`, color: T.txt,
  }

  const dashboardStats = dashboard ?? {
    totalUsers: 0,
    activeUsers: 0,
    premiumUsers: 0,
    bannedUsers: 0,
    topContent: [],
    recentErrors: [],
  }

  function formatDate(value) {
    if (!value) return 'Sem data'
    return new Date(value).toLocaleString('pt-BR')
  }

  function renderDashboard() {
    return dashboardLoading
      ? <p style={{ color: T.sub }}>Carregando...</p>
      : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              ['Usuários totais', dashboardStats.totalUsers],
              ['Usuários ativos', dashboardStats.activeUsers],
              ['Premium', dashboardStats.premiumUsers],
              ['Banidos/suspensos', dashboardStats.bannedUsers],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: 16, borderRadius: 12, background: T.surf, border: `1px solid ${T.bord}` }}>
                <p style={{ fontSize: 12, color: T.sub, margin: '0 0 6px' }}>{label}</p>
                <p style={{ fontSize: 26, color: T.txt, fontWeight: 800, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          {(tab === 'dashboard' || tab === 'topContent') && (
            <section>
              <h2 style={{ fontSize: 18, color: T.txt, margin: '6px 0 10px' }}>Conteúdos mais vistos</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dashboardStats.topContent.length === 0 && <p style={{ color: T.sub }}>Nenhum conteúdo com visualizações encontrado.</p>}
                {dashboardStats.topContent.map(item => (
                  <div key={item.id} style={card}>
                    <div style={{ minWidth: 0, paddingRight: 12 }}>
                      <p style={{ fontWeight: 700, color: T.txt, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </p>
                      <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>{item.reply_count ?? 0} respostas</p>
                    </div>
                    <span style={{ fontSize: 13, color: T.sub, whiteSpace: 'nowrap' }}>{item.views ?? 0} views</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(tab === 'dashboard' || tab === 'recentErrors') && (
            <section>
              <h2 style={{ fontSize: 18, color: T.txt, margin: '6px 0 10px' }}>Erros recentes</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dashboardStats.recentErrors.length === 0 && (
                  <div style={{ padding: 16, borderRadius: 12, background: T.surf, border: `1px solid ${T.bord}`, color: T.sub }}>
                    Nenhum erro recente encontrado.
                  </div>
                )}
                {dashboardStats.recentErrors.map(error => (
                  <div key={error.id} style={{ ...card, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0, paddingRight: 12 }}>
                      <p style={{ fontWeight: 700, color: T.txt, margin: '0 0 4px' }}>
                        {error.message}
                      </p>
                      <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>
                        {error.source || 'Sem origem'} · {formatDate(error.created_at)}
                      </p>
                    </div>
                    {error.metadata && (
                      <span style={{ fontSize: 11, color: T.sub, whiteSpace: 'nowrap' }}>
                        metadata
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )
  }

  function renderUsers() {
    const totalPages = Math.ceil(userCount / 20)
    const visibleUsers = tab === 'activeUsers' ? users.filter(u => !u.is_banned) : users
    const title = {
      users: 'Listar usuários',
      permissions: 'Editar permissões',
      moderation: 'Banir/suspender usuário',
      activity: 'Ver atividade recente',
      activeUsers: 'Usuários ativos',
    }[tab]

    return (
      <div>
        <h2 style={{ fontSize: 18, color: T.txt, margin: '0 0 14px' }}>{title}</h2>
        <form onSubmit={handleUserSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={userDraft}
            onChange={e => setUserDraft(e.target.value)}
            placeholder="Filtrar por username ou nome..."
            style={{ ...input, flex: 1 }}
          />
          <button type="submit"
            style={{ padding: '10px 20px', background: '#0A84FF', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
            Buscar
          </button>
          {userQuery && (
            <button type="button" onClick={() => { setUserDraft(''); setUserQuery(''); setUserPage(0) }}
              style={{ padding: '10px 14px', background: T.surf, color: T.sub, border: `1px solid ${T.bord}`, borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
              Limpar
            </button>
          )}
        </form>

        <p style={{ fontSize: 12, color: T.sub, margin: '0 0 12px' }}>
          {usersLoading ? 'Carregando...' : `${tab === 'activeUsers' ? visibleUsers.length : userCount} usuário${(tab === 'activeUsers' ? visibleUsers.length : userCount) !== 1 ? 's' : ''}${userQuery ? ` para "${userQuery}"` : ''}`}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!usersLoading && visibleUsers.length === 0 && (
            <p style={{ color: T.sub }}>Nenhum usuário encontrado.</p>
          )}
          {visibleUsers.map(u => (
            <div key={u.id} style={card}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                <p style={{ fontWeight: 600, color: T.txt, margin: '0 0 3px', display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                  {u.display_name || u.username}
                  {u.is_premium && (
                    <span style={{ fontSize: 10, background: '#FF9F0A22', color: '#FF9F0A', padding: '2px 6px', borderRadius: 4 }}>PREMIUM</span>
                  )}
                  {u.is_banned && (
                    <span style={{ fontSize: 10, background: '#FF3B3022', color: '#FF3B30', padding: '2px 6px', borderRadius: 4 }}>BANIDO</span>
                  )}
                </p>
                <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>
                  @{u.username}{tab === 'activity' ? ` · criado em ${formatDate(u.created_at)}` : ''}
                </p>
              </div>
              {tab !== 'activity' && (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {tab !== 'moderation' && (
                    <button onClick={() => handlePremium(u.id, u.is_premium)}
                      style={chip(u.is_premium ? '#FF9F0A' : '#30D158')}>
                      {u.is_premium ? 'Revogar Premium' : 'Dar Premium'}
                    </button>
                  )}
                  {tab !== 'permissions' && (
                    <button onClick={() => handleBan(u.id, u.is_banned)}
                      style={chip(u.is_banned ? '#30D158' : '#FF3B30')}>
                      {u.is_banned ? 'Desbanir' : 'Banir'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {totalPages > 1 && tab !== 'activeUsers' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
            <button
              disabled={userPage === 0}
              onClick={() => setUserPage(p => p - 1)}
              style={{
                padding: '8px 18px', borderRadius: 9, border: `1px solid ${T.bord}`,
                background: T.surf, color: userPage === 0 ? T.sub : T.txt,
                fontWeight: 600, cursor: userPage === 0 ? 'default' : 'pointer', opacity: userPage === 0 ? 0.4 : 1,
              }}>
              Anterior
            </button>
            <span style={{ fontSize: 13, color: T.sub, minWidth: 80, textAlign: 'center' }}>
              {userPage + 1} / {totalPages}
            </span>
            <button
              disabled={userPage >= totalPages - 1}
              onClick={() => setUserPage(p => p + 1)}
              style={{
                padding: '8px 18px', borderRadius: 9, border: `1px solid ${T.bord}`,
                background: T.surf, color: userPage >= totalPages - 1 ? T.sub : T.txt,
                fontWeight: 600, cursor: userPage >= totalPages - 1 ? 'default' : 'pointer', opacity: userPage >= totalPages - 1 ? 0.4 : 1,
              }}>
              Próximo
            </button>
          </div>
        )}
      </div>
    )
  }

  function renderHeroControl() {
    return (
      <div>
        <h2 style={{ fontSize: 18, color: T.txt, margin: '0 0 14px' }}>Controle do hero</h2>
        <div style={{
          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
          marginBottom: 16, padding: 16, background: T.surf, border: `1px solid ${T.bord}`, borderRadius: 12,
        }}>
          <input
            type="number"
            min="1"
            max="20"
            value={heroMaxItems}
            onChange={e => setHeroMaxItems(e.target.value)}
            placeholder="Máximo no hero"
            style={{ ...input, width: 150 }}
          />
          <button type="button" onClick={handleSaveHeroSettings}
            style={{ padding: '10px 18px', background: '#0A84FF', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: heroSettingsSaving ? 'default' : 'pointer', opacity: heroSettingsSaving ? 0.6 : 1 }}>
            {heroSettingsSaving ? 'Salvando...' : 'Salvar limite'}
          </button>
          <p style={{ color: T.sub, fontSize: 12, margin: 0 }}>
            A home mostra no máximo {Number(heroMaxItems) || 1} animes ativos do hero, respeitando a ordem.
          </p>
        </div>

        <form onSubmit={handleHeroSearch} style={{
          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
          marginBottom: 16, padding: 16, background: T.surf, border: `1px solid ${T.bord}`, borderRadius: 12,
        }}>
          <input
            value={heroSearch}
            onChange={e => setHeroSearch(e.target.value)}
            placeholder="Buscar anime por nome"
            style={{ ...input, flex: 1, minWidth: mobile ? '100%' : 260 }}
          />
          <button type="submit"
            style={{ padding: '10px 18px', background: '#0A84FF', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: heroSearchLoading ? 'default' : 'pointer', opacity: heroSearchLoading ? 0.6 : 1 }}>
            {heroSearchLoading ? 'Buscando...' : 'Buscar anime'}
          </button>
        </form>

        {heroSearchError && (
          <p style={{ color: '#FF3B30', fontSize: 12, margin: '0 0 16px' }}>{heroSearchError}</p>
        )}
        {heroError && (
          <p style={{ color: '#FF3B30', fontSize: 12, margin: '0 0 16px' }}>{heroError}</p>
        )}
        {heroFeedback && (
          <p style={{ color: '#30D158', fontSize: 12, margin: '0 0 16px' }}>{heroFeedback}</p>
        )}

        {heroSearchResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {heroSearchResults.map(item => (
              <div key={item.id} style={{ ...card, alignItems: mobile ? 'stretch' : 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" style={{ width: 64, height: 90, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 64, height: 90, borderRadius: 8, background: T.bord, flexShrink: 0 }} />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: T.txt, fontWeight: 700, margin: '0 0 4px' }}>{item.title}</p>
                    <p style={{ color: T.sub, fontSize: 12, margin: '0 0 4px' }}>
                      ID {item.id} · {item.type || 'Anime'} · {item.episodes ?? '?'} eps · {item.year ?? 'sem ano'} · {item.status || 'sem status'}
                    </p>
                    <p style={{ color: T.sub, fontSize: 12, margin: '0 0 4px' }}>
                      {item.season || 'sem temporada'} · {item.rating || 'sem classificação'} · nota {item.score ?? '?'}
                    </p>
                    <p style={{ color: T.sub, fontSize: 12, margin: '0 0 4px' }}>
                      {item.studios?.slice(0, 2).join(', ') || 'sem estúdio'} · {item.genres?.slice(0, 3).join(', ') || 'sem gênero'}
                    </p>
                    <p style={{ color: T.sub, fontSize: 12, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.synopsis || 'Sem sinopse'}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => handleSelectHeroAnime(item)} style={chip('#0A84FF')}>
                  Usar este anime
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleCreateHero} style={{
          display: 'grid', gridTemplateColumns: mobile ? '1fr' : '120px minmax(220px, 1fr) 90px auto',
          gap: 10, alignItems: 'center', marginBottom: 20,
          padding: 16, background: T.surf, border: `1px solid ${T.bord}`, borderRadius: 12,
        }}>
          <input
            type="number"
            min="1"
            value={newHero.animeId}
            onChange={e => setNewHero(p => ({ ...p, animeId: e.target.value }))}
            placeholder="Anime ID"
            style={input}
          />
          <input
            value={newHero.imageUrl}
            onChange={e => setNewHero(p => ({ ...p, imageUrl: e.target.value }))}
            placeholder="URL da imagem customizada do hero"
            style={input}
          />
          <input
            type="number"
            value={newHero.sortOrder}
            onChange={e => setNewHero(p => ({ ...p, sortOrder: e.target.value }))}
            placeholder="Ordem"
            style={input}
          />
          <button type="submit" disabled={heroSaving}
            style={{ padding: '10px 18px', background: '#0A84FF', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: heroSaving ? 'default' : 'pointer', opacity: heroSaving ? 0.6 : 1 }}>
            {heroSaving ? 'Salvando...' : 'Adicionar'}
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.sub, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={newHero.active}
              onChange={e => setNewHero(p => ({ ...p, active: e.target.checked }))}
            />
            Ativo
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.sub, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={newHero.hideTitle}
              onChange={e => setNewHero(p => ({ ...p, hideTitle: e.target.checked }))}
            />
            Esconder título textual
          </label>
        </form>

        {heroLoading
          ? <p style={{ color: T.sub }}>Carregando...</p>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {heroEntries.length === 0 && <p style={{ color: T.sub }}>Nenhum hero configurado. O site usa o carrossel automático enquanto esta lista estiver vazia.</p>}
            {heroEntries.map(entry => (
              <div key={entry.id} style={{ ...card, alignItems: mobile ? 'stretch' : 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <img src={entry.image_url} alt="" style={{ width: 86, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: T.txt, fontWeight: 700, margin: '0 0 3px' }}>Anime #{entry.anime_id}</p>
                    <p style={{ color: T.sub, fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.image_url}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: mobile ? 'flex-start' : 'flex-end' }}>
                  <input
                    type="number"
                    value={entry.sort_order}
                    onChange={e => handleHeroOrder(entry, Number(e.target.value) || 0)}
                    aria-label="Ordem do hero"
                    style={{ ...input, width: 76, padding: '6px 8px' }}
                  />
                  <button type="button" onClick={() => handleToggleHero(entry, 'active')}
                    style={chip(entry.active ? '#30D158' : '#8E8E93')}>
                    {entry.active ? 'Ativo' : 'Inativo'}
                  </button>
                  <button type="button" onClick={() => handleToggleHero(entry, 'hideTitle')}
                    style={chip(entry.hide_title ? '#FF9F0A' : '#0A84FF')}>
                    {entry.hide_title ? 'Título oculto' : 'Título visível'}
                  </button>
                  <button type="button" onClick={() => handleEditHero(entry)} style={chip('#0A84FF')}>
                    Editar
                  </button>
                  <button type="button" onClick={() => handleDeleteHero(entry.id)} style={chip('#FF3B30')}>
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    )
  }

  return (
    <div style={{
      padding: '32px 0 60px', maxWidth: 1120, margin: '0 auto',
      display: 'grid', gridTemplateColumns: mobile ? '1fr' : '240px minmax(0, 1fr)', gap: 24,
    }}>
      <aside style={{
        alignSelf: 'start', position: mobile ? 'static' : 'sticky', top: 82, padding: 16,
        borderRadius: 14, background: T.surf, border: `1px solid ${T.bord}`,
      }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: T.txt, margin: '0 0 18px' }}>
          Menu Admin
        </p>
        {MENU_SECTIONS.map(section => (
          <div key={section.title} style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: T.sub, margin: '0 0 8px', textTransform: 'uppercase' }}>
              {section.title}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {section.items.map(item => (
                <button key={item.id} onClick={() => setTab(item.id)} style={{
                  width: '100%', padding: '9px 10px', borderRadius: 8, border: 'none',
                  background: tab === item.id ? '#0A84FF22' : 'transparent',
                  color: tab === item.id ? '#0A84FF' : T.txt,
                  fontWeight: tab === item.id ? 700 : 500, cursor: 'pointer',
                  fontSize: 13, textAlign: 'left',
                }}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <main style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: T.txt, marginBottom: 16 }}>
          Painel de Administração
        </h1>

        {DASHBOARD_TABS.includes(tab) && renderDashboard()}

        {tab === 'topics' && (
          topicsLoading
            ? <p style={{ color: T.sub }}>Carregando...</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topics.length === 0 && <p style={{ color: T.sub }}>Nenhum tópico encontrado.</p>}
              {topics.map(topic => (
                <div key={topic.id} style={card}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <p style={{ fontWeight: 600, color: T.txt, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {topic.title}
                    </p>
                    <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>
                      {topic.profiles?.display_name || topic.profiles?.username || 'Anônimo'}
                      {' · '}{topic.reply_count} respostas{' · '}{topic.views ?? 0} views
                    </p>
                  </div>
                  <button onClick={() => handleDeleteTopic(topic.id)} style={chip('#FF3B30')}>
                    Deletar
                  </button>
                </div>
              ))}
            </div>
        )}

        {tab === 'feedbacks' && (
          feedbackLoading
            ? <p style={{ color: T.sub }}>Carregando...</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {feedback.length === 0 && <p style={{ color: T.sub }}>Nenhum feedback encontrado.</p>}
              {feedback.map(item => (
                <div key={item.id} style={{ ...card, alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 10, background: '#0A84FF22', color: '#0A84FF', padding: '2px 6px', borderRadius: 4 }}>
                      {item.type.toUpperCase()}
                    </span>
                    <p style={{ fontWeight: 600, color: T.txt, margin: '5px 0 2px' }}>{item.title}</p>
                    <p style={{ fontSize: 13, color: T.sub, margin: '0 0 4px' }}>{item.description}</p>
                    <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>
                      {item.profiles?.username || 'Anônimo'} · {item.votes} votos
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                    <select value={item.status} onChange={e => handleFeedbackStatus(item.id, e.target.value)}
                      style={{ ...input, padding: '5px 8px', fontSize: 12 }}>
                      <option value="open">Aberto</option>
                      <option value="reviewing">Em Análise</option>
                      <option value="done">Resolvido</option>
                    </select>
                    <button onClick={() => handleDeleteFeedback(item.id)} style={chip('#FF3B30')}>
                      Deletar
                    </button>
                  </div>
                </div>
              ))}
            </div>
        )}

        {USER_TABS.includes(tab) && renderUsers()}

        {tab === 'hero' && renderHeroControl()}

        {tab === 'announcements' && (
          <div>
            <form onSubmit={handleCreateAnn} style={{
              display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24,
              padding: 18, background: T.surf, borderRadius: 14, border: `1px solid ${T.bord}`,
            }}>
              <p style={{ fontWeight: 700, color: T.txt, margin: 0, fontSize: 15 }}>Novo Comunicado</p>
              <textarea
                value={newAnn.content}
                onChange={e => setNewAnn(p => ({ ...p, content: e.target.value }))}
                placeholder="Texto do comunicado..."
                rows={3}
                style={{ ...input, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select value={newAnn.type} onChange={e => setNewAnn(p => ({ ...p, type: e.target.value }))}
                  style={{ ...input, padding: '8px 10px', fontSize: 13 }}>
                  <option value="info">Info</option>
                  <option value="warning">Aviso</option>
                  <option value="maintenance">Manutenção</option>
                </select>
                <button type="submit" disabled={annSaving}
                  style={{ padding: '9px 22px', background: '#0A84FF', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, cursor: annSaving ? 'default' : 'pointer', opacity: annSaving ? 0.6 : 1 }}>
                  {annSaving ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </form>

            {annLoading
              ? <p style={{ color: T.sub }}>Carregando...</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {announcements.length === 0 && <p style={{ color: T.sub }}>Nenhum comunicado ativo.</p>}
                {announcements.map(a => {
                  const clr = { info: '#0A84FF', warning: '#FF9F0A', maintenance: '#FF3B30' }[a.type] ?? '#0A84FF'
                  return (
                    <div key={a.id} style={card}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                        <span style={{ fontSize: 10, background: `${clr}22`, color: clr, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
                          {a.type}
                        </span>
                        <p style={{ color: T.txt, margin: '6px 0 3px', fontSize: 13.5 }}>{a.content}</p>
                        <p style={{ fontSize: 11, color: T.sub, margin: 0 }}>
                          {new Date(a.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteAnn(a.id)} style={chip('#FF3B30')}>
                        Remover
                      </button>
                    </div>
                  )
                })}
              </div>
            }
          </div>
        )}
      </main>
    </div>
  )
}
