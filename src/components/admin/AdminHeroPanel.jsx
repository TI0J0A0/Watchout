import { AdminEmpty, AdminLoading } from './shared'

export function AdminHeroPanel({
  T,
  mobile,
  input,
  card,
  chip,
  heroMaxItems,
  heroSettingsSaving,
  heroSearch,
  heroSearchLoading,
  heroSearchResults,
  heroSearchError,
  heroFeedback,
  heroError,
  newHero,
  heroSaving,
  heroLoading,
  heroEntries,
  setHeroMaxItems,
  setHeroSearch,
  setNewHero,
  onSaveHeroSettings,
  onHeroSearch,
  onSelectHeroAnime,
  onCreateHero,
  onHeroOrder,
  onToggleHero,
  onEditHero,
  onDeleteHero,
}) {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: T.txt, margin: '0 0 14px' }}>Controle do hero</h2>
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        marginBottom: 16, padding: 16, background: T.surf, border: `1px solid ${T.bord}`, borderRadius: 12,
      }}>
        <input
          type="number"
          min="1"
          max="20"
          value={heroMaxItems}
          onChange={e => setHeroMaxItems(e.target.value)}
          placeholder="Máximo no hero"
          style={{ ...input, width: 150 }}
        />
        <button type="button" onClick={onSaveHeroSettings}
          style={{ padding: '10px 18px', background: '#0A84FF', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: heroSettingsSaving ? 'default' : 'pointer', opacity: heroSettingsSaving ? 0.6 : 1 }}>
          {heroSettingsSaving ? 'Salvando...' : 'Salvar limite'}
        </button>
        <p style={{ color: T.sub, fontSize: 12, margin: 0 }}>
          A home mostra no máximo {Number(heroMaxItems) || 1} animes ativos do hero, respeitando a ordem.
        </p>
      </div>

      <form onSubmit={onHeroSearch} style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        marginBottom: 16, padding: 16, background: T.surf, border: `1px solid ${T.bord}`, borderRadius: 12,
      }}>
        <input
          value={heroSearch}
          onChange={e => setHeroSearch(e.target.value)}
          placeholder="Buscar anime por nome"
          style={{ ...input, flex: 1, minWidth: mobile ? '100%' : 260 }}
        />
        <button type="submit"
          style={{ padding: '10px 18px', background: '#0A84FF', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: heroSearchLoading ? 'default' : 'pointer', opacity: heroSearchLoading ? 0.6 : 1 }}>
          {heroSearchLoading ? 'Buscando...' : 'Buscar anime'}
        </button>
      </form>

      {heroSearchError && <p style={{ color: '#FF3B30', fontSize: 12, margin: '0 0 16px' }}>{heroSearchError}</p>}
      {heroError && <p style={{ color: '#FF3B30', fontSize: 12, margin: '0 0 16px' }}>{heroError}</p>}
      {heroFeedback && <p style={{ color: '#30D158', fontSize: 12, margin: '0 0 16px' }}>{heroFeedback}</p>}

      {heroSearchResults.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {heroSearchResults.map(item => (
            <div key={item.id} style={{ ...card, alignItems: mobile ? 'stretch' : 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" style={{ width: 64, height: 90, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 64, height: 90, borderRadius: 8, background: T.bord, flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: T.txt, fontWeight: 700, margin: '0 0 4px' }}>{item.title}</p>
                  <p style={{ color: T.sub, fontSize: 12, margin: '0 0 4px' }}>
                    ID {item.id} · {item.type || 'Anime'} · {item.episodes ?? '?'} eps · {item.year ?? 'sem ano'} · {item.status || 'sem status'}
                  </p>
                  <p style={{ color: T.sub, fontSize: 12, margin: '0 0 4px' }}>
                    {item.season || 'sem temporada'} · {item.rating || 'sem classificação'} · nota {item.score ?? '?'}
                  </p>
                  <p style={{ color: T.sub, fontSize: 12, margin: '0 0 4px' }}>
                    {item.studios?.slice(0, 2).join(', ') || 'sem estúdio'} · {item.genres?.slice(0, 3).join(', ') || 'sem gênero'}
                  </p>
                  <p style={{ color: T.sub, fontSize: 12, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.synopsis || 'Sem sinopse'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => onSelectHeroAnime(item)} style={chip('#0A84FF')}>
                Usar este anime
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={onCreateHero} style={{
        display: 'grid', gridTemplateColumns: mobile ? '1fr' : '120px minmax(180px, 1fr) minmax(180px, 1fr) 90px auto',
        gap: 10, alignItems: 'center', marginBottom: 20,
        padding: 16, background: T.surf, border: `1px solid ${T.bord}`, borderRadius: 12,
      }}>
        <input type="number" min="1" value={newHero.animeId} onChange={e => setNewHero(p => ({ ...p, animeId: e.target.value }))} placeholder="Anime ID" style={input} />
        <input value={newHero.imageUrl} onChange={e => setNewHero(p => ({ ...p, imageUrl: e.target.value }))} placeholder="URL da imagem customizada do hero" style={input} />
        <input value={newHero.logoUrl} onChange={e => setNewHero(p => ({ ...p, logoUrl: e.target.value }))} placeholder="URL da logo do anime" style={input} />
        <input type="number" value={newHero.sortOrder} onChange={e => setNewHero(p => ({ ...p, sortOrder: e.target.value }))} placeholder="Ordem" style={input} />
        <button type="submit" disabled={heroSaving}
          style={{ padding: '10px 18px', background: '#0A84FF', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: heroSaving ? 'default' : 'pointer', opacity: heroSaving ? 0.6 : 1 }}>
          {heroSaving ? 'Salvando...' : 'Adicionar'}
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.sub, fontSize: 13 }}>
          <input type="checkbox" checked={newHero.active} onChange={e => setNewHero(p => ({ ...p, active: e.target.checked }))} />
          Ativo
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.sub, fontSize: 13 }}>
          <input type="checkbox" checked={newHero.hideTitle} onChange={e => setNewHero(p => ({ ...p, hideTitle: e.target.checked }))} />
          Esconder título textual
        </label>
      </form>

      {heroLoading ? <AdminLoading color={T.sub} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {heroEntries.length === 0 && (
            <AdminEmpty color={T.sub}>
              Nenhum hero configurado. O site usa o carrossel automático enquanto esta lista estiver vazia.
            </AdminEmpty>
          )}
          {heroEntries.map(entry => (
            <div key={entry.id} style={{ ...card, alignItems: mobile ? 'stretch' : 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <img src={entry.image_url} alt="" style={{ width: 86, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: T.txt, fontWeight: 700, margin: '0 0 3px' }}>Anime #{entry.anime_id}</p>
                  <p style={{ color: T.sub, fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.image_url}
                  </p>
                  <p style={{ color: T.sub, fontSize: 12, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.logo_url ? `Logo: ${entry.logo_url}` : 'Sem logo'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: mobile ? 'flex-start' : 'flex-end' }}>
                <input
                  type="number"
                  value={entry.sort_order}
                  onChange={e => onHeroOrder(entry, Number(e.target.value) || 0)}
                  aria-label="Ordem do hero"
                  style={{ ...input, width: 76, padding: '6px 8px' }}
                />
                <button type="button" onClick={() => onToggleHero(entry, 'active')} style={chip(entry.active ? '#30D158' : '#8E8E93')}>
                  {entry.active ? 'Ativo' : 'Inativo'}
                </button>
                <button type="button" onClick={() => onToggleHero(entry, 'hideTitle')} style={chip(entry.hide_title ? '#FF9F0A' : '#0A84FF')}>
                  {entry.hide_title ? 'Título oculto' : 'Título visível'}
                </button>
                <button type="button" onClick={() => onEditHero(entry)} style={chip('#0A84FF')}>
                  Editar
                </button>
                <button type="button" onClick={() => onDeleteHero(entry.id)} style={chip('#FF3B30')}>
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
