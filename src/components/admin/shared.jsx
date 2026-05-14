export function formatAdminDate(value) {
  if (!value) return 'Sem data'
  return new Date(value).toLocaleString('pt-BR')
}

export function createAdminStyles(T, dark, mobile) {
  const card = {
    padding: 16,
    borderRadius: 12,
    background: T.surf,
    border: `1px solid ${T.bord}`,
    display: 'flex',
    flexDirection: mobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: mobile ? 'stretch' : 'center',
    gap: mobile ? 12 : 0,
  }

  const input = {
    padding: '10px 14px',
    borderRadius: 10,
    fontSize: 14,
    background: dark ? '#1c1c1e' : '#f5f5f7',
    border: `1px solid ${T.bord}`,
    color: T.txt,
  }

  const chip = (color) => ({
    padding: '6px 12px',
    background: `${color}22`,
    color,
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 12,
    whiteSpace: 'nowrap',
  })

  return { card, input, chip }
}

export function AdminLoading({ color }) {
  return <p style={{ color }}>Carregando...</p>
}

export function AdminEmpty({ color, children }) {
  return <p style={{ color }}>{children}</p>
}

export function AdminStatsGrid({ T, items, valueSize = 24 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      {items.map(([label, value]) => (
        <div key={label} style={{ padding: 16, borderRadius: 12, background: T.surf, border: `1px solid ${T.bord}` }}>
          <p style={{ fontSize: 12, color: T.sub, margin: '0 0 6px' }}>{label}</p>
          <p style={{ fontSize: valueSize, color: T.txt, fontWeight: 800, margin: 0 }}>{value}</p>
        </div>
      ))}
    </div>
  )
}

export function AdminSection({ T, title, children }) {
  return (
    <section>
      <h2 style={{ fontSize: 18, color: T.txt, margin: '6px 0 10px' }}>{title}</h2>
      {children}
    </section>
  )
}
