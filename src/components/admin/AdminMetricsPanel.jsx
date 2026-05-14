import { AdminEmpty, AdminLoading, AdminSection, AdminStatsGrid } from './shared'

export function AdminMetricsPanel({ T, loading, stats, card }) {
  if (loading) return <AdminLoading color={T.sub} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <AdminStatsGrid
        T={T}
        items={[
          ['Usuarios rastreados', stats.trackedUsers],
          ['Itens rastreados', stats.trackedItems],
          ['Episodios vistos', stats.totalWatchedEpisodes],
          ['Nota media', stats.avgScore ? stats.avgScore.toFixed(1) : '0.0'],
          ['Cliques em anime', stats.totalClicks],
          ['Likes/votos', stats.totalLikes],
          ['Notas escritas', stats.notesCount],
        ]}
      />

      <AdminSection T={T} title="Animes mais clicados">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.topClickedAnimes.length === 0 && <AdminEmpty color={T.sub}>Nenhum clique rastreado ainda.</AdminEmpty>}
          {stats.topClickedAnimes.map(item => (
            <div key={item.animeId} style={card}>
              <div style={{ minWidth: 0, paddingRight: 12 }}>
                <p style={{ fontWeight: 700, color: T.txt, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </p>
                <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>Anime #{item.animeId}</p>
              </div>
              <span style={{ fontSize: 13, color: T.sub, whiteSpace: 'nowrap' }}>{item.clicks} cliques</span>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection T={T} title="Origem dos cliques">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.clickSources.length === 0 && <AdminEmpty color={T.sub}>Nenhuma origem registrada ainda.</AdminEmpty>}
          {stats.clickSources.map(item => (
            <div key={item.source} style={card}>
              <span style={{ color: T.txt, fontWeight: 700 }}>{item.source}</span>
              <span style={{ fontSize: 13, color: T.sub, whiteSpace: 'nowrap' }}>{item.clicks} cliques</span>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection T={T} title="Pais de acesso">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.countryBreakdown.length === 0 && <AdminEmpty color={T.sub}>Nenhum pais registrado ainda.</AdminEmpty>}
          {stats.countryBreakdown.map(item => (
            <div key={item.country} style={card}>
              <span style={{ color: T.txt, fontWeight: 700 }}>{item.country}</span>
              <span style={{ fontSize: 13, color: T.sub, whiteSpace: 'nowrap' }}>{item.events} eventos</span>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection T={T} title="Animes mais acompanhados">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.topTrackedAnimes.length === 0 && <AdminEmpty color={T.sub}>Nenhum tracking de anime ainda.</AdminEmpty>}
          {stats.topTrackedAnimes.map(item => (
            <div key={item.animeId} style={card}>
              <div style={{ minWidth: 0, paddingRight: 12 }}>
                <p style={{ fontWeight: 700, color: T.txt, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </p>
                <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>
                  {item.completed} concluidos · {item.progress} eps de progresso
                </p>
              </div>
              <span style={{ fontSize: 13, color: T.sub, whiteSpace: 'nowrap' }}>{item.users} usuarios</span>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection T={T} title="Eventos rastreados">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.eventBreakdown.length === 0 && <AdminEmpty color={T.sub}>Nenhum evento coletado ainda.</AdminEmpty>}
          {stats.eventBreakdown.map(item => (
            <div key={item.type} style={card}>
              <span style={{ color: T.txt, fontWeight: 700 }}>{item.type}</span>
              <span style={{ fontSize: 13, color: T.sub, whiteSpace: 'nowrap' }}>{item.count}</span>
            </div>
          ))}
        </div>
      </AdminSection>
    </div>
  )
}
