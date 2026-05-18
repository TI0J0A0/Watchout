import { useTheme } from '../../context/ThemeContext'

export function LoadingState({ label = 'Loading...', style }) {
  const { T } = useTheme()
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '38px 0', color: T.sub, ...style }}>
      <span className="ui-spinner" style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        border: `3px solid ${T.bord}`,
        borderTopColor: '#0A84FF',
      }} />
      <span style={{ fontSize: 13, fontWeight: 650 }}>{label}</span>
    </div>
  )
}
