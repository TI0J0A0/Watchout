# APIs utilizadas no Watchout

## 1. Jikan API (MyAnimeList)

**Base URL:** `https://api.jikan.moe/v4`
**Autenticação:** Nenhuma (pública, rate limit ~3 req/s)
**Arquivo:** `src/services/jikan.js`

API não-oficial do MyAnimeList. É a principal fonte de metadados de animes no app.

| Endpoint | Uso |
|----------|-----|
| `/seasons/now` | Animes da temporada atual |
| `/top/anime` | Ranking dos mais bem avaliados |
| `/seasons/upcoming` | Animes da próxima temporada |
| `/seasons/<year>/<season>` | Arquivo de temporadas anteriores |
| `/anime?q=<query>` | Busca de animes |
| `/anime?status=airing&order_by=members` | Animes populares em exibição |
| `/anime?genres=<id>` | Filtro por gênero |
| `/anime/<id>` | Detalhes de um anime específico |
| `/anime/<id>/recommendations` | Recomendações |

**Dados retornados:** título, score, episódios, gêneros, estúdio, imagem de capa, plataformas de streaming, sinopse, membros, trailer.

---

## 2. AniList GraphQL API

**Base URL:** `https://graphql.anilist.co`
**Autenticação:** Nenhuma (pública)
**Arquivo:** `src/services/anilist.js`

Usada para complementar dados que o Jikan não fornece ou fornece incompleto. Todas as chamadas são `POST` com `Content-Type: application/json`.

### Queries utilizadas

#### `Media(idMal: $malId)` — Dados de episódios e schedule

```graphql
query($malId: Int) {
  Media(idMal: $malId, type: ANIME) {
    id
    episodes
    duration
    streamingEpisodes { title thumbnail }
    airingSchedule { nodes { episode airingAt } }
  }
}
```

Usada pelo `WatchPanel` para obter thumbnails de episódios e schedule de exibição.

#### `Media(idMal: $malId)` — Banner + Personagens do anime

```graphql
query($malId: Int) {
  Media(idMal: $malId, type: ANIME) {
    bannerImage
    characters(sort: FAVOURITES_DESC, perPage: 16) {
      edges {
        role
        node { name { full } image { large } }
        voiceActors(language: JAPANESE) { name { full } image { large } }
      }
    }
  }
}
```

Usada pelo `AnimePage` — `Media.characters` retorna `CharacterConnection`, acesso via `.edges[].node`.

#### `Media(idMal: $malId).bannerImage` — Banner leve

```graphql
query($malId: Int) { Media(idMal: $malId, type: ANIME) { bannerImage } }
```

Usada em `SeasonalPage` (hero) e `ProfilePage` (banner do anime pinado).

#### `Page.characters` — Busca global de personagens para avatar

```graphql
query($search: String) {
  Page(perPage: 16) {
    characters(search: $search, sort: FAVOURITES_DESC) {
      id name { full } image { large }
    }
  }
}
```

Usada no seletor de avatar do `ProfilePage`.

> **IMPORTANTE — diferença de schema:**
> - `Page.characters` → retorna `Character[]` diretamente (**sem** `.nodes`)
> - `Media.characters` → retorna `CharacterConnection` (com `.edges` e `.nodes`)
>
> Usar `.nodes` em `Page.characters` causa **erro 400** da API.

- `search = null` → retorna os 16 personagens mais favoritados globalmente
- `search = "texto"` → filtra por nome

---

## 3. MegaPlay (Streaming)

**Base URL:** `https://megaplay.buzz/stream/ani`
**Autenticação:** Nenhuma
**Arquivo:** `src/components/WatchPanel.jsx`

Player de streaming embedado via `<iframe>`. Recebe eventos via `postMessage` para rastrear o progresso assistido.

**Formato da URL:** `/stream/ani/{anilistId}/{episodio}/{idioma}?quality={qualidade}`

| Parâmetro | Opções |
|-----------|--------|
| idioma | `sub`, `dub`, `pt-br`, `es` |
| qualidade | `auto`, `1080`, `720`, `480` |

**Eventos postMessage interceptados pelo WatchPanel:**

```javascript
// Progresso de tempo (principal)
{ type: 'watching-log', duration: 1440, currentTime: 1250 }
// → Se currentTime/duration >= 0.85 → marca episódio como assistido

// Porcentagem alternativa
{ event: 'time', percent: 0.87 }

// Conclusão
{ event: 'complete' }
```

---

## 4. Anime News Network (ANN) RSS

**URL:** `https://www.animenewsnetwork.com/all/rss.xml`
**Autenticação:** Nenhuma (pública)
**Arquivo:** `src/services/ann.js`

Feed RSS de notícias de anime. Como o ANN bloqueia CORS, o app usa proxies em cascata com fallback automático:

1. `https://api.codetabs.com/v1/proxy/` — primário
2. `https://api.allorigins.win/raw` — fallback
3. `https://corsproxy.io/` — fallback final

**Dados retornados:** título, link, descrição, data de publicação, categoria.

---

## 5. Supabase

**Base URL:** `VITE_SUPABASE_URL` (variável de ambiente)
**Autenticação:** JWT via `VITE_SUPABASE_ANON_KEY`
**Arquivo:** `src/services/supabase.js`

Backend principal do app.

| Serviço | Uso |
|---------|-----|
| Auth | Login, cadastro, sessão do usuário, `user_metadata` (avatarUrl, displayName, etc.) |
| Database (PostgreSQL) | Biblioteca do usuário, perfis, amizades, comunidade, notificações |
| Edge Functions | `anikoto` — proxy server-side para AniList com cache e controle premium (legado) |

### Edge Function: `anikoto`

Roda no servidor Supabase (Deno). Recebe um MAL ID, consulta o AniList e cacheia o resultado por 24h na tabela `anikoto_cache`. Exige autenticação JWT e verifica se o usuário é premium.

> **Nota:** A Edge Function é legada. O `WatchPanel` agora chama o AniList diretamente via `fetchAnilistData()`. A função ainda existe mas só é chamada via `getAnilistData()` em `premium.js` como fallback.

---

## Variáveis de ambiente necessárias

```env
VITE_SUPABASE_URL          # URL do projeto Supabase (https://...)
VITE_SUPABASE_ANON_KEY     # Chave pública JWT (começa com eyJ...)
SUPABASE_SERVICE_ROLE_KEY  # Chave de serviço — usada apenas nas Edge Functions
```

---

## Resumo

| API | Tipo | Auth | Finalidade principal |
|-----|------|------|----------------------|
| Jikan | REST | Não | Metadados, busca, temporadas |
| AniList | GraphQL | Não | IDs, episódios, banners, avatares de personagens |
| MegaPlay | Embed iframe | Não | Streaming de episódios |
| ANN | RSS | Não | Feed de notícias |
| Supabase | REST + WS | Sim (JWT) | Banco de dados, auth, backend |
