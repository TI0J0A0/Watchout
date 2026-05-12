import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import {
  fetchTopics, deleteTopicWithPosts,
  fetchFeedback, updateFeedbackStatus, deleteFeedback,
} from '../services/community'
import { fetchUsers, grantPremium, revokePremium, toggleBanUser } from '../services/premium'
import { fetchAnnouncements, createAnnouncement, deleteAnnouncement } from '../services/announcements'

const TABS = [
  { id: 'topics',        label: 'Fórum' },
  { id: 'feedbacks',     label: 'Feedbacks' },
  { id: 'users',         label: 'Usuários' },
  { id: 'announcements', label: 'Comunicados' },
]

export function AdminPage() {
  const { T, dark } = useTheme()
  const [tab, setTab] = useState('topics')

  const [topics, setTopics]               = useState([])
  const [topicsLoading, setTopicsLoading] = useState(false)

  const [feedback, setFeedback]                 = useState([])
  const [feedbackLoading, setFeedbackLoading]   = useState(false)

  const [userQuery, setUserQuery]           = useState('')
  const [userDraft, setUserDraft]           = useState('')
  const [users, setUsers]                   = useState([])
  const [userCount, setUserCount]           = useState(0)
  const [userPage, setUserPage]             = useState(0)
  const [usersLoading, setUsersLoading]     = useState(false)

  const [announcements, setAnnouncements]   = useState([])
  const [annLoading, setAnnLoading]         = useState(false)
  const [newAnn, setNewAnn]                 = useState({ content: '', type: 'info' })
  const [annSaving, setAnnSaving]           = useState(false)

  useEffect(() => {
    if (tab === 'topics') {
      setTopicsLoading(true)
      fetchTopics().then(setTopics).finally(() => setTopicsLoading(false))
    } else if (tab === 'feedbacks') {
      setFeedbackLoading(true)
      fetchFeedback().then(setFeedback).finally(() => setFeedbackLoading(false))
    } else if (tab === 'announcements') {
      setAnnLoading(true)
      fetchAnnouncements().then(setAnnouncements).finally(() => setAnnLoading(false))
    }
  }, [tab])

  useEffect(() => {
    if (tab !== 'users') return
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

  const card = {
    padding: 16, borderRadius: 12, background: T.surf,
    border: `1px solid ${T.bord}`, display: 'flex',
    justifyContent: 'space-between', alignItems: 'center',
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

  return (
    <div style={{ padding: '32px 0 60px', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: T.txt, marginBottom: 16 }}>
        Painel de Administração
      </h1>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${T.bord}` }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '10px 20px', background: 'transparent', border: 'none',
            borderBottom: tab === id ? '2px solid #0A84FF' : '2px solid transparent',
            color: tab === id ? T.txt : T.sub, fontWeight: tab === id ? 700 : 500,
            cursor: 'pointer', fontSize: 13.5, transition: 'color .15s',
          }}>{label}</button>
        ))}
      </div>

      {/* ── Fórum ── */}
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

      {/* ── Feedbacks ── */}
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

      {/* ── Usuários ── */}
      {tab === 'users' && (() => {
        const totalPages = Math.ceil(userCount / 20)
        return (
          <div>
            {/* Buscador */}
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
                  ✕
                </button>
              )}
            </form>

            {/* Contador */}
            <p style={{ fontSize: 12, color: T.sub, margin: '0 0 12px' }}>
              {usersLoading ? 'Carregando...' : `${userCount} usuário${userCount !== 1 ? 's' : ''}${userQuery ? ` para "${userQuery}"` : ''}`}
            </p>

            {/* Lista */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!usersLoading && users.length === 0 && (
                <p style={{ color: T.sub }}>Nenhum usuário encontrado.</p>
              )}
              {users.map(u => (
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
                    <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>@{u.username}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handlePremium(u.id, u.is_premium)}
                      style={chip(u.is_premium ? '#FF9F0A' : '#30D158')}>
                      {u.is_premium ? 'Revogar Premium' : 'Dar Premium'}
                    </button>
                    <button onClick={() => handleBan(u.id, u.is_banned)}
                      style={chip(u.is_banned ? '#30D158' : '#FF3B30')}>
                      {u.is_banned ? 'Desbanir' : 'Banir'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
                <button
                  disabled={userPage === 0}
                  onClick={() => setUserPage(p => p - 1)}
                  style={{
                    padding: '8px 18px', borderRadius: 9, border: `1px solid ${T.bord}`,
                    background: T.surf, color: userPage === 0 ? T.sub : T.txt,
                    fontWeight: 600, cursor: userPage === 0 ? 'default' : 'pointer', opacity: userPage === 0 ? 0.4 : 1,
                  }}>
                  ← Anterior
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
                  Próximo →
                </button>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Comunicados ── */}
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
    </div>
  )
}
