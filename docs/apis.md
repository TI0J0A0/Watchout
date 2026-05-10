# APIs utilizadas no Watchout

## 1. Jikan API (MyAnimeList)

**Base URL:** `https://api.jikan.moe/v4`  
**Autenticação:** Nenhuma (pública)  
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
| `/anime/<id>/characters` | Personagens (usado para avatares) |
| `/anime/<id>/recommendations` | Recomendações |

**Dados retornados:** título, score, episódios, gêneros, estúdio, imagem de capa, plataformas de streaming, sinopse, membros, trailer.

---

## 2. AniList GraphQL API

**Base URL:** `https://graphql.anilist.co`  
**Autenticação:** Nenhuma (pública)  
**Arquivos:** `src/pages/AnimePage.jsx`, `src/pages/ProfilePage.jsx`, `src/components/WatchPanel.jsx`, `supabase/functions/anikoto/index.ts`

Usada para complementar dados que o Jikan não fornece ou fornece incompleto.

| Query | Uso |
|-------|-----|
| `Media(idMal: $malId)` | Converte MAL ID → AniList ID, busca contagem de episódios, duração e thumbnails dos episódios |
| `Media(idMal: $id).bannerImage` | Banner da página do anime |
| `Character(id: $id)` | Avatares de personagens para seleção de perfil |

---

## 3. Kitsu API

**Base URL:** `https://kitsu.io/api/edge`  
**Autenticação:** Nenhuma (pública)  
**Arquivo:** `src/components/WatchPanel.jsx`

Usada exclusivamente para dados detalhados de episódios ao abrir o painel de assistir.

| Endpoint | Uso |
|----------|-----|
| `/mappings?filter[externalId]={malId}&filter[externalSite]=myanimelist/anime` | Converte MAL ID → Kitsu ID |
| `/episodes?filter[mediaId]={kitsuId}&sort=number` | Lista de episódios com thumbnail, título e data de estreia |

**Dados retornados:** thumbnail real do episódio, título canônico, airdate.

---

## 4. MegaPlay (Streaming)

**Base URL:** `https://megaplay.buzz/stream/ani`  
**Autenticação:** Nenhuma  
**Arquivo:** `src/components/WatchPanel.jsx`

Player de streaming embedado via `<iframe>`. Recebe eventos via `postMessage` para rastrear o progresso assistido.

**Formato da URL:** `/stream/ani/{anilistId}/{episodio}/{idioma}?quality={qualidade}`

| Parâmetro | Opções |
|-----------|--------|
| idioma | `sub`, `dub`, `pt-br`, `es` |
| qualidade | `auto`, `1080`, `720`, `480` |

**Comunicação:** O iframe envia um evento `complete` via `postMessage` quando o episódio termina, disparando a marcação automática de episódio assistido.

---

## 5. Anime News Network (ANN) RSS

**URL:** `https://www.animenewsnetwork.com/all/rss.xml`  
**Autenticação:** Nenhuma (pública)  
**Arquivo:** `src/services/ann.js`

Feed RSS de notícias de anime. Como o ANN bloqueia CORS, o app usa proxies em cascata com fallback automático:

1. `https://api.codetabs.com/v1/proxy/` — primário
2. `https://api.allorigins.win/raw` — fallback
3. `https://corsproxy.io/` — fallback final

**Dados retornados:** título, link, descrição, data de publicação, categoria.

---

## 6. YouTube (Thumbnails)

**URL:** `https://img.youtube.com/vi/{videoId}/maxresdefault.jpg`  
**Autenticação:** Nenhuma  
**Arquivos:** `src/pages/SeasonalPage.jsx`, `src/pages/ProfilePage.jsx`

Não é uma chamada de API — apenas uma URL pública de thumbnail. O app extrai o ID do vídeo da URL do trailer (retornada pelo Jikan) e monta a URL do thumbnail diretamente.

---

## 7. Supabase

**Base URL:** `VITE_SUPABASE_URL` (variável de ambiente)  
**Autenticação:** JWT via `VITE_SUPABASE_ANON_KEY`  
**Arquivo:** `src/services/supabase.js`

Backend principal do app.

| Serviço | Uso |
|---------|-----|
| Auth | Login, cadastro, sessão do usuário |
| Database (PostgreSQL) | Biblioteca do usuário, perfis, amizades, comunidade, notificações |
| Edge Functions | `anikoto` — proxy server-side para AniList com cache e controle premium |

### Edge Function: `anikoto`

Roda no servidor Supabase. Recebe um MAL ID, consulta o AniList e cacheia o resultado por 24h na tabela `anikoto_cache`. Exige autenticação JWT e verifica se o usuário é premium.

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
| AniList | GraphQL | Não | IDs, episódios, banners, avatares |
| Kitsu | REST | Não | Thumbnails e airdates de episódios |
| MegaPlay | Embed iframe | Não | Streaming de episódios |
| ANN | RSS | Não | Feed de notícias |
| YouTube | CDN estática | Não | Thumbnail de trailers |
| Supabase | REST + WS | Sim (JWT) | Banco de dados, auth, backend |
