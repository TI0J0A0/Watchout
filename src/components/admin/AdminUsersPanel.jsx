import { formatAdminDate } from './shared'

export function AdminUsersPanel({
  T,
  tab,
  users,
  userCount,
  userPage,
  userDraft,
  usersLoading,
  userQuery,
  input,
  card,
  chip,
  setUserDraft,
  setUserQuery,
  setUserPage,
  onSearch,
  onPremium,
  onBan,
}) {
  const totalPages = Math.ceil(userCount / 20)
  const title = {
    users: 'Listar usuários',
    permissions: 'Editar permissões',
    activity: 'Ver atividade recente',
    activeUsers: 'Usuários ativos',
  }[tab]

  return (
    <div>
      <h2 style={{ fontSize: 18, color: T.txt, margin: '0 0 14px' }}>{title}</h2>
      <form onSubmit={onSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={userDraft}
          onChange={e => setUserDraft(e.target.value)}
          placeholder="Filtrar por username ou nome..."
          style={{ ...input, flex: 1 }}
        />
        <button type="submit" style={{ padding: '10px 20px', background: '#0A84FF', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
          Buscar
        </button>
        {userQuery && (
          <button type="button" onClick={() => { setUserDraft(''); setUserQuery(''); setUserPage(0) }}
            style={{ padding: '10px 14px', background: T.surf, color: T.sub, border: `1px solid ${T.bord}`, borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
            Limpar
          </button>
        )}
      </form>

      <p style={{ fontSize: 12, color: T.sub, margin: '0 0 12px' }}>
        {usersLoading ? 'Carregando...' : `${userCount} usuário${userCount !== 1 ? 's' : ''}${userQuery ? ` para "${userQuery}"` : ''}`}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!usersLoading && users.length === 0 && (
          <p style={{ color: T.sub }}>Nenhum usuário encontrado.</p>
        )}
        {users.map(u => (
          <div key={u.id} style={card}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
              <p style={{ fontWeight: 600, color: T.txt, margin: '0 0 3px', display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                {u.display_name || u.username}
                {u.is_premium && (
                  <span style={{ fontSize: 10, background: '#FF9F0A22', color: '#FF9F0A', padding: '2px 6px', borderRadius: 4 }}>PREMIUM</span>
                )}
                {u.is_banned && (
                  <span style={{ fontSize: 10, background: '#FF3B3022', color: '#FF3B30', padding: '2px 6px', borderRadius: 4 }}>BANIDO</span>
                )}
              </p>
              <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>
                @{u.username}{tab === 'activity' ? ` · atualizado em ${formatAdminDate(u.created_at || u.updated_at)}` : ''}
              </p>
            </div>
            {tab !== 'activity' && (
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button onClick={() => onPremium(u.id, u.is_premium)} style={chip(u.is_premium ? '#FF9F0A' : '#30D158')}>
                  {u.is_premium ? 'Revogar Premium' : 'Dar Premium'}
                </button>
                {tab !== 'permissions' && (
                  <button onClick={() => onBan(u.id, u.is_banned)} style={chip(u.is_banned ? '#30D158' : '#FF3B30')}>
                    {u.is_banned ? 'Desbanir' : 'Banir'}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
          <button
            disabled={userPage === 0}
            onClick={() => setUserPage(p => p - 1)}
            style={{
              padding: '8px 18px',
              borderRadius: 9,
              border: `1px solid ${T.bord}`,
              background: T.surf,
              color: userPage === 0 ? T.sub : T.txt,
              fontWeight: 600,
              cursor: userPage === 0 ? 'default' : 'pointer',
              opacity: userPage === 0 ? 0.4 : 1,
            }}>
            Anterior
          </button>
          <span style={{ fontSize: 13, color: T.sub, minWidth: 80, textAlign: 'center' }}>
            {userPage + 1} / {totalPages}
          </span>
          <button
            disabled={userPage >= totalPages - 1}
            onClick={() => setUserPage(p => p + 1)}
            style={{
              padding: '8px 18px',
              borderRadius: 9,
              border: `1px solid ${T.bord}`,
              background: T.surf,
              color: userPage >= totalPages - 1 ? T.sub : T.txt,
              fontWeight: 600,
              cursor: userPage >= totalPages - 1 ? 'default' : 'pointer',
              opacity: userPage >= totalPages - 1 ? 0.4 : 1,
            }}>
            Próximo
          </button>
        </div>
      )}
    </div>
  )
}
