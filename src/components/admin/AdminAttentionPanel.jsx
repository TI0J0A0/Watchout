import { AdminEmpty, AdminLoading, AdminSection, AdminStatsGrid, formatAdminDate } from './shared'

const SEVERITY = {
  critical: { label: 'Critico', color: '#FF3B30' },
  high: { label: 'Alto', color: '#FF9F0A' },
  medium: { label: 'Medio', color: '#0A84FF' },
  low: { label: 'Baixo', color: '#8E8E93' },
}

const TYPE_LABEL = {
  recent_error: 'Erro',
  feedback_bug: 'Bug reportado',
  feedback_open: 'Feedback',
  library_issue: 'Biblioteca',
  banned_user: 'Usuario banido',
}

function SeverityBadge({ severity }) {
  const meta = SEVERITY[severity] ?? SEVERITY.medium
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 800,
      padding: '2px 7px',
      borderRadius: 4,
      color: meta.color,
      background: `${meta.color}22`,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  )
}

export function AdminAttentionPanel({
  T,
  loading,
  queue,
  card,
  chip,
  onRefresh,
  onOpenSupportUser,
}) {
  const summary = queue?.summary ?? { total: 0, critical: 0, high: 0, medium: 0, low: 0 }
  const items = queue?.items ?? []

  if (loading) return <AdminLoading color={T.sub} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, color: T.txt, margin: '0 0 4px' }}>Precisa de atenção</h2>
          <p style={{ fontSize: 13, color: T.sub, margin: 0 }}>
            Fila automatica para revisar problemas sem procurar em cada tela.
          </p>
        </div>
        <button type="button" onClick={onRefresh} style={chip('#0A84FF')}>
          Atualizar fila
        </button>
      </div>

      <AdminStatsGrid
        T={T}
        items={[
          ['Total', summary.total],
          ['Criticos', summary.critical],
          ['Alta prioridade', summary.high],
          ['Media', summary.medium],
          ['Baixa', summary.low],
        ]}
      />

      <AdminSection T={T} title="Itens para revisar">
        {items.length === 0 ? (
          <div style={{ padding: 18, borderRadius: 12, background: T.surf, border: `1px solid ${T.bord}` }}>
            <AdminEmpty color={T.sub}>Nada urgente encontrado agora.</AdminEmpty>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(item => (
              <div key={item.id} style={{ ...card, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0, flex: 1, paddingRight: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                    <SeverityBadge severity={item.severity} />
                    <span style={{ fontSize: 11, color: T.sub, fontWeight: 700, textTransform: 'uppercase' }}>
                      {TYPE_LABEL[item.type] ?? item.type}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: T.txt, margin: '0 0 4px' }}>
                    {item.title}
                  </p>
                  <p style={{ fontSize: 13, color: T.sub, margin: 0, lineHeight: 1.5 }}>
                    {item.detail}
                  </p>
                  <p style={{ fontSize: 11, color: T.sub, margin: '7px 0 0' }}>
                    {formatAdminDate(item.createdAt)}
                  </p>
                </div>
                {item.userId && (
                  <button type="button" onClick={() => onOpenSupportUser(item.userId)} style={chip('#0A84FF')}>
                    Abrir ficha
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </AdminSection>
    </div>
  )
}
