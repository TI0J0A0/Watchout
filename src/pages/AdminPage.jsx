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
import { fetchAdminMetrics } from '../services/metrics'
import { AdminMenu } from '../components/admin/AdminMenu'
import { AdminDashboardPanel } from '../components/admin/AdminDashboardPanel'
import { AdminMetricsPanel } from '../components/admin/AdminMetricsPanel'
import { AdminUsersPanel } from '../components/admin/AdminUsersPanel'
import { AdminHeroPanel } from '../components/admin/AdminHeroPanel'
import { AdminSupportPanel } from '../components/admin/AdminSupportPanel'
import { AdminAttentionPanel } from '../components/admin/AdminAttentionPanel'
import { createAdminStyles } from '../components/admin/shared'
import { fetchSupportUser, searchSupportUsers } from '../services/adminSupport'
import { fetchAdminAttentionQueue } from '../services/adminAttention'

const DASHBOARD_TABS = ['dashboard', 'activeUsers', 'topContent', 'recentErrors']
const USER_TABS = ['users', 'permissions', 'activity', 'activeUsers']
const HERO_UPDATED_EVENT = 'watchout:hero-updated'

const MENU_SECTIONS = [
  {
    title: 'Dashboard',
    items: [
      { id: 'dashboard', label: 'Resumo geral do site' },
      { id: 'attention', label: 'Precisa de atenção' },
      { id: 'metrics', label: 'Metricas reais' },
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
      { id: 'activity', label: 'Ver atividade recente' },
      { id: 'support', label: 'Suporte ao usuário' },
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
  const [metrics, setMetrics] = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [attentionQueue, setAttentionQueue] = useState(null)
  const [attentionLoading, setAttentionLoading] = useState(false)

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

  const [supportQuery, setSupportQuery] = useState('')
  const [supportResults, setSupportResults] = useState([])
  const [supportDetail, setSupportDetail] = useState(null)
  const [supportSearching, setSupportSearching] = useState(false)
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportError, setSupportError] = useState('')

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
    logoUrl: '',
    sortOrder: 0,
    active: true,
    hideTitle: true,
  })

  function notifyHeroUpdated() {
    window.dispatchEvent(new CustomEvent(HERO_UPDATED_EVENT))
  }

  async function loadAttentionQueue() {
    setAttentionLoading(true)
    fetchAdminAttentionQueue()
      .then(setAttentionQueue)
      .finally(() => setAttentionLoading(false))
  }

  useEffect(() => {
    if (DASHBOARD_TABS.includes(tab)) {
      setDashboardLoading(true)
      fetchAdminDashboard().then(setDashboard).finally(() => setDashboardLoading(false))
    } else if (tab === 'attention') {
      loadAttentionQueue()
    } else if (tab === 'metrics') {
      setMetricsLoading(true)
      fetchAdminMetrics().then(setMetrics).finally(() => setMetricsLoading(false))
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
    fetchUsers({ query: userQuery, page: userPage, activeOnly: tab === 'activeUsers' })
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
    setSupportDetail(prev => prev?.profile?.id === userId
      ? { ...prev, profile: { ...prev.profile, is_banned: !current, isBanned: !current } }
      : prev)
  }

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
      if (results.length === 0) setSupportError('Nenhum usuário encontrado para essa busca.')
    } catch (error) {
      setSupportResults([])
      setSupportError(error?.message || 'Falha ao buscar usuário.')
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

  async function handleOpenSupportUser(userId) {
    setTab('support')
    setSupportResults([])
    await handleSelectSupportUser(userId)
  }

  async function handleSupportPremium(userId, current) {
    await handlePremium(userId, current)
    setSupportDetail(prev => prev?.profile?.id === userId
      ? { ...prev, profile: { ...prev.profile, is_premium: !current, isPremium: !current } }
      : prev)
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
        logoUrl: newHero.logoUrl.trim() || null,
        sortOrder: Number(newHero.sortOrder) || 0,
        active: newHero.active,
        hideTitle: newHero.hideTitle,
      })
      if (created) {
        setHeroEntries(prev => [...prev, created].sort((a, b) => a.sort_order - b.sort_order))
        setHeroFeedback(`Anime #${created.anime_id} adicionado ao hero.`)
        notifyHeroUpdated()
      }
      setNewHero({ animeId: '', imageUrl: '', logoUrl: '', sortOrder: 0, active: true, hideTitle: true })
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
    if (updated) {
      setHeroEntries(prev => prev.map(h => h.id === entry.id ? updated : h))
      notifyHeroUpdated()
    }
  }

  async function handleHeroOrder(entry, sortOrder) {
    const updated = await updateHeroEntry(entry.id, { sortOrder })
    if (updated) {
      setHeroEntries(prev => prev.map(h => h.id === entry.id ? updated : h).sort((a, b) => a.sort_order - b.sort_order))
      notifyHeroUpdated()
    }
  }

  async function handleEditHero(entry) {
    const animeId = Number(prompt('ID do anime no MyAnimeList/Jikan', entry.anime_id))
    if (!animeId) return
    const imageUrl = prompt('URL da imagem customizada do hero', entry.image_url)
    if (!imageUrl?.trim()) return
    const logoUrl = prompt('URL da logo do anime (opcional)', entry.logo_url || '') ?? ''
    const updated = await updateHeroEntry(entry.id, { animeId, imageUrl: imageUrl.trim(), logoUrl: logoUrl.trim() || null })
    if (updated) {
      setHeroEntries(prev => prev.map(h => h.id === entry.id ? updated : h))
      notifyHeroUpdated()
    }
  }

  async function handleDeleteHero(id) {
    if (!confirm('Remover este item do hero?')) return
    await deleteHeroEntry(id)
    setHeroEntries(prev => prev.filter(h => h.id !== id))
    notifyHeroUpdated()
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
      notifyHeroUpdated()
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
      logoUrl: prev.logoUrl || '',
    }))
    setHeroError('')
    setHeroFeedback(`Anime selecionado: ${item.title} (#${item.id}).`)
  }

  const { card, chip, input } = createAdminStyles(T, dark, mobile)

  const dashboardStats = dashboard ?? {
    totalUsers: 0,
    activeUsers: 0,
    premiumUsers: 0,
    bannedUsers: 0,
    topContent: [],
    recentErrors: [],
  }
  const metricStats = metrics ?? {
    trackedUsers: 0,
    trackedItems: 0,
    totalWatchedEpisodes: 0,
    avgScore: 0,
    totalClicks: 0,
    totalLikes: 0,
    notesCount: 0,
    topClickedAnimes: [],
    clickSources: [],
    countryBreakdown: [],
    topTrackedAnimes: [],
    eventBreakdown: [],
  }

  return (
    <div style={{
      padding: '32px 0 60px', maxWidth: 1120, margin: '0 auto',
      display: 'grid', gridTemplateColumns: mobile ? '1fr' : '240px minmax(0, 1fr)', gap: 24,
    }}>
      <AdminMenu T={T} mobile={mobile} tab={tab} setTab={setTab} sections={MENU_SECTIONS} />

      <main style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: T.txt, marginBottom: 16 }}>
          Painel de Administração
        </h1>

        {DASHBOARD_TABS.includes(tab) && (
          <AdminDashboardPanel T={T} loading={dashboardLoading} tab={tab} stats={dashboardStats} card={card} />
        )}
        {tab === 'attention' && (
          <AdminAttentionPanel
            T={T}
            loading={attentionLoading}
            queue={attentionQueue}
            card={card}
            chip={chip}
            onRefresh={loadAttentionQueue}
            onOpenSupportUser={handleOpenSupportUser}
          />
        )}
        {tab === 'metrics' && (
          <AdminMetricsPanel T={T} loading={metricsLoading} stats={metricStats} card={card} />
        )}

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

        {USER_TABS.includes(tab) && (
          <AdminUsersPanel
            T={T}
            tab={tab}
            users={users}
            userCount={userCount}
            userPage={userPage}
            userDraft={userDraft}
            usersLoading={usersLoading}
            userQuery={userQuery}
            input={input}
            card={card}
            chip={chip}
            setUserDraft={setUserDraft}
            setUserQuery={setUserQuery}
            setUserPage={setUserPage}
            onSearch={handleUserSearch}
            onPremium={handlePremium}
            onBan={handleBan}
          />
        )}

        {tab === 'support' && (
          <AdminSupportPanel
            T={T}
            mobile={mobile}
            input={input}
            card={card}
            chip={chip}
            query={supportQuery}
            results={supportResults}
            selected={supportDetail}
            loading={supportLoading}
            searching={supportSearching}
            error={supportError}
            setQuery={setSupportQuery}
            onSearch={handleSupportSearch}
            onSelectUser={handleSelectSupportUser}
            onPremium={handleSupportPremium}
            onBan={handleBan}
          />
        )}

        {tab === 'hero' && (
          <AdminHeroPanel
            T={T}
            mobile={mobile}
            input={input}
            card={card}
            chip={chip}
            heroMaxItems={heroMaxItems}
            heroSettingsSaving={heroSettingsSaving}
            heroSearch={heroSearch}
            heroSearchLoading={heroSearchLoading}
            heroSearchResults={heroSearchResults}
            heroSearchError={heroSearchError}
            heroFeedback={heroFeedback}
            heroError={heroError}
            newHero={newHero}
            heroSaving={heroSaving}
            heroLoading={heroLoading}
            heroEntries={heroEntries}
            setHeroMaxItems={setHeroMaxItems}
            setHeroSearch={setHeroSearch}
            setNewHero={setNewHero}
            onSaveHeroSettings={handleSaveHeroSettings}
            onHeroSearch={handleHeroSearch}
            onSelectHeroAnime={handleSelectHeroAnime}
            onCreateHero={handleCreateHero}
            onHeroOrder={handleHeroOrder}
            onToggleHero={handleToggleHero}
            onEditHero={handleEditHero}
            onDeleteHero={handleDeleteHero}
          />
        )}

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
