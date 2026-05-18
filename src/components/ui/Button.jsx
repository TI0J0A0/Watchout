import { useTheme } from '../../context/ThemeContext'

export function Button({ children, variant = 'secondary', size = 'md', style, disabled = false, ...props }) {
  const { T, dark } = useTheme()
  const primary = variant === 'primary'
  const danger = variant === 'danger'
  const ghost = variant === 'ghost'
  const compact = size === 'sm'

  return (
    <button
      type="button"
      disabled={disabled}
      className="t"
      style={{
        minHeight: compact ? 34 : 40,
        padding: compact ? '7px 12px' : '10px 16px',
        borderRadius: 10,
        border: ghost ? '1px solid transparent' : `1px solid ${primary ? 'rgba(10,132,255,.45)' : T.bord}`,
        background: primary
          ? '#0A84FF'
          : danger
            ? 'rgba(255,59,48,.12)'
            : ghost
              ? 'transparent'
              : T.surf,
        color: primary ? '#fff' : danger ? '#FF3B30' : T.txt,
        boxShadow: primary && !dark ? '0 10px 24px rgba(10,132,255,.18)' : 'none',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        fontSize: compact ? 12 : 13,
        fontWeight: 750,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}

export function IconButton({ label, children, style, ...props }) {
  const { T } = useTheme()
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="t"
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: `1px solid ${T.bord}`,
        background: T.surf,
        color: T.sub,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
