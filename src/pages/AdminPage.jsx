import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useIsMobile } from '../hooks/useIsMobile'
import { fetchAdminDashboard } from '../services/premium'
import { fetchAdminMetrics } from '../services/metrics'
import { AdminMenu } from '../components/admin/AdminMenu'
import { AdminDashboardPanel } from '../components/admin/AdminDashboardPanel'
import { AdminMetricsPanel } from '../components/admin/AdminMetricsPanel'
import { AdminUsersPanel } from '../components/admin/AdminUsersPanel'
import { AdminHeroPanel } from '../components/admin/AdminHeroPanel'
import { AdminSupportPanel } from '../components/admin/AdminSupportPanel'
import { AdminAttentionPanel } from '../components/admin/AdminAttentionPanel'
import { createAdminStyles } from '../components/admin/shared'
import { useAdminAttention } from '../hooks/admin/useAdminAttention'
import { useAdminHero } from '../hooks/admin/useAdminHero'
import { useAdminUsers } from '../hooks/admin/useAdminUsers'
import { useAdminAnnouncements } from '../hooks/admin/useAdminAnnouncements'
import { useAdminSupport } from '../hooks/admin/useAdminSupport'
import { useAdminModeration } from '../hooks/admin/useAdminModeration'

const DASHBOARD_TABS = ['dashboard', 'activeUsers', 'topContent', 'recentErrors']
const USER_TABS = ['users', 'permissions', 'activity', 'activeUsers']

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

const ADMIN_MENU_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Site summary' },
      { id: 'attention', label: 'Needs attention' },
      { id: 'metrics', label: 'Real metrics' },
    ],
  },
  {
    title: 'Users',
    items: [
      { id: 'users', label: 'User directory' },
      { id: 'permissions', label: 'Permissions' },
      { id: 'activity', label: 'Recent activity' },
      { id: 'support', label: 'User support' },
    ],
  },
  {
    title: 'Content',
    items: [
      { id: 'hero', label: 'Hero' },
      { id: 'topContent', label: 'Top content' },
      { id: 'announcements', label: 'Announcements' },
    ],
  },
  {
    title: 'Moderation',
    items: [
      { id: 'topics', label: 'Forum topics' },
      { id: 'feedbacks', label: 'Feedbacks' },
      { id: 'recentErrors', label: 'Recent errors' },
    ],
  },
]

export function AdminPage() {
  const { T, dark } = useTheme()
  const mobile = useIsMobile()
  const [tab, setTab] = useState('dashboard')

  const [dashboard, setDashboard] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardError, setDashboardError] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [metricsError, setMetricsError] = useState(null)
  const { attentionQueue, attentionLoading, loadAttentionQueue } = useAdminAttention()

  const moderation = useAdminModeration()
  const adminUsers = useAdminUsers(tab, USER_TABS)
  const support = useAdminSupport({
    onPremiumChanged: adminUsers.handlePremium,
  })

  const announcementsAdmin = useAdminAnnouncements()

  const hero = useAdminHero()

  useEffect(() => {
    if (DASHBOARD_TABS.includes(tab)) {
      setDashboardLoading(true)
      setDashboardError(null)
      fetchAdminDashboard()
        .then(setDashboard)
        .catch(error => {
          setDashboardError(error?.message || 'Failed to load admin dashboard.')
          setDashboard(null)
        })
        .finally(() => setDashboardLoading(false))
    } else if (tab === 'attention') {
      loadAttentionQueue()
    } else if (tab === 'metrics') {
      setMetricsLoading(true)
      setMetricsError(null)
      fetchAdminMetrics()
        .then(setMetrics)
        .catch(error => {
          setMetricsError(error?.message || 'Failed to load metrics.')
          setMetrics(null)
        })
        .finally(() => setMetricsLoading(false))
    } else if (tab === 'topics') {
      moderation.loadTopics()
    } else if (tab === 'feedbacks') {
      moderation.loadFeedback()
    } else if (tab === 'announcements') {
      announcementsAdmin.loadAnnouncements()
    } else if (tab === 'hero') {
      hero.loadHeroEntries()
    }
  }, [tab])

  async function handleAdminBan(userId, current) {
    await adminUsers.handleBan(userId, current)
    support.syncSupportBan(userId, !current)
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
    totalViews: 0,
    totalPlays: 0,
    avgWatchTimeSeconds: 0,
    avgCompletionRate: 0,
    avgVideoStartMs: 0,
    pageLoadAvgMs: 0,
    playerErrors: 0,
    bufferingEvents: 0,
    sessionDrops: 0,
    bannerCtr: 0,
    topClickedAnimes: [],
    clickSources: [],
    countryBreakdown: [],
    topTrackedAnimes: [],
    eventBreakdown: [],
    topAnimeViews: [],
    topEpisodeViews: [],
    topEpisodePlays: [],
    topSearchedAnime: [],
    topWatchlistAdds: [],
    bannerPerformance: [],
    deviceBreakdown: {},
    qualityBreakdown: [],
    viewsSeries: [],
    trendingAnime: [],
  }

  return (
    <div style={{
      padding: '32px 0 60px', maxWidth: 1120, margin: '0 auto',
      display: 'grid', gridTemplateColumns: mobile ? '1fr' : '240px minmax(0, 1fr)', gap: 24,
    }}>
      <AdminMenu T={T} mobile={mobile} tab={tab} setTab={setTab} sections={ADMIN_MENU_SECTIONS} />

      <main style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: T.txt, marginBottom: 16 }}>
          Admin Panel
        </h1>

        {DASHBOARD_TABS.includes(tab) && (
          <>
            {dashboardError && (
              <div style={{ ...card, marginBottom: 14, borderColor: 'rgba(255,59,48,.35)', background: 'rgba(255,59,48,.08)' }}>
                <p style={{ color: '#FF3B30', fontSize: 13, margin: 0 }}>
                  Supabase error: {dashboardError}
                </p>
              </div>
            )}
            <AdminDashboardPanel T={T} loading={dashboardLoading} tab={tab} stats={dashboardStats} card={card} />
          </>
        )}
        {tab === 'attention' && (
          <AdminAttentionPanel
            T={T}
            loading={attentionLoading}
            queue={attentionQueue}
            card={card}
            chip={chip}
            onRefresh={loadAttentionQueue}
            onOpenSupportUser={userId => support.handleOpenSupportUser(userId, setTab)}
          />
        )}
        {tab === 'metrics' && (
          <>
            {metricsError && (
              <div style={{ ...card, marginBottom: 14, borderColor: 'rgba(255,59,48,.35)', background: 'rgba(255,59,48,.08)' }}>
                <p style={{ color: '#FF3B30', fontSize: 13, margin: 0 }}>
                  Supabase error: {metricsError}
                </p>
              </div>
            )}
            <AdminMetricsPanel T={T} loading={metricsLoading} stats={metricStats} card={card} />
          </>
        )}

        {tab === 'topics' && (
          moderation.topicsLoading
            ? <p style={{ color: T.sub }}>Carregando...</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {moderation.topics.length === 0 && <p style={{ color: T.sub }}>Nenhum tópico encontrado.</p>}
              {moderation.topics.map(topic => (
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
                  <button onClick={() => moderation.handleDeleteTopic(topic.id)} style={chip('#FF3B30')}>
                    Deletar
                  </button>
                </div>
              ))}
            </div>
        )}

        {tab === 'feedbacks' && (
          moderation.feedbackLoading
            ? <p style={{ color: T.sub }}>Carregando...</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {moderation.feedback.length === 0 && <p style={{ color: T.sub }}>Nenhum feedback encontrado.</p>}
              {moderation.feedback.map(item => (
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
                    <select value={item.status} onChange={e => moderation.handleFeedbackStatus(item.id, e.target.value)}
                      style={{ ...input, padding: '5px 8px', fontSize: 12 }}>
                      <option value="open">Aberto</option>
                      <option value="reviewing">Em Análise</option>
                      <option value="done">Resolvido</option>
                    </select>
                    <button onClick={() => moderation.handleDeleteFeedback(item.id)} style={chip('#FF3B30')}>
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
            users={adminUsers.users}
            userCount={adminUsers.userCount}
            userPage={adminUsers.userPage}
            userDraft={adminUsers.userDraft}
            usersLoading={adminUsers.usersLoading}
            userQuery={adminUsers.userQuery}
            input={input}
            card={card}
            chip={chip}
            setUserDraft={adminUsers.setUserDraft}
            setUserQuery={adminUsers.setUserQuery}
            setUserPage={adminUsers.setUserPage}
            onSearch={adminUsers.handleUserSearch}
            onPremium={adminUsers.handlePremium}
            onBan={handleAdminBan}
          />
        )}

        {tab === 'support' && (
          <AdminSupportPanel
            T={T}
            mobile={mobile}
            input={input}
            card={card}
            chip={chip}
            query={support.supportQuery}
            results={support.supportResults}
            selected={support.supportDetail}
            loading={support.supportLoading}
            searching={support.supportSearching}
            error={support.supportError}
            setQuery={support.setSupportQuery}
            onSearch={support.handleSupportSearch}
            onSelectUser={support.handleSelectSupportUser}
            onPremium={support.handleSupportPremium}
            onBan={handleAdminBan}
          />
        )}

        {tab === 'hero' && (
          <AdminHeroPanel
            T={T}
            mobile={mobile}
            input={input}
            card={card}
            chip={chip}
            heroMaxItems={hero.heroMaxItems}
            heroSettingsSaving={hero.heroSettingsSaving}
            heroSearch={hero.heroSearch}
            heroSearchLoading={hero.heroSearchLoading}
            heroSearchResults={hero.heroSearchResults}
            heroSearchError={hero.heroSearchError}
            heroFeedback={hero.heroFeedback}
            heroError={hero.heroError}
            newHero={hero.newHero}
            heroSaving={hero.heroSaving}
            heroLoading={hero.heroLoading}
            heroEntries={hero.heroEntries}
            setHeroMaxItems={hero.setHeroMaxItems}
            setHeroSearch={hero.setHeroSearch}
            setNewHero={hero.setNewHero}
            onSaveHeroSettings={hero.handleSaveHeroSettings}
            onHeroSearch={hero.handleHeroSearch}
            onSelectHeroAnime={hero.handleSelectHeroAnime}
            onCreateHero={hero.handleCreateHero}
            onHeroOrder={hero.handleHeroOrder}
            onToggleHero={hero.handleToggleHero}
            onEditHero={hero.handleEditHero}
            onDeleteHero={hero.handleDeleteHero}
          />
        )}

        {tab === 'announcements' && (
          <div>
            <form onSubmit={announcementsAdmin.handleCreateAnn} style={{
              display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24,
              padding: 18, background: T.surf, borderRadius: 14, border: `1px solid ${T.bord}`,
            }}>
              <p style={{ fontWeight: 700, color: T.txt, margin: 0, fontSize: 15 }}>Novo Comunicado</p>
              <textarea
                value={announcementsAdmin.newAnn.content}
                onChange={e => announcementsAdmin.setNewAnn(p => ({ ...p, content: e.target.value }))}
                placeholder="Texto do comunicado..."
                rows={3}
                style={{ ...input, resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select value={announcementsAdmin.newAnn.type} onChange={e => announcementsAdmin.setNewAnn(p => ({ ...p, type: e.target.value }))}
                  style={{ ...input, padding: '8px 10px', fontSize: 13 }}>
                  <option value="info">Info</option>
                  <option value="warning">Aviso</option>
                  <option value="maintenance">Manutenção</option>
                </select>
                <button type="submit" disabled={announcementsAdmin.annSaving}
                  style={{ padding: '9px 22px', background: '#0A84FF', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, cursor: announcementsAdmin.annSaving ? 'default' : 'pointer', opacity: announcementsAdmin.annSaving ? 0.6 : 1 }}>
                  {announcementsAdmin.annSaving ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </form>

            {announcementsAdmin.annLoading
              ? <p style={{ color: T.sub }}>Carregando...</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {announcementsAdmin.announcements.length === 0 && <p style={{ color: T.sub }}>Nenhum comunicado ativo.</p>}
                {announcementsAdmin.announcements.map(a => {
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
                      <button onClick={() => announcementsAdmin.handleDeleteAnn(a.id)} style={chip('#FF3B30')}>
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
