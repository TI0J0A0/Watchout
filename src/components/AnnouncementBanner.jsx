import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { fetchAnnouncements } from '../services/announcements'

const TYPE_CONFIG = {
  info:        { bg: 'rgba(10,132,255,.1)',  border: '#0A84FF40', color: '#0A84FF', icon: 'ℹ' },
  warning:     { bg: 'rgba(255,159,10,.1)',  border: '#FF9F0A40', color: '#FF9F0A', icon: '⚠' },
  maintenance: { bg: 'rgba(255,59,48,.1)',   border: '#FF3B3040', color: '#FF3B30', icon: '⚙' },
}

export function AnnouncementBanner({ page }) {
  const { T } = useTheme()
  const [items, setItems]         = useState([])
  const [dismissed, setDismissed] = useState(new Set())

  useEffect(() => {
    fetchAnnouncements().then(setItems).catch(() => {})
  }, [page])

  const visible = items.filter(i => !dismissed.has(i.id))
  if (!visible.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 28px 0' }}>
      {visible.map(item => {
        const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.info
        return (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 10,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
          }}>
            <span style={{ fontSize: 14, color: cfg.color, flexShrink: 0 }}>{cfg.icon}</span>
            <p style={{ flex: 1, fontSize: 13.5, color: cfg.color, fontWeight: 500, margin: 0 }}>
              {item.content}
            </p>
            <button
              onClick={() => setDismissed(prev => new Set([...prev, item.id]))}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: cfg.color, fontSize: 18, lineHeight: 1,
                padding: '0 4px', opacity: 0.6, flexShrink: 0,
              }}
            >×</button>
          </div>
        )
      })}
    </div>
  )
}
