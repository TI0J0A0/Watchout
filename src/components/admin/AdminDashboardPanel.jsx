import { AdminEmpty, AdminLoading, AdminSection, AdminStatsGrid, formatAdminDate } from './shared'

export function AdminDashboardPanel({ T, loading, tab, stats, card }) {
  if (loading) return <AdminLoading color={T.sub} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <AdminStatsGrid
        T={T}
        valueSize={26}
        items={[
          ['Usuários totais', stats.totalUsers],
          ['Usuários ativos', stats.activeUsers],
          ['Premium', stats.premiumUsers],
          ['Banidos/suspensos', stats.bannedUsers],
        ]}
      />

      {(tab === 'dashboard' || tab === 'topContent') && (
        <AdminSection T={T} title="Conteúdos mais vistos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.topContent.length === 0 && (
              <AdminEmpty color={T.sub}>Nenhum conteúdo com visualizações encontrado.</AdminEmpty>
            )}
            {stats.topContent.map(item => (
              <div key={item.id} style={card}>
                <div style={{ minWidth: 0, paddingRight: 12 }}>
                  <p style={{ fontWeight: 700, color: T.txt, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </p>
                  <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>
                    {item.watchingUsers ?? 0} assistindo · {item.completedUsers ?? 0} concluidos · {item.reply_count ?? 0} eps registrados
                  </p>
                </div>
                <span style={{ fontSize: 13, color: T.sub, whiteSpace: 'nowrap' }}>
                  {item.views ?? 0} usuarios
                </span>
              </div>
            ))}
          </div>
        </AdminSection>
      )}

      {(tab === 'dashboard' || tab === 'recentErrors') && (
        <AdminSection T={T} title="Erros recentes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.recentErrors.length === 0 && (
              <div style={{ padding: 16, borderRadius: 12, background: T.surf, border: `1px solid ${T.bord}`, color: T.sub }}>
                Nenhum erro recente encontrado.
              </div>
            )}
            {stats.recentErrors.map(error => (
              <div key={error.id} style={{ ...card, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0, paddingRight: 12 }}>
                  <p style={{ fontWeight: 700, color: T.txt, margin: '0 0 4px' }}>
                    {error.message}
                  </p>
                  <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>
                    {error.source || 'Sem origem'} · {formatAdminDate(error.created_at)}
                  </p>
                </div>
                {error.metadata && (
                  <span style={{ fontSize: 11, color: T.sub, whiteSpace: 'nowrap' }}>
                    metadata
                  </span>
                )}
              </div>
            ))}
          </div>
        </AdminSection>
      )}
    </div>
  )
}
