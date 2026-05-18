import { useTheme } from '../../context/ThemeContext'

export function EmptyState({ icon = '◎', title, description, action, style }) {
  const { T } = useTheme()
  return (
    <div style={{ textAlign: 'center', padding: '44px 18px', color: T.sub, ...style }}>
      <div style={{
        width: 54,
        height: 54,
        margin: '0 auto 14px',
        borderRadius: '50%',
        border: `1px solid ${T.bord}`,
        background: T.surf,
        color: T.sub,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
      }}>
        {icon}
      </div>
      {title && <p style={{ color: T.txt, fontSize: 16, fontWeight: 800, margin: '0 0 5px' }}>{title}</p>}
      {description && <p style={{ fontSize: 13, lineHeight: 1.5, margin: '0 auto', maxWidth: 360 }}>{description}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}
