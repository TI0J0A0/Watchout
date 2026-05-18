import { useTheme } from '../../context/ThemeContext'

export function Chip({ children, active = false, tone = '#0A84FF', style, ...props }) {
  const { T, dark } = useTheme()
  return (
    <button
      type="button"
      className="pill t"
      style={{
        minHeight: 34,
        padding: '7px 13px',
        borderRadius: 999,
        border: `1px solid ${active ? `${tone}66` : T.bord}`,
        background: active ? `${tone}22` : (dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)'),
        color: active ? tone : T.sub,
        fontSize: 12.5,
        fontWeight: active ? 800 : 650,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
