import { AdminEmpty, AdminLoading, AdminSection, AdminStatsGrid, formatAdminDate } from './shared'

const STATUS_LABEL = {
  watching: 'Assistindo',
  plan_to_watch: 'Planejo',
  completed: 'Concluido',
  dropped: 'Dropado',
}

const DIAGNOSTIC_COLOR = {
  warning: '#FF9F0A',
  info: '#0A84FF',
  danger: '#FF3B30',
}

function truncate(value = '', max = 120) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value
}

function Badge({ children, color }) {
  return (
    <span style={{
      fontSize: 10,
      background: `${color}22`,
      color,
      padding: '2px 6px',
      borderRadius: 4,
      fontWeight: 800,
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function SupportList({ T, items, empty, renderItem }) {
  if (!items?.length) return <AdminEmpty color={T.sub}>{empty}</AdminEmpty>
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{items.map(renderItem)}</div>
}

export function AdminSupportPanel({
  T,
  mobile,
  input,
  card,
  chip,
  query,
  results,
  selected,
  loading,
  searching,
  error,
  setQuery,
  onSearch,
  onSelectUser,
  onPremium,
  onBan,
}) {
  const profile = selected?.profile
  const summary = selected?.librarySummary

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <form onSubmit={onSearch} style={{
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: 16,
        background: T.surf,
        border: `1px solid ${T.bord}`,
        borderRadius: 12,
      }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por username, nome ou ID do usuario"
          style={{ ...input, flex: 1, minWidth: mobile ? '100%' : 300 }}
        />
        <button type="submit" style={{
          padding: '10px 18px',
          background: '#0A84FF',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontWeight: 700,
          cursor: searching ? 'default' : 'pointer',
          opacity: searching ? 0.6 : 1,
        }}>
          {searching ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {error && <p style={{ color: '#FF3B30', fontSize: 13, margin: 0 }}>{error}</p>}

      {results.length > 0 && (
        <AdminSection T={T} title="Resultados">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map(user => (
              <div key={user.id} style={card}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: T.txt, fontWeight: 800, margin: '0 0 4px' }}>
                    {user.label}
                  </p>
                  <p style={{ color: T.sub, fontSize: 12, margin: 0 }}>
                    {user.handle} · {user.id}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: mobile ? 'flex-start' : 'flex-end' }}>
                  {user.isPremium && <Badge color="#FF9F0A">Premium</Badge>}
                  {user.isBanned && <Badge color="#FF3B30">Banido</Badge>}
                  <button type="button" onClick={() => onSelectUser(user.id)} style={chip('#0A84FF')}>
                    Abrir ficha
                  </button>
                </div>
              </div>
            ))}
          </div>
        </AdminSection>
      )}

      {loading && <AdminLoading color={T.sub} />}

      {!loading && !profile && (
        <div style={{ padding: 18, borderRadius: 12, background: T.surf, border: `1px solid ${T.bord}`, color: T.sub }}>
          Busque um usuario para abrir a ficha de suporte.
        </div>
      )}

      {!loading && profile && (
        <>
          <AdminSection T={T} title="Resumo da conta">
            <div style={{
              padding: 18,
              borderRadius: 12,
              background: T.surf,
              border: `1px solid ${T.bord}`,
              display: 'flex',
              flexDirection: mobile ? 'column' : 'row',
              gap: 16,
              justifyContent: 'space-between',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                  <h2 style={{ color: T.txt, fontSize: 20, margin: 0 }}>{profile.label}</h2>
                  {profile.isPremium && <Badge color="#FF9F0A">Premium</Badge>}
                  {profile.isBanned && <Badge color="#FF3B30">Banido</Badge>}
                </div>
                <p style={{ color: T.sub, fontSize: 13, margin: '0 0 4px' }}>{profile.handle}</p>
                <p style={{ color: T.sub, fontSize: 12, margin: 0, overflowWrap: 'anywhere' }}>ID: {profile.id}</p>
                <p style={{ color: T.sub, fontSize: 12, margin: '6px 0 0' }}>
                  Criado: {formatAdminDate(profile.created_at)} · Atualizado: {formatAdminDate(profile.updated_at)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignContent: 'flex-start', justifyContent: mobile ? 'flex-start' : 'flex-end' }}>
                <button type="button" onClick={() => navigator.clipboard?.writeText(profile.id)} style={chip('#8E8E93')}>
                  Copiar ID
                </button>
                <button type="button" onClick={() => onPremium(profile.id, profile.isPremium)} style={chip(profile.isPremium ? '#FF9F0A' : '#30D158')}>
                  {profile.isPremium ? 'Revogar Premium' : 'Dar Premium'}
                </button>
                <button type="button" onClick={() => onBan(profile.id, profile.isBanned)} style={chip(profile.isBanned ? '#30D158' : '#FF3B30')}>
                  {profile.isBanned ? 'Desbanir' : 'Banir'}
                </button>
              </div>
            </div>
          </AdminSection>

          <AdminStatsGrid
            T={T}
            items={[
              ['Itens na biblioteca', summary.totalItems],
              ['Episodios registrados', summary.totalEpisodes],
              ['Nota media', summary.avgScore ? summary.avgScore.toFixed(1) : '0.0'],
              ['Amigos', selected.friends.accepted],
              ['Pedidos pendentes', selected.friends.pending],
            ]}
          />

          <AdminSection T={T} title="Diagnostico">
            <SupportList
              T={T}
              items={selected.diagnostics}
              empty="Nenhum alerta automatico encontrado."
              renderItem={item => {
                const color = DIAGNOSTIC_COLOR[item.severity] ?? '#0A84FF'
                return (
                  <div key={item.code} style={{ ...card, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: T.txt, fontWeight: 800, margin: '0 0 4px' }}>{item.title}</p>
                      <p style={{ color: T.sub, fontSize: 13, margin: 0 }}>{item.detail}</p>
                    </div>
                    <Badge color={color}>{item.severity}</Badge>
                  </div>
                )
              }}
            />
          </AdminSection>

          <AdminSection T={T} title="Biblioteca">
            <AdminStatsGrid
              T={T}
              valueSize={20}
              items={[
                ['Assistindo', summary.statusCounts.watching],
                ['Planejo', summary.statusCounts.plan_to_watch],
                ['Concluidos', summary.statusCounts.completed],
                ['Dropados', summary.statusCounts.dropped],
              ]}
            />
            <div style={{ height: 12 }} />
            <SupportList
              T={T}
              items={summary.recentItems}
              empty="Nenhum item recente na biblioteca."
              renderItem={item => (
                <div key={`${item.animeId}-${item.updatedAt}`} style={card}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: T.txt, fontWeight: 800, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </p>
                    <p style={{ color: T.sub, fontSize: 12, margin: 0 }}>
                      {STATUS_LABEL[item.status] || item.status || 'Sem status'} · {item.progress}/{item.episodes ?? '?'} eps · nota {item.score ?? '-'}
                    </p>
                  </div>
                  <span style={{ color: T.sub, fontSize: 12, whiteSpace: 'nowrap' }}>{formatAdminDate(item.updatedAt)}</span>
                </div>
              )}
            />
          </AdminSection>

          <AdminSection T={T} title="Atividade recente">
            <SupportList
              T={T}
              items={selected.recentActivity}
              empty="Nenhuma atividade recente encontrada."
              renderItem={(item, index) => (
                <div key={`${item.kind}-${item.created_at}-${index}`} style={card}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: T.txt, fontWeight: 800, margin: '0 0 3px' }}>
                      {item.kind}: {truncate(item.label, 90)}
                    </p>
                    <p style={{ color: T.sub, fontSize: 12, margin: 0 }}>{item.meta || 'Sem detalhes'}</p>
                  </div>
                  <span style={{ color: T.sub, fontSize: 12, whiteSpace: 'nowrap' }}>{formatAdminDate(item.created_at)}</span>
                </div>
              )}
            />
          </AdminSection>

          <AdminSection T={T} title="Comunidade e feedback">
            <SupportList
              T={T}
              items={[
                ...selected.feedback.map(item => ({ ...item, kind: 'Feedback', label: item.title, meta: `${item.status} · ${item.votes ?? 0} votos` })),
                ...selected.topics.map(item => ({ ...item, kind: 'Topico', label: item.title, meta: `${item.reply_count ?? 0} respostas · ${item.views ?? 0} views` })),
                ...selected.comments.map(item => ({ ...item, kind: 'Comentario', label: item.content, meta: `Anime ${item.anime_id}` })),
              ].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()).slice(0, 20)}
              empty="Nenhum conteudo de comunidade encontrado."
              renderItem={(item, index) => (
                <div key={`${item.kind}-${item.id}-${index}`} style={card}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: T.txt, fontWeight: 800, margin: '0 0 3px' }}>
                      {item.kind}: {truncate(item.label, 100)}
                    </p>
                    <p style={{ color: T.sub, fontSize: 12, margin: 0 }}>{item.meta}</p>
                  </div>
                  <span style={{ color: T.sub, fontSize: 12, whiteSpace: 'nowrap' }}>{formatAdminDate(item.created_at)}</span>
                </div>
              )}
            />
          </AdminSection>

          <AdminSection T={T} title="Erros ligados ao usuario">
            <SupportList
              T={T}
              items={selected.errors}
              empty="Nenhum erro ligado a este usuario foi encontrado."
              renderItem={item => (
                <div key={item.id} style={{ ...card, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: T.txt, fontWeight: 800, margin: '0 0 3px' }}>{item.message}</p>
                    <p style={{ color: T.sub, fontSize: 12, margin: 0 }}>{item.source || 'Sem origem'}</p>
                  </div>
                  <span style={{ color: T.sub, fontSize: 12, whiteSpace: 'nowrap' }}>{formatAdminDate(item.created_at)}</span>
                </div>
              )}
            />
          </AdminSection>
        </>
      )}
    </div>
  )
}
