// src/components/NotificationBell.jsx
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useClickOutside } from '../hooks/useClickOutside'
import { fetchNotifications, markRead, markAllRead } from '../services/notifications'
import { supabase } from '../services/supabase'

const TYPE_ICONS = {
  friend_request: '👤',
  new_episode:    '▶',
  system:         '📢',
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function NotificationBell({ userId }) {
  const { T, dark } = useTheme()
  const [open, setOpen]     = useState(false)
  const [notifs, setNotifs] = useState([])
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false))

  useEffect(() => {
    fetchNotifications(userId).then(setNotifs).catch(() => {})
  }, [userId])

  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel(`notifs:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        setNotifs(prev => [payload.new, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const unread = notifs.filter(n => !n.read).length

  const handleClick = async (n) => {
    if (!n.read) {
      await markRead(n.id)
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    }
    setOpen(false)
  }

  const handleMarkAll = async () => {
    await markAllRead(userId)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="t" onClick={() => setOpen(o => !o)}
        style={{
          width: 32, height: 32, borderRadius: '50%', border: `1px solid ${T.bord}`,
          background: T.surf, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, position: 'relative',
        }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.sub}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
            background: '#FF3B30', color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1, boxSizing: 'border-box',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="sc" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 'min(320px, calc(100vw - 20px))', maxHeight: 420, overflowY: 'auto',
          background: T.surf, borderRadius: 14, border: `1px solid ${T.bord}`,
          boxShadow: `0 10px 40px rgba(0,0,0,${dark ? .4 : .14})`,
          zIndex: 300,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px 8px', borderBottom: `1px solid ${T.bord}`,
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: T.txt }}>Notifications</p>
            {unread > 0 && (
              <button className="t" onClick={handleMarkAll}
                style={{
                  fontSize: 11, fontWeight: 600, color: '#0A84FF',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
                }}>
                Mark all as read
              </button>
            )}
          </div>

          {notifs.length === 0 ? (
            <p style={{ padding: '20px 14px', fontSize: 13, color: T.sub, textAlign: 'center' }}>
              No notifications
            </p>
          ) : (
            notifs.map(n => (
              <div key={n.id} onClick={() => handleClick(n)}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  background: n.read
                    ? 'transparent'
                    : (dark ? 'rgba(10,132,255,.08)' : 'rgba(10,132,255,.05)'),
                  borderBottom: `1px solid ${T.bord}`,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                }}>
                <span style={{ fontSize: 18, lineHeight: 1.3, flexShrink: 0 }}>
                  {TYPE_ICONS[n.type] ?? '📢'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 13, fontWeight: n.read ? 500 : 700, color: T.txt,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{n.title}</p>
                  {n.body && (
                    <p style={{
                      fontSize: 12, color: T.sub, marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{n.body}</p>
                  )}
                </div>
                <span style={{ fontSize: 11, color: T.sub, flexShrink: 0 }}>
                  {timeAgo(n.created_at)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
