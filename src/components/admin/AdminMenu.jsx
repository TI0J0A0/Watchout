export function AdminMenu({ T, mobile, tab, setTab, sections }) {
  return (
    <aside style={{
      alignSelf: 'start',
      position: mobile ? 'static' : 'sticky',
      top: 82,
      padding: 16,
      borderRadius: 14,
      background: T.surf,
      border: `1px solid ${T.bord}`,
    }}>
      <p style={{ fontSize: 18, fontWeight: 800, color: T.txt, margin: '0 0 18px' }}>
        Admin Menu
      </p>
      {sections.map(section => (
        <div key={section.title} style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: T.sub, margin: '0 0 8px', textTransform: 'uppercase' }}>
            {section.title}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {section.items.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)} style={{
                width: '100%',
                padding: '9px 10px',
                borderRadius: 8,
                border: 'none',
                background: tab === item.id ? '#0A84FF22' : 'transparent',
                color: tab === item.id ? '#0A84FF' : T.txt,
                fontWeight: tab === item.id ? 700 : 500,
                cursor: 'pointer',
                fontSize: 13,
                textAlign: 'left',
              }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  )
}
