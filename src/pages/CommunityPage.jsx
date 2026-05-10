import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { AVATAR_GRADS } from '../constants'
import {
  fetchTopics, fetchTopic, fetchPosts,
  createTopic, createPost, deleteTopic, deletePost,
  fetchFeedback, createFeedback, toggleVote, fetchMyVotes, updateFeedbackStatus,
} from '../services/community'
import { isAdmin } from '../services/premium'

const TYPE_LABEL = { idea: 'Idea', bug: 'Bug', other: 'Other' }
const TYPE_COLOR = { idea: '#34C759', bug: '#FF3B30', other: '#0A84FF' }
const STATUS_LABEL = { open: 'Open', reviewing: 'Under review', done: 'Resolved' }
const STATUS_COLOR = { open: '#FF9F0A', reviewing: '#0A84FF', done: '#34C759' }

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  return `${Math.floor(d / 30)}mo`
}

function Avatar({ profile, size = 32 }) {
  const grad = AVATAR_GRADS[profile?.avatar_grad ?? 0] ?? AVATAR_GRADS[0]
  const label = (profile?.display_name || profile?.username || '?').slice(0, 2).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg,${grad[0]},${grad[1]})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff',
    }}>{label}</div>
  )
}

// ── Forum ─────────────────────────────────────────────────────────────────────

function TopicsList({ onOpen, onNew, T, dark }) {
  const [topics, setTopics]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTopics().then(setTopics).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ color: T.sub, fontSize: 14 }}>Loading topics…</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: T.sub }}>{topics.length} topic{topics.length !== 1 ? 's' : ''}</p>
        <button onClick={onNew} style={{
          padding: '8px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: '#0A84FF', color: '#fff', fontSize: 13, fontWeight: 600,
        }}>+ New Topic</button>
      </div>

      {topics.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: T.sub }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>💬</p>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No topics yet</p>
          <p style={{ fontSize: 13 }}>Be the first to start a discussion!</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {topics.map(topic => (
          <div key={topic.id} onClick={() => onOpen(topic.id)}
            className="t"
            style={{
              padding: '16px 20px', borderRadius: 16, cursor: 'pointer',
              background: T.surf, border: `1px solid ${T.bord}`,
              transition: 'border-color .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#0A84FF55'}
            onMouseLeave={e => e.currentTarget.style.borderColor = T.bord}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Avatar profile={topic.profiles} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                  {topic.anime_title && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                      background: '#0A84FF20', color: '#0A84FF',
                    }}>{topic.anime_title}</span>
                  )}
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: T.txt, marginBottom: 6,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {topic.title}
                </p>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: T.sub }}>
                  <span>{topic.profiles?.display_name || topic.profiles?.username || 'Anonymous'}</span>
                  <span>💬 {topic.reply_count}</span>
                  <span>👁 {topic.views}</span>
                  <span>{timeAgo(topic.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopicDetail({ topicId, user, onLogin, onBack, T, dark }) {
  const [topic,   setTopic]   = useState(null)
  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [reply,   setReply]   = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchTopic(topicId), fetchPosts(topicId)])
      .then(([t, p]) => { setTopic(t); setPosts(p) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [topicId])

  async function handleReply() {
    if (!reply.trim() || !user) return
    setSending(true)
    try {
      await createPost({ userId: user.id, topicId, content: reply.trim() })
      const updated = await fetchPosts(topicId)
      setPosts(updated)
      setReply('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch {}
    setSending(false)
  }

  async function handleDeletePost(id) {
    await deletePost(id)
    setPosts(p => p.filter(x => x.id !== id))
  }

  async function handleDeleteTopic() {
    await deleteTopic(topicId)
    onBack()
  }

  if (loading) return <p style={{ color: T.sub, fontSize: 14 }}>Loading…</p>
  if (!topic)  return <p style={{ color: T.sub, fontSize: 14 }}>Topic not found.</p>

  return (
    <div>
      <button onClick={onBack} style={{
        marginBottom: 20, padding: '6px 14px', borderRadius: 20, border: 'none',
        background: dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)',
        color: T.sub, fontSize: 13, cursor: 'pointer',
      }}>← Back</button>

      {/* OP */}
      <div style={{ padding: '20px', borderRadius: 16, background: T.surf, border: `1px solid ${T.bord}`, marginBottom: 16 }}>
        {topic.anime_title && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: '#0A84FF20', color: '#0A84FF', display: 'inline-block', marginBottom: 10,
          }}>{topic.anime_title}</span>
        )}
        <h2 style={{ fontSize: 20, fontWeight: 700, color: T.txt, marginBottom: 14 }}>{topic.title}</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Avatar profile={topic.profiles} size={36} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.txt }}>
                {topic.profiles?.display_name || topic.profiles?.username || 'Anonymous'}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: T.sub }}>{timeAgo(topic.created_at)}</span>
                {user?.id === topic.user_id && (
                  <button onClick={handleDeleteTopic}
                    style={{ fontSize: 12, color: '#FF3B30', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Delete
                  </button>
                )}
              </div>
            </div>
            <p style={{ fontSize: 14, color: T.txt, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{topic.content}</p>
          </div>
        </div>
      </div>

      {/* Replies */}
      {posts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {posts.map((post, i) => (
            <div key={post.id} style={{
              padding: '16px', borderRadius: 14, marginLeft: 20,
              background: dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)',
              border: `1px solid ${T.bord}`,
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Avatar profile={post.profiles} size={30} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.txt }}>
                        {post.profiles?.display_name || post.profiles?.username || 'Anonymous'}
                      </span>
                      <span style={{ fontSize: 11, color: T.sub }}>#{i + 1}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: T.sub }}>{timeAgo(post.created_at)}</span>
                      {user?.id === post.user_id && (
                        <button onClick={() => handleDeletePost(post.id)}
                          style={{ fontSize: 12, color: '#FF3B30', background: 'none', border: 'none', cursor: 'pointer' }}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: T.txt, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{post.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={bottomRef} />

      {/* Reply form */}
      {user ? (
        <div style={{ padding: '16px', borderRadius: 16, background: T.surf, border: `1px solid ${T.bord}` }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Avatar profile={null} size={32} />
            <div style={{ flex: 1 }}>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Write your reply…"
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13,
                  background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)',
                  border: `1px solid ${T.bord}`, color: T.txt, resize: 'vertical',
                  fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box', outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={handleReply} disabled={!reply.trim() || sending}
                  style={{
                    padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: reply.trim() ? '#0A84FF' : (dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)'),
                    color: reply.trim() ? '#fff' : T.sub, fontSize: 13, fontWeight: 600,
                  }}>
                  {sending ? 'Sending…' : 'Reply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '24px', borderRadius: 14,
          background: dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)', border: `1px dashed ${T.bord}` }}>
          <p style={{ fontSize: 13, color: T.sub, marginBottom: 12 }}>Sign in to reply in this topic.</p>
          <button onClick={onLogin} style={{
            padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: '#0A84FF', color: '#fff', fontSize: 13, fontWeight: 600,
          }}>Sign in</button>
        </div>
      )}
    </div>
  )
}

function NewTopicForm({ user, onCreated, onCancel, T, dark }) {
  const [title,      setTitle]      = useState('')
  const [content,    setContent]    = useState('')
  const [animeTitle, setAnimeTitle] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  async function handleSubmit() {
    if (!title.trim() || !content.trim()) { setError('Title and content are required.'); return }
    setSaving(true)
    try {
      const id = await createTopic({
        userId: user.id, title: title.trim(), content: content.trim(),
        animeTitle: animeTitle.trim() || null,
      })
      onCreated(id)
    } catch { setError('Error creating topic. Please try again.') }
    setSaving(false)
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14,
    background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)',
    border: `1px solid ${T.bord}`, color: T.txt, fontFamily: 'inherit',
    boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: T.txt }}>New Topic</h2>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: T.sub, fontSize: 20, cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <p style={{ fontSize: 12, color: T.sub, marginBottom: 6, fontWeight: 500 }}>Related anime (optional)</p>
          <input value={animeTitle} onChange={e => setAnimeTitle(e.target.value)}
            placeholder="Ex: Frieren, Solo Leveling…"
            style={inputStyle} />
        </div>
        <div>
          <p style={{ fontSize: 12, color: T.sub, marginBottom: 6, fontWeight: 500 }}>Title *</p>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Topic title"
            style={inputStyle} />
        </div>
        <div>
          <p style={{ fontSize: 12, color: T.sub, marginBottom: 6, fontWeight: 500 }}>Content *</p>
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="Write your message…"
            rows={6}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }} />
        </div>

        {error && <p style={{ fontSize: 13, color: '#FF3B30' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '9px 20px', borderRadius: 10, border: `1px solid ${T.bord}`,
            background: 'transparent', color: T.sub, fontSize: 13, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            style={{
              padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: '#0A84FF', color: '#fff', fontSize: 13, fontWeight: 600,
            }}>
            {saving ? 'Creating…' : 'Create topic'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Feedback ──────────────────────────────────────────────────────────────────

function FeedbackSection({ user, onLogin, T, dark }) {
  const [items,   setItems]   = useState([])
  const [myVotes, setMyVotes] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter,  setFilter]  = useState('all')

  const admin = isAdmin(user)

  useEffect(() => {
    Promise.all([fetchFeedback(), fetchMyVotes(user?.id)])
      .then(([f, v]) => { setItems(f); setMyVotes(v) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.id])

  async function handleVote(item) {
    if (!user) { onLogin?.(); return }
    const hasVoted = myVotes.has(item.id)
    const newVotes = await toggleVote(item.id, user.id, item.votes, hasVoted)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, votes: newVotes } : i))
    setMyVotes(prev => {
      const next = new Set(prev)
      hasVoted ? next.delete(item.id) : next.add(item.id)
      return next
    })
  }

  async function handleStatus(id, status) {
    await updateFeedbackStatus(id, status)
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'idea', 'bug', 'other'].map(f => (
            <button key={f} className="t" onClick={() => setFilter(f)}
              style={{
                padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: filter === f ? '#0A84FF' : (dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)'),
                color: filter === f ? '#fff' : T.sub,
              }}>
              {f === 'all' ? 'All' : TYPE_LABEL[f]}
            </button>
          ))}
        </div>
        <button onClick={() => user ? setShowForm(true) : onLogin?.()} style={{
          padding: '8px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
          background: '#34C759', color: '#fff', fontSize: 13, fontWeight: 600,
        }}>+ Send feedback</button>
      </div>

      {showForm && (
        <NewFeedbackForm user={user} T={T} dark={dark}
          onCreated={async () => {
            setShowForm(false)
            const f = await fetchFeedback()
            setItems(f)
          }}
          onCancel={() => setShowForm(false)} />
      )}

      {loading && <p style={{ color: T.sub, fontSize: 14 }}>Loading…</p>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: T.sub }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>💡</p>
          <p style={{ fontSize: 15, fontWeight: 600 }}>No feedback yet</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(item => {
          const voted = myVotes.has(item.id)
          return (
            <div key={item.id} style={{
              padding: '16px 20px', borderRadius: 16, background: T.surf,
              border: `1px solid ${T.bord}`, display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              {/* Vote */}
              <button onClick={() => handleVote(item)} className="t"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  padding: '8px 12px', borderRadius: 12, border: 'none', cursor: user ? 'pointer' : 'default',
                  background: voted ? '#0A84FF18' : (dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)'),
                  color: voted ? '#0A84FF' : T.sub, flexShrink: 0,
                }}>
                <span style={{ fontSize: 16 }}>▲</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{item.votes}</span>
              </button>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: `${TYPE_COLOR[item.type]}20`, color: TYPE_COLOR[item.type],
                  }}>{TYPE_LABEL[item.type]}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: `${STATUS_COLOR[item.status]}20`, color: STATUS_COLOR[item.status],
                  }}>{STATUS_LABEL[item.status]}</span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: T.txt, marginBottom: 4 }}>{item.title}</p>
                <p style={{ fontSize: 13, color: T.sub, lineHeight: 1.6 }}>{item.description}</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: T.sub }}>
                    {item.profiles?.display_name || item.profiles?.username || 'Anonymous'} · {timeAgo(item.created_at)}
                  </span>
                  {admin && (
                    <select value={item.status} onChange={e => handleStatus(item.id, e.target.value)}
                      style={{
                        fontSize: 11, padding: '2px 6px', borderRadius: 6,
                        border: `1px solid ${T.bord}`, background: T.surf2, color: T.txt, cursor: 'pointer',
                      }}>
                      <option value="open">Open</option>
                      <option value="reviewing">Under review</option>
                      <option value="done">Resolved</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NewFeedbackForm({ user, onCreated, onCancel, T, dark }) {
  const [type,    setType]    = useState('idea')
  const [title,   setTitle]   = useState('')
  const [desc,    setDesc]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    if (!title.trim() || !desc.trim()) { setError('Título e descrição são obrigatórios.'); return }
    setSaving(true)
    setError('')
    try {
      await createFeedback({ userId: user.id, type, title: title.trim(), description: desc.trim() })
      setSuccess(true)
      setTimeout(() => onCreated(), 1500)
    } catch { setError('Erro ao enviar. Tente novamente.') }
    setSaving(false)
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14,
    background: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)',
    border: `1px solid ${T.bord}`, color: T.txt, fontFamily: 'inherit',
    boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div style={{
      padding: 20, borderRadius: 16, background: dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.03)',
      border: `1px solid ${T.bord}`, marginBottom: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: T.txt }}>Send feedback</p>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: T.sub, fontSize: 18, cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['idea', 'bug', 'other'].map(t => (
            <button key={t} className="t" onClick={() => setType(t)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: type === t ? `${TYPE_COLOR[t]}22` : (dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)'),
                color: type === t ? TYPE_COLOR[t] : T.sub,
                outline: type === t ? `1.5px solid ${TYPE_COLOR[t]}60` : 'none',
              }}>{TYPE_LABEL[t]}</button>
          ))}
        </div>

        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Title" style={inputStyle} />

        <textarea value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="Describe in detail…" rows={4}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />

        {error && <p style={{ fontSize: 13, color: '#FF3B30' }}>{error}</p>}

        {success && (
          <div style={{
            padding: '12px 16px', borderRadius: 12,
            background: 'rgba(48,209,88,.12)', border: '1px solid rgba(48,209,88,.3)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>✓</span>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#30D158' }}>
              Ticket enviado! Nossa equipe vai analisar em breve.
            </p>
          </div>
        )}

        {!success && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onCancel} style={{
              padding: '8px 18px', borderRadius: 10, border: `1px solid ${T.bord}`,
              background: 'transparent', color: T.sub, fontSize: 13, cursor: 'pointer',
            }}>Cancelar</button>
            <button onClick={handleSubmit} disabled={saving}
              style={{
                padding: '8px 18px', borderRadius: 10, border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                background: '#34C759', color: '#fff', fontSize: 13, fontWeight: 600,
                opacity: saving ? .6 : 1,
              }}>
              {saving ? 'Enviando…' : 'Enviar ticket'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function LoginBanner({ onLogin, T, dark }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', borderRadius: 14, marginBottom: 24,
      background: dark ? 'rgba(10,132,255,.12)' : 'rgba(10,132,255,.08)',
      border: '1px solid rgba(10,132,255,.25)',
    }}>
      <p style={{ fontSize: 13, color: '#0A84FF', fontWeight: 500 }}>
        Sign in to create topics, reply and vote.
      </p>
      <button onClick={onLogin} style={{
        padding: '7px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: '#0A84FF', color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0,
      }}>Sign in</button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CommunityPage({ onLogin }) {
  const { T, dark }   = useTheme()
  const { user }      = useAuth()
  const [tab, setTab] = useState('forum')

  // Forum sub-state
  const [forumView,    setForumView]    = useState('list') // 'list' | 'topic' | 'new'
  const [activeTopicId, setActiveTopicId] = useState(null)

  function openTopic(id) { setActiveTopicId(id); setForumView('topic') }
  function backToList()  { setActiveTopicId(null); setForumView('list') }

  return (
    <div className="main-content" style={{ padding: '0 28px 60px', maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ paddingTop: 32, marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: T.txt, letterSpacing: '-.03em', marginBottom: 6 }}>
          Community
        </h1>
        <p style={{ fontSize: 14, color: T.sub }}>Discuss anime, send suggestions or report bugs.</p>
      </div>

      {/* Login banner for guests */}
      {!user && <LoginBanner onLogin={onLogin} T={T} dark={dark} />}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28,
        borderBottom: `1px solid ${T.bord}`, paddingBottom: 0 }}>
        {[['forum', '💬 Forum'], ['feedback', '💡 Feedback']].map(([id, label]) => (
          <button key={id} className="t" onClick={() => { setTab(id); backToList() }}
            style={{
              padding: '10px 20px', borderRadius: '12px 12px 0 0', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: tab === id ? 700 : 500,
              background: tab === id ? T.surf : 'transparent',
              color: tab === id ? T.txt : T.sub,
              borderBottom: tab === id ? `2px solid #0A84FF` : '2px solid transparent',
              marginBottom: -1,
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Forum */}
      {tab === 'forum' && (
        <>
          {forumView === 'list' && (
            <TopicsList
              onOpen={openTopic}
              onNew={() => user ? setForumView('new') : onLogin?.()}
              T={T} dark={dark}
            />
          )}
          {forumView === 'topic' && (
            <TopicDetail topicId={activeTopicId} user={user} onLogin={onLogin} onBack={backToList} T={T} dark={dark} />
          )}
          {forumView === 'new' && (
            <NewTopicForm
              user={user}
              onCreated={(id) => openTopic(id)}
              onCancel={backToList}
              T={T} dark={dark}
            />
          )}
        </>
      )}

      {/* Feedback */}
      {tab === 'feedback' && (
        <FeedbackSection user={user} onLogin={onLogin} T={T} dark={dark} />
      )}
    </div>
  )
}
