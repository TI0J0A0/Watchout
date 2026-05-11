# Watchout — Documentação Técnica Completa

> Guia de referência para desenvolvedores que vão trabalhar no projeto.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack & Dependências](#2-stack--dependências)
3. [Estrutura de Diretórios](#3-estrutura-de-diretórios)
4. [Fluxo de Dados Principal](#4-fluxo-de-dados-principal)
5. [APIs Externas](#5-apis-externas)
6. [Banco de Dados (Supabase)](#6-banco-de-dados-supabase)
7. [Autenticação](#7-autenticação)
8. [Serviços (src/services/)](#8-serviços-srcservices)
9. [Hooks Customizados (src/hooks/)](#9-hooks-customizados-srchooks)
10. [Context Providers (src/context/)](#10-context-providers-srccontext)
11. [Páginas (src/pages/)](#11-páginas-srcpages)
12. [Componentes (src/components/)](#12-componentes-srccomponents)
13. [Utilitários (src/utils/)](#13-utilitários-srcutils)
14. [Constantes (src/constants/)](#14-constantes-srcconstants)
15. [Internacionalização (src/i18n/)](#15-internacionalização-srci18n)
16. [Edge Functions (Supabase)](#16-edge-functions-supabase)
17. [Build & Deploy](#17-build--deploy)
18. [Variáveis de Ambiente](#18-variáveis-de-ambiente)
19. [Diagrama de Arquitetura](#19-diagrama-de-arquitetura)
20. [Fluxos Detalhados](#20-fluxos-detalhados)

---

## 1. Visão Geral

**Watchout** é uma plataforma de descoberta e rastreamento de animes e séries. Os usuários podem:

- Descobrir animes da temporada atual, os mais populares e por gênero
- Gerenciar uma biblioteca pessoal com status (assistindo, planejo, completo, dropado), nota e progresso de episódios
- Assistir episódios diretamente no site (feature premium via MegaPlay embed)
- Ver calendário semanal de episódios
- Ler notícias do mundo anime (Anime News Network)
- Interagir com a comunidade via fórum e sistema de feedback
- Adicionar amigos e ver o perfil/biblioteca de outros usuários
- Importar biblioteca do MyAnimeList via XML

**Premissa técnica:** O frontend é uma SPA em React sem roteamento via URL — a navegação é feita por estado (`page` e `detailId` no `App.jsx`). Não há Next.js, React Router ou similares.

---

## 2. Stack & Dependências

### Runtime
| Dependência | Versão | Uso |
|---|---|---|
| `react` | ^18.3.1 | UI |
| `react-dom` | ^18.3.1 | Renderização DOM |
| `@supabase/supabase-js` | ^2.105.1 | Banco, auth, edge functions |
| `react-i18next` | ^17.0.6 | Traduções no React |
| `i18next` | ^26.0.8 | Engine de internacionalização |
| `i18next-browser-languagedetector` | ^8.2.1 | Detecção de idioma do browser |

### Dev
| Dependência | Versão | Uso |
|---|---|---|
| `vite` | ^6.3.5 | Bundler / dev server |
| `@vitejs/plugin-react` | ^4.3.4 | Plugin JSX para Vite |
| `tailwindcss` | ^4.x | Utilitários CSS e design tokens |
| `@tailwindcss/vite` | ^4.x | Integração Tailwind com Vite (sem PostCSS) |

### Tailwind CSS v4
A estilização usa **Tailwind CSS v4** (plugin Vite, sem `tailwind.config.js`) + inline styles com valores do `ThemeContext` para componentes legados. As cores do tema são expostas como CSS custom properties em `:root` e mapeadas em tokens do Tailwind via `@theme inline` no `index.css`.

| Abordagem | Quando usar |
|---|---|
| `className="bg-surf text-txt"` | Componentes novos ou migrados |
| `style={{ background: T.surf }}` | Componentes legados (ainda funcionam) |
| `.fu`, `.sc`, `.card`, `.shimmer` | Animações e hover states (permanecem em `index.css`) |

### Scripts
```bash
npm run dev       # Inicia dev server (localhost:5173)
npm run build     # Build de produção em /dist
npm run preview   # Preview do build de produção
```

---

## 3. Estrutura de Diretórios

```
Watchout/
├── public/                        # Assets estáticos (vazio)
├── src/
│   ├── App.jsx                    # Componente raiz, roteamento por estado
│   ├── main.jsx                   # Entry point React
│   ├── index.css                  # Estilos globais e animações
│   │
│   ├── pages/                     # Telas completas
│   │   ├── SeasonalPage.jsx       # Descoberta / Home
│   │   ├── TopPage.jsx            # Top 25 MAL
│   │   ├── CalendarPage.jsx       # Calendário semanal
│   │   ├── SearchPage.jsx         # Busca de animes
│   │   ├── AnimePage.jsx          # Detalhe do anime (overlay)
│   │   ├── ProfilePage.jsx        # Perfil do usuário
│   │   ├── FriendProfilePage.jsx  # Perfil de amigo (read-only)
│   │   ├── NewsPage.jsx           # Notícias, trailers, on air
│   │   ├── CommunityPage.jsx      # Fórum e feedback
│   │   └── AuthPage.jsx           # Login / cadastro (modal)
│   │
│   ├── components/                # Componentes reutilizáveis
│   │   ├── Nav.jsx                # Barra de navegação
│   │   ├── MediaCard.jsx          # Card de anime (grid/shelf)
│   │   ├── ShelfRow.jsx           # Linha horizontal de cards
│   │   ├── WatchPanel.jsx         # Player de episódios (premium)
│   │   ├── StatBox.jsx            # Caixa de estatística
│   │   ├── AvatarPic.jsx          # Avatar do usuário
│   │   ├── LoadingGrid.jsx        # Skeleton loader
│   │   ├── Toast.jsx              # Notificação toast
│   │   ├── NotificationBell.jsx   # Sino de notificações
│   │   └── MALImport.jsx          # Importação de XML do MAL
│   │
│   ├── hooks/                     # Custom hooks
│   │   ├── useLibrary.js          # Estado global da biblioteca
│   │   ├── useClickOutside.js     # Fecha dropdown ao clicar fora
│   │   ├── useIsMobile.js         # Detecção de mobile (≤640px)
│   │   └── useOnScreen.js         # Intersection Observer
│   │
│   ├── services/                  # Camada de dados
│   │   ├── anilist.js             # AniList GraphQL API
│   │   ├── jikan.js               # Jikan API (MyAnimeList)
│   │   ├── userAnime.js           # CRUD biblioteca do usuário (Supabase)
│   │   ├── friends.js             # Perfis e amizades (Supabase)
│   │   ├── community.js           # Fórum e feedback (Supabase)
│   │   ├── notifications.js       # Notificações (Supabase)
│   │   ├── premium.js             # Status premium e admin
│   │   ├── ann.js                 # Anime News Network RSS
│   │   └── supabase.js            # Cliente Supabase configurado
│   │
│   ├── context/
│   │   ├── AuthContext.jsx        # Usuário autenticado
│   │   └── ThemeContext.jsx       # Tema (dark mode)
│   │
│   ├── utils/
│   │   ├── index.js               # fmt, fmtTime, mergeWithUserData, saveUserData
│   │   └── tasteProfile.js        # Algoritmo de perfil de gosto
│   │
│   ├── constants/
│   │   └── index.js               # DAYS, SC, SM, STREAMING_URLS, AVATAR_GRADS, BANNER_THEMES
│   │
│   └── i18n/
│       ├── index.js               # Configuração i18next
│       └── en.json                # Traduções em inglês (400+ chaves)
│
├── supabase/
│   ├── functions/
│   │   └── anikoto/
│   │       └── index.ts           # Edge Function (Deno) — proxy AniList premium
│   └── migrations/
│       ├── 20260505_community.sql
│       ├── 20260505_anime_comments.sql
│       ├── 20260510_feedback_fixes.sql
│       ├── 20260510_user_anime_fix.sql
│       ├── 20260510_split_animes_table.sql
│       └── 20260510_drop_unused_tables.sql
│
├── docs/
│   ├── apis.md                    # Documentação das APIs externas
│   └── project.md                 # Este arquivo
│
├── vite.config.js                 # Configuração do bundler
└── package.json
```

---

## 4. Fluxo de Dados Principal

### Inicialização do App

```
main.jsx
  └── App (AuthProvider > ThemeProvider)
        └── AppInner
              └── useLibrary()  ←── Hook central de estado
                    ├── fetchSeasonal()     [Jikan API]
                    └── loadUserLibrary()   [Supabase]  ← só se logado
```

### Merge de dados (useLibrary)

```
fetchSeasonal() retorna []
        │
        ▼
setData(mergeWithUserData(items))  ← localStorage fallback (guest)
        │
        ▼ (se usuário logado)
loadUserLibrary() retorna []
        │
        ▼
setData(prev => {
  // atualiza status/score/ep dos itens do seasonal
  // adiciona itens da biblioteca que não estão no seasonal
  // deduplica por id
})
```

### Fluxo de abertura de detalhe

```
Usuário clica em card
      │
      ▼
openDetail(item)
      │
      ├── addToData(item)   ← garante que o item está em data[]
      └── setDetailId(item.id)
              │
              ▼
      AnimePage renderiza com:
        item = data.find(d => d.id === detailId)
              │
              ├── fetchAnilistBanner(item.id)  → banner + characters
              ├── fetchRecommendations(item.id) → recs via Jikan
              └── (se premium) WatchPanel
                        │
                        └── fetchAnilistData(item.id) → eps, airingSchedule
```

### Fluxo de atualização de status

```
Usuário seleciona status
      │
      ▼
handleStatus(id, status) → App.jsx
      │
      ▼
setStatus(id, status) → useLibrary.js
      │
      ├── setData(d => d.map(...))   ← atualiza estado local imediatamente
      └── upsertAnime(user.id, updated) → Supabase [async, fire-and-forget]
```

---

## 5. APIs Externas

### 5.1 Jikan API (MyAnimeList)

**Base URL:** `https://api.jikan.moe/v4`
**Auth:** Nenhuma (pública, rate limit ~3 req/s)
**Arquivo:** `src/services/jikan.js`

| Função | Endpoint | Dados retornados |
|--------|----------|-----------------|
| `fetchSeasonal()` | `GET /seasons/now?limit=24` | 24 animes da temporada atual |
| `fetchTop()` | `GET /top/anime?limit=25` | Top 25 rankeados |
| `searchAnime(q)` | `GET /anime?q=...&limit=20&sfw=true` | Busca por título |
| `fetchPopular()` | `GET /anime?status=airing&order_by=members&sort=desc&limit=15` | Mais assistidos em exibição |
| `fetchUpcoming()` | `GET /seasons/upcoming?limit=15` | Próxima temporada |
| `fetchByGenre(id, limit)` | `GET /anime?genres=ID&order_by=score&sort=desc&limit=N` | Por gênero MAL |
| `fetchSeasonArchive(y, s)` | `GET /seasons/YEAR/SEASON?limit=24` | Temporadas passadas |
| `fetchAnimeById(id)` | `GET /anime/ID` | Metadados de um anime |
| `fetchRecommendations(id)` | `GET /anime/ID/recommendations` | Animes similares |

**Transformação via `mapAnime(a)`:**
```javascript
{
  id:        a.mal_id,
  title:     a.title_english || a.title,
  score:     a.score || 0,
  eps:       a.episodes || null,
  type:      a.type === "Movie" ? "film" : "anime",
  studio:    a.studios?.[0]?.name || "—",
  year:      a.year || new Date().getFullYear(),
  genres:    [],          // traduzidos para PT
  airing:    Boolean,
  airDay:    "Mon"..."Sun" | null,
  duration:  Number,      // minutos
  color:     String,      // cor primária da paleta
  colorB:    String,      // cor secundária
  img:       String,      // URL imagem
  synopsis:  String,
  streaming: [],          // ["Crunchyroll", "Netflix", ...]
  members:   Number,
  trailer:   String | null,  // embed_url do YouTube
  userStatus: null, userScore: null, userEp: 0, userNotes: ""
}
```

**Paleta de cores:** 10 pares pré-definidos; selecionado por `mal_id % 10`.

---

### 5.2 AniList GraphQL API

**Base URL:** `https://graphql.anilist.co`
**Auth:** Nenhuma (pública)
**Arquivo:** `src/services/anilist.js`

Todas as funções passam pelo helper interno `gql(query, variables)` que faz `POST` com `Content-Type: application/json`.

#### `fetchAnilistData(malId)`
Usada pelo `WatchPanel` ao abrir o painel de assistir.

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

Retorna:
```javascript
{
  anilistId:         Number,   // ID no AniList (para URL do player)
  episodes:          Number | null,
  duration:          Number | null,  // minutos por episódio
  streamingEpisodes: [{ title, thumbnail }],
  airingSchedule:    [{ episode, airingAt }]  // airingAt = Unix timestamp
}
```

#### `fetchAnilistBanner(malId)`
Usada pelo `AnimePage` — retorna banner + personagens em uma única requisição.

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

Retorna:
```javascript
{
  bannerImage: String | null,
  characters: [{
    name: String, img: String,
    role: "Main" | "Supporting",
    va: String, vaImg: String
  }]
}
```

#### `fetchAnilistBannerOnly(malId)`
Versão leve — só `bannerImage`. Usada em `SeasonalPage` (hero) e `ProfilePage` (banner do anime pinado).

#### `searchAnilistCharacters(search)`
Usada no seletor de avatar do perfil.

```graphql
query($search: String) {
  Page(perPage: 16) {
    characters(search: $search, sort: FAVOURITES_DESC) {
      id name { full } image { large }
    }
  }
}
```

> **Atenção ao schema AniList:** `Page.characters` retorna um array direto de `Character` — **não** uma `CharacterConnection` com `.nodes`. Usar `.nodes` causa erro 400. Já `Media.characters` (busca por anime) retorna `CharacterConnection` e usa `.edges[].node`.

- `search = null` → retorna os 16 personagens mais populares globalmente.
- `search = "Naruto"` → filtra por nome.

Retorna: `Character[]` com `{ id, name: { full }, image: { large } }`

---

### 5.3 Anime News Network RSS

**URL:** `https://www.animenewsnetwork.com/all/rss.xml`
**Auth:** Nenhuma
**Arquivo:** `src/services/ann.js`

Não pode ser chamada diretamente por CORS. Usa 3 proxies em cascata com fallback:

```
1. https://api.codetabs.com/v1/proxy/?quest=URL
2. https://api.allorigins.win/raw?url=URL
3. https://corsproxy.io/?URL
```

Retorna até 40 artigos com: `title`, `link`, `description`, `pubDate`, `category`.

---

### 5.4 MegaPlay (Streaming embed)

**Base URL:** `https://megaplay.buzz/stream/ani`
**Auth:** Nenhuma
**Arquivo:** `src/components/WatchPanel.jsx`

Não é uma API REST — é um `<iframe>` embedado.

**URL do player:**
```
https://megaplay.buzz/stream/ani/{anilistId}/{episodio}/{idioma}?quality={qualidade}
```

| Parâmetro | Opções |
|-----------|--------|
| `{idioma}` | `sub`, `dub`, `pt-br`, `es` |
| `{qualidade}` | `auto`, `1080`, `720`, `480` |

**Comunicação por `postMessage`:**
O iframe envia eventos via `window.postMessage` que o `WatchPanel` intercepta para rastrear progresso:

```javascript
// Evento de tempo assistido
{ type: 'watching-log', duration: 1440, currentTime: 1250 }
// Quando currentTime/duration >= 0.85 → marca episódio como assistido

// Evento de porcentagem
{ event: 'time', percent: 0.87 }

// Evento de conclusão
{ event: 'complete' }
```

---

## 6. Banco de Dados (Supabase)

### Schema das tabelas

#### `animes` — Metadados compartilhados
```sql
id         INTEGER PRIMARY KEY   -- MAL ID
title      TEXT
img        TEXT                  -- URL da imagem de capa
type       TEXT                  -- "anime" | "film"
eps        INTEGER
duration   INTEGER               -- minutos por episódio
score      FLOAT
color      TEXT                  -- cor primária (#hex)
color_b    TEXT                  -- cor secundária (#hex)
genres     TEXT[]
studio     TEXT
year       INTEGER
airing     BOOLEAN
air_day    TEXT                  -- "Mon"..."Sun"
synopsis   TEXT
streaming  TEXT[]                -- ["Crunchyroll", "Netflix"]
members    INTEGER
updated_at TIMESTAMPTZ
```
RLS: leitura pública, escrita para autenticados.

#### `user_anime` — Biblioteca do usuário
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES auth.users(id)
anime_id    INTEGER REFERENCES animes(id) ON DELETE CASCADE
status      TEXT CHECK (status IN ('watching','plan_to_watch','completed','dropped'))
user_score  INTEGER CHECK (user_score >= 1 AND user_score <= 10)
ep_progress INTEGER DEFAULT 0
notes       TEXT DEFAULT ''
created_at  TIMESTAMPTZ DEFAULT now()
updated_at  TIMESTAMPTZ DEFAULT now()
UNIQUE (user_id, anime_id)
```

#### `profiles` — Perfis de usuário
```sql
id           UUID PRIMARY KEY REFERENCES auth.users(id)
username     TEXT UNIQUE
display_name TEXT
avatar_url   TEXT
avatar_grad  INTEGER DEFAULT 0    -- índice em AVATAR_GRADS
is_premium   BOOLEAN DEFAULT false
role         TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'))
updated_at   TIMESTAMPTZ DEFAULT now()
```

#### `friendships` — Amizades
```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
requester_id UUID REFERENCES auth.users(id)
addressee_id UUID REFERENCES auth.users(id)
status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted'))
created_at   TIMESTAMPTZ DEFAULT now()
```

#### `forum_topics` — Tópicos do fórum
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES profiles(id)
anime_id    INTEGER
anime_title TEXT
title       TEXT
content     TEXT
reply_count INTEGER DEFAULT 0
views       INTEGER DEFAULT 0
created_at  TIMESTAMPTZ DEFAULT now()
updated_at  TIMESTAMPTZ DEFAULT now()
```

#### `forum_posts` — Respostas do fórum
```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
topic_id   UUID REFERENCES forum_topics(id)
user_id    UUID REFERENCES profiles(id)
content    TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

#### `anime_comments` — Comentários por anime
```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
anime_id   INTEGER
user_id    UUID REFERENCES profiles(id)
content    TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

#### `feedback` — Sugestões e bugs
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES profiles(id)
type        TEXT CHECK (type IN ('idea', 'bug', 'other'))
title       TEXT
description TEXT
status      TEXT DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'done'))
votes       INTEGER DEFAULT 0
created_at  TIMESTAMPTZ DEFAULT now()
```

#### `feedback_votes` — Controle de votos
```sql
user_id     UUID REFERENCES profiles(id)
feedback_id UUID REFERENCES feedback(id)
PRIMARY KEY (user_id, feedback_id)
```

#### `notifications` — Notificações
```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id    UUID REFERENCES auth.users(id)
type       TEXT CHECK (type IN ('friend_request', 'new_episode', 'system'))
title      TEXT
body       TEXT
data       JSONB DEFAULT '{}'
read       BOOLEAN DEFAULT false
created_at TIMESTAMPTZ DEFAULT now()
```

#### `anikoto_cache` — Cache da Edge Function
```sql
cache_key  TEXT PRIMARY KEY
data       JSONB
cached_at  TIMESTAMPTZ DEFAULT now()
```

### Diagrama de relacionamentos

```
auth.users
    │
    ├──< profiles (1:1)
    │        │
    │        ├──< friendships (requester_id / addressee_id)
    │        ├──< forum_topics
    │        ├──< forum_posts
    │        ├──< anime_comments
    │        ├──< feedback
    │        └──< feedback_votes
    │
    └──< user_anime >──── animes
              │
              └── UNIQUE (user_id, anime_id)
```

---

## 7. Autenticação

**Arquivo:** `src/context/AuthContext.jsx`  
**Serviço:** Supabase Auth (email/senha)

```javascript
// Acesso ao contexto
const { user, loading, signIn, signUp, signOut, resetPassword } = useAuth()

// user = objeto auth.users do Supabase (null se não logado)
// user.id = UUID do usuário
// user.email = email
```

### Fluxo de login/signup

```
AuthPage.jsx
      │
      ├── signIn(email, password)
      │         └── supabase.auth.signInWithPassword()
      │
      ├── signUp(email, password)
      │         └── supabase.auth.signUp()
      │                   └── trigger automático no Supabase cria row em profiles
      │
      └── resetPassword(email)
                └── supabase.auth.resetPasswordForEmail()
```

### Persistência de sessão
O cliente Supabase é configurado com `persistSession: true` — o token JWT fica em localStorage e é renovado automaticamente.

### Admin
O admin é identificado pelo email hardcoded:
```javascript
// src/services/premium.js
export const ADMIN_EMAIL = 'joaoguiar99@gmail.com'
export const isAdmin = (user) => user?.email === ADMIN_EMAIL
```
Admin tem acesso ao painel de gestão de usuários no `ProfilePage` e bypass automático do gate premium.

---

## 8. Serviços (src/services/)

### `supabase.js`
```javascript
// Cria e exporta o cliente Supabase, ou null se env vars faltarem
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})
```
Sempre verificar `if (!supabase) return` antes de usar — garante que o app funciona sem configuração.

---

### `userAnime.js`

#### Funções principais

```javascript
// Carrega biblioteca do usuário logado com JOIN na tabela animes
loadUserLibrary() → Promise<item[]>
// Query: SELECT *, animes(*) FROM user_anime WHERE user_id = ?

// Salva/atualiza um anime (upsert em animes + user_anime)
upsertAnime(userId, item) → Promise<void>

// Batch de upserts (importação MAL) — chunks de 50
upsertAnimesBatch(userId, items) → Promise<void>

// Remove da lista do usuário (não remove de animes)
removeAnime(userId, animeId) → Promise<void>

// Biblioteca de outro usuário (para ver perfil de amigo)
loadFriendLibrary(userId) → Promise<item[]>
```

#### `fromRow(row)` — Mapeamento DB → App
```javascript
function fromRow(row) {
  // row.animes é preenchido após a migration de split
  // fallback para row direto se migration ainda não aplicada
  const a = row.animes || row
  return {
    id, title, img, type, eps, duration, score,
    color, colorB, genres, studio, year, airing, airDay,
    synopsis, streaming, members,        // metadados de animes
    userStatus, userScore, userEp, userNotes  // dados do user_anime
  }
}
```

---

### `friends.js`

```javascript
upsertProfile(user, meta)              // Salva perfil após login/edição
getProfile(userId)                     // Busca perfil de qualquer usuário
checkDisplayNameAvailable(name, userId) // Boolean — verifica unicidade
searchProfiles(query)                  // Busca por username/display_name
sendFriendRequest(requesterId, addresseeId) // Cria friendship + notificação
acceptFriendRequest(friendshipId)      // status: 'pending' → 'accepted'
deleteFriendship(friendshipId)         // Remove amizade
getFriendsWithProfiles(userId)         // Friendships accepted + dados dos amigos
getPendingRequests(userId)             // Requests recebidos ainda pendentes
```

---

### `community.js`

#### Fórum
```javascript
fetchTopics()                          // Últimos 60 tópicos
fetchTopic(id)                         // Um tópico (incrementa views)
fetchPosts(topicId)                    // Posts de um tópico
createTopic({ userId, title, content, animeId, animeTitle })
createPost({ userId, topicId, content })
deleteTopic(id)
deletePost(id)
```

#### Feedback
```javascript
fetchFeedback()                        // Todos, ordenados por votos DESC
createFeedback({ userId, type, title, description })
toggleVote(feedbackId, userId, currentVotes, hasVoted) // Upvote/undo
fetchMyVotes(userId)                   // IDs dos feedbacks que o usuário votou
updateFeedbackStatus(feedbackId, status) // Admin: open | reviewing | done
```

#### Comentários de anime
```javascript
fetchAnimeComments(animeId)            // Comentários de um anime
createAnimeComment({ userId, animeId, content })
deleteAnimeComment(id)
```

---

### `notifications.js`

```javascript
fetchNotifications(userId)             // Últimas 50
markRead(id)
markAllRead(userId)
createNotification(userId, type, title, body, data) // data = JSONB
hasNotificationToday(userId, animeId)  // Evita duplicar notif de episódio
hasRecentNotification(userId, type, animeId, epCount)
```

---

### `premium.js`

```javascript
ADMIN_EMAIL                            // "joaoguiar99@gmail.com"
isAdmin(user)                          // Booleano
loadPremiumStatus(userId)              // Booleano — busca profiles.is_premium
grantPremium(profileId)                // Admin: set is_premium = true
revokePremium(profileId)               // Admin: set is_premium = false
adminSearchUsers(query)                // Admin: busca usuários por username/display_name
getAnilistData(malId)                  // Chama Edge Function anikoto (legado, ainda existe)
```

---

### `ann.js`

```javascript
fetchAnnNews() → Promise<Article[]>
// Article = { title, link, description, pubDate, category }
```

Tenta os 3 proxies CORS em sequência. Se todos falharem, lança erro.

---

## 9. Hooks Customizados (src/hooks/)

### `useLibrary()` — O hook mais importante

Estado global de toda a biblioteca de animes. Chamado uma única vez no `App.jsx`.

**Retorna:**
```javascript
{
  data: Item[],          // Todos os animes (seasonal + biblioteca do usuário)
  setData,               // Setter direto (usar com cuidado)
  loading: Boolean,      // true durante fetch inicial do Jikan
  topData: Item[],       // Top 25 (carregado sob demanda)
  topLoaded: Boolean,
  loadTop: () => void,   // Dispara fetch do top 25

  // Mutadores — atualizam data[] localmente E sincronizam com Supabase
  setStatus(id, status),  // null = remove da lista
  setScore(id, value),
  setEp(id, value),
  setNotes(id, text),     // Auto-salva com debounce de 800ms

  importFromMAL(items),   // Merge de importação XML do MAL
  addToData(item),        // Adiciona item se ainda não está em data[]
}
```

**Ordem de execução:**
```
Mount
  → fetchSeasonal() → setData (com localStorage se guest)
  → [se user] loadUserLibrary() → setData (merge)
  → [se user] enrichItems sem img → fetchAnimeById + upsertAnime

user muda
  → re-executa loadUserLibrary
```

---

### `useClickOutside(ref, handler)`

```javascript
const ref = useRef()
useClickOutside(ref, () => setOpen(false))
// <div ref={ref}>...</div>
```

---

### `useIsMobile()`

```javascript
const isMobile = useIsMobile()  // true se window.innerWidth <= 640
```

---

### `useOnScreen(rootMargin)`

```javascript
const [ref, visible] = useOnScreen('300px')
// visible = true quando o elemento entra no viewport com 300px de antecedência
```

---

## 10. Context Providers (src/context/)

### `AuthContext`

Wrapa toda a app. Fornece o usuário logado.

```javascript
// Obtém o contexto
const { user, loading, signIn, signUp, signOut, resetPassword } = useAuth()
```

`user` é `null` enquanto não autenticado ou durante o carregamento inicial (`loading = true`).

---

### `ThemeContext`

```javascript
const { T, dark, setDark } = useTheme()

// T contém as cores do tema ativo:
T.bg     // Fundo principal
T.surf   // Superfície (cards)
T.surf2  // Superfície secundária (inputs, badges)
T.txt    // Texto primário
T.sub    // Texto secundário
T.bord   // Cor de borda
T.dark   // Boolean — true = dark mode
```

**Como funciona internamente:**

1. `PALETTES.dark` e `PALETTES.light` definem os valores hex de cada token
2. `useState(true)` controla o tema ativo (`setDark` é totalmente funcional)
3. Um `useEffect` sincroniza as CSS custom properties em `document.documentElement`:

```javascript
// Executado toda vez que dark muda
Object.entries(palette).forEach(([k, v]) =>
  root.style.setProperty(`--${k}`, v)   // --bg, --surf, --surf2, --txt, --sub, --bord
)
root.style.colorScheme = dark ? 'dark' : 'light'
root.classList.toggle('dark', dark)      // habilita dark: utilities do Tailwind
```

**Tokens Tailwind mapeados (via `@theme inline` no `index.css`):**

| CSS var | Tailwind utility |
|---|---|
| `var(--bg)` | `bg-bg`, `text-bg`, `border-bg` |
| `var(--surf)` | `bg-surf`, `text-surf` |
| `var(--surf2)` | `bg-surf2` |
| `var(--txt)` | `text-txt` |
| `var(--sub)` | `text-sub` |
| `var(--bord)` | `border-bord` |

Componentes legados que usam `style={{ background: T.surf }}` continuam funcionando. Novos componentes podem usar `className="bg-surf dark:bg-surf2"`.

**Paleta light** (pronta para implementar o toggle):
```javascript
// PALETTES.light em ThemeContext.jsx
bg:    '#F2F2F7', surf:  '#FFFFFF', surf2: '#E5E5EA',
txt:   '#000000', sub:   '#6E6E73', bord:  'rgba(0,0,0,.1)'
```

---

## 11. Páginas (src/pages/)

### `App.jsx` — Roteamento

Não há React Router. O "roteamento" é feito por dois estados:

```javascript
const [page, setPage]       = useState('seasonal')  // qual seção está ativa
const [detailId, setDetailId] = useState(null)       // ID do anime em detalhe
const [friendId, setFriendId] = useState(null)       // ID do amigo no perfil
```

**Hierarquia de render:**
```
friendId !== null → FriendProfilePage
detailId !== null → AnimePage
default           → <SeasonalPage | TopPage | CalendarPage | SearchPage | ProfilePage | NewsPage | CommunityPage>
```

---

### `SeasonalPage.jsx`

**Responsabilidade:** Tela home / descoberta.

**State local:**
```javascript
sections    // { popular: [], upcoming: [], romance: [], ... }
loadingSet  // Set de seções ainda carregando
archYear, archSeason, archData  // Arquivo de temporadas
heroBanner  // Banner AniList do anime hero (substituição do YouTube CDN)
```

**Seções exibidas (em ordem):**
1. Hero do anime em exibição (com banner AniList + carousel de 5s)
2. "Continue Assistindo" (shelf horizontal)
3. "Para Você" (recomendações por taste profile)
4. "Porque você assistiu X" (baseado em anime sendo assistido)
5. Grid principal (seasonal ou archive)
6. Seções de descoberta lazy-loaded (popular, upcoming, romance, etc.)

**Como adicionar uma nova seção de descoberta:**
```javascript
// Em DISCOVER_KEYS (linha ~22), adicionar:
{ key: 'horror', emoji: '👻', fn: () => fetchByGenre(14) }
// A seção será carregada automaticamente e exibida como ShelfRow
```

---

### `AnimePage.jsx`

**Responsabilidade:** Detalhe completo de um anime.

**State local:**
```javascript
banner    // bannerImage do AniList
chars     // personagens [{name, img, role, va, vaImg}]
recs      // recomendações
synExpand // sinopse expandida
comments  // comentários da comunidade
```

**Seções exibidas:**
1. Banner (AniList) ou gradient de cor
2. Poster + infos + ações do usuário (status, score, progresso, notas)
3. Links de streaming
4. WatchPanel (se isPremium)
5. Trailer YouTube (embed)
6. Personagens (AniList)
7. Comentários
8. Recomendações (ShelfRow)

---

### `ProfilePage.jsx`

**Responsabilidade:** Perfil completo do usuário logado.

**State local (principais):**
```javascript
committed / draft    // Metadados do perfil (antes/depois de editar)
editOpen             // Modal de edição aberto
charQuery / charResults / charLoading  // Busca de personagens para avatar
pinnedBanner         // Banner AniList do anime pinado
```

**Garantia de linha `profiles` no banco:**
```javascript
// Executa no login e troca de usuário — cria/atualiza a linha profiles
// sem isso, amigos veem apenas iniciais de usuários que nunca editaram o perfil
useEffect(() => {
  if (!user?.id) return
  const meta = initMeta(user)
  setCommitted(meta)
  upsertProfile(user, meta).catch(() => {})
}, [user?.id])
```

**Lógica de banner do perfil (ordem de prioridade):**
```
active.bannerUrl (imagem personalizada)
  → pinnedBanner (AniList bannerImage do anime pinado)
    → bannerBlurImg (imagem de capa com blur)
      → gradient de cor
```

**Admin Panel:** Visível apenas se `isAdmin(user)`. Permite buscar usuários e alternar status premium.

---

### `WatchPanel.jsx`

**Responsabilidade:** Player de episódios premium.

**Fluxo de dados dos episódios:**

```
fetchAnilistData(malId)
        │
        ├── streamingEpisodes[]
        │     └── parseEpNum(title) → epMap[n] = { thumbnail, title, airdate: null }
        │
        └── airingSchedule.nodes[]
              └── epMap[episode].airdate = new Date(airingAt * 1000).toISOString().split('T')[0]

epMap = streamEps state
```

**Filtro de episódios exibidos:**
```javascript
// Só oculta episódios com data de estreia FUTURA confirmada
// Episódios sem data = assume lançado, mostra sempre
airedEps = episodes.filter(ep => {
  const airdate = streamEps[ep]?.airdate
  if (!airdate) return true         // sem data → mostra
  return airdate <= today           // data passada → mostra
})
```

**Rastreamento de progresso:**
```
iframe MegaPlay
  → postMessage({ type: 'watching-log', currentTime, duration })
  → WatchPanel: if (currentTime/duration >= 0.85) → onEp(item.id, activeEp)
  → useLibrary.setEp() → Supabase upsert
```

---

### `CommunityPage.jsx`

**Tabs:** Fórum | Feedback

**Fórum:** Lista de tópicos → clica → abre thread inline → formulário de resposta.

**Feedback:** Lista com votos → formulário de nova sugestão → admin pode mudar status.

---

## 12. Componentes (src/components/)

### `MediaCard.jsx`

```javascript
<MediaCard
  item={animeObject}
  delay={0.1}           // delay de animação (segundos)
  onOpen={fn}
  onStatus={fn}
  variant="grid"        // "grid" | "shelf"
  matchPct={87}         // % de match (opcional, exibe badge)
/>
```

Mostra poster, score, status dot, badge de airing. Em `variant="shelf"`, é menor e horizontal.

---

### `ShelfRow.jsx`

```javascript
<ShelfRow
  title="Populares"
  subtitle="Baseado no seu gosto"
  emoji="🔥"
  items={[]}
  loading={false}
  onOpen={fn}
  onStatus={fn}
  headerRight={<button>...</button>}  // opcional
  matchScores={{ [id]: 87 }}          // opcional
/>
```

---

### `WatchPanel.jsx`

Usado apenas dentro de `AnimePage` quando `isPremium = true`.

```javascript
<WatchPanel item={animeObject} onEp={fn} onStatus={fn} />
```

---

### `Nav.jsx`

Tabs de navegação. Mobile usa bottom nav. Desktop usa top bar.

**Tabs disponíveis:** seasonal, top, calendar, search, news, community, profile.

---

### `NotificationBell.jsx`

Dropdown de notificações. Polling automático a cada 60s quando logado.

---

### `MALImport.jsx`

Modal que aceita upload de arquivo XML exportado do MyAnimeList. Faz parse e chama `importFromMAL(items)`.

---

### `AvatarPic.jsx`

```javascript
<AvatarPic profile={profileObject} size={40} animated={false} />
// Renderiza imagem (avatar_url) ou gradiente+iniciais (avatar_grad)
```

`profile` deve ter formato snake_case (objeto vindo do Supabase `profiles` table):
```javascript
{ avatar_url: String | null, avatar_grad: Number, display_name: String, username: String }
```

**Comportamento de fallback (em ordem):**
1. Se `avatar_url` está preenchido e carrega → exibe imagem com `objectFit: cover`
2. Se `avatar_url` falha (`onError`) → exibe gradiente + iniciais
3. Se `avatar_url` é null/vazio → exibe gradiente (`AVATAR_GRADS[avatar_grad]`) + iniciais

**Reset automático:** Um `useEffect` reseta o estado de erro (`imgError`) sempre que `avatar_url` muda, garantindo que uma URL nova seja sempre tentada mesmo que a anterior tenha falhado.

---

### `LoadingGrid.jsx`

```javascript
<LoadingGrid count={8} />
// Exibe N boxes com animação shimmer
```

---

### `Toast.jsx`

```javascript
<Toast message="Naruto → Assistindo" />
// Auto-dismiss em 2.4s (controlado pelo App.jsx)
```

---

### `StatBox.jsx`

```javascript
<StatBox
  label="Episódios"
  val="1.240"
  color="#34C759"
  icon="▶"
  fill={true}   // fundo colorido ou transparente
/>
```

---

## 13. Utilitários (src/utils/)

### `index.js`

```javascript
fmt(n)
// 1200000 → "1.2M"
// 820000  → "820K"
// 500     → "500"

fmtTime(minutes)
// 2400 → "40h"
// 150  → "2h 30m"
// 45   → "45m"

mergeWithUserData(apiItems)
// Lê localStorage "watchout_v2" e aplica userStatus/Score/Ep sobre items do Jikan
// Usado para manter dados do guest ao carregar a página

saveUserData(data)
// Salva array data[] no localStorage "watchout_v2" (apenas campos do usuário)
// Só é chamado se o usuário NÃO estiver logado
```

---

### `tasteProfile.js`

**`computeTasteProfile(library, { minItems = 3 })`**

Analisa a biblioteca e retorna um perfil de gosto. Requer pelo menos `minItems` animes com status ativo (não `plan_to_watch`).

```javascript
// Retorna null se biblioteca muito pequena, ou:
{
  weights: { Action: 0.30, Romance: 0.15, Fantasy: 0.20, ... },
  topGenres: ["Action", "Fantasy", "Romance"],
  topStudios: ["MAPPA", "Madhouse", "White Fox"],
  genreMinutes: { Action: 5400, Romance: 2160, ... },
  avgScoreByGenre: { Action: 7.8, Romance: 8.5, ... },
  genreCounts: { Action: 15, Romance: 9, ... },
  totalActive: 31
}
```

**`matchScore(anime, profile)`**

Compara um anime com o perfil do usuário. Retorna 0–99.
- Considera overlaps de gênero, pesos relativos e score médio do gênero.

**`personalityText(profile)`**

Retorna string descritiva do perfil baseado nos top gêneros:

| Condição | Descrição |
|----------|-----------|
| Psychological/Thriller em top3 | "You're drawn to dark, mind-bending stories" |
| Action em top1 | "You love intense action and epic battles" |
| Romance em top1 | "You're a hopeless romantic..." |
| Fantasy em top1 | "You're captivated by fantasy worlds" |
| Slice of Life em top1 | "You find beauty in everyday moments" |
| default | "You have eclectic taste..." |

---

## 14. Constantes (src/constants/)

```javascript
DAYS          // ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

SC            // Cores por plataforma
// { Crunchyroll: "#F47521", Netflix: "#E50914", Max: "#002BE7", ... }

STREAMING_URLS  // Funções que geram URL de busca por plataforma
// { Crunchyroll: title => `https://www.crunchyroll.com/search?q=...`, ... }

SM            // Cores por status
// { watching: { color, dot }, plan_to_watch: ..., completed: ..., dropped: ... }

AVATAR_GRADS  // 6 pares de cores para avatares gradiente
// [['#0A84FF','#BF5AF2'], ['#FF6B35','#FF2D55'], ...]

BANNER_THEMES // 8 pares de cores para banners de perfil
// [{ a:'#0A84FF', b:'#BF5AF2' }, ...]
```

---

## 15. Internacionalização (src/i18n/)

**Engine:** i18next com plugin react-i18next.

**Idiomas suportados:** Apenas inglês (`en`). A estrutura está preparada para adicionar `pt-BR` e outros.

**Como usar:**
```javascript
import { useTranslation } from 'react-i18next'
const { t } = useTranslation()

t('status.watching')      // "Watching"
t('nav.discover')         // "Discover"
t('anime.episodes')       // "Episodes"
```

**Como adicionar um novo idioma:**
1. Criar `src/i18n/pt-BR.json` com as mesmas chaves de `en.json`
2. Em `src/i18n/index.js`, importar e adicionar em `resources: { 'pt-BR': { translation: ptBR } }`
3. Remover `lng: 'en'` do config para habilitar detecção automática

---

## 16. Edge Functions (Supabase)

### `supabase/functions/anikoto/index.ts`

**Runtime:** Deno  
**Endpoint:** `POST /functions/v1/anikoto`  
**Auth:** Requer JWT válido no header `Authorization: Bearer <token>`

**Requisição:**
```json
{ "route": "anilist", "malId": 21 }
```

**Fluxo:**
```
1. Valida JWT do usuário
2. Verifica se usuário é premium OU admin
3. Busca em anikoto_cache (TTL 24h)
4. Se não cacheado: chama AniList GraphQL
5. Salva resultado no cache
6. Retorna { anilistId, episodes }
```

**Status de resposta:**
- `401` — JWT inválido ou ausente
- `403` — Usuário não é premium
- `400` — malId ausente ou rota desconhecida
- `200` — Sucesso

> **Nota:** Esta Edge Function é legada. O `WatchPanel` agora chama AniList diretamente via `fetchAnilistData()`. A Edge Function ainda existe mas só é chamada via `getAnilistData()` em `premium.js` como fallback.

---

## 17. Build & Deploy

### Build de produção
```bash
npm run build
# Saída em /dist
# Chunks separados: vendor-react, vendor-i18n, vendor-supabase
```

### Configuração Vite (`vite.config.js`)
```javascript
import tailwindcss from '@tailwindcss/vite'

plugins: [react(), tailwindcss()]  // Tailwind v4 via plugin Vite (sem PostCSS)

// Manual chunk splitting — evita bundle único grande
build.rollupOptions.output.manualChunks = {
  'vendor-react':    ['react', 'react-dom'],
  'vendor-i18n':     ['react-i18next', 'i18next'],
  'vendor-supabase': ['@supabase/supabase-js'],
}
// Source maps desabilitados em produção
// Warning de chunk a partir de 600KB
```

### Deploy recomendado
O projeto é uma SPA estática — pode ser deployado em:
- **Vercel** (recomendado) — detecta Vite automaticamente
- **Netlify** — adicionar `_redirects` com `/* /index.html 200`
- **Cloudflare Pages**

---

## 18. Variáveis de Ambiente

Criar `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Para as Edge Functions (configurar no Dashboard Supabase > Edge Functions > Secrets):
```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
```

> As variáveis prefixadas com `VITE_` são injetadas no bundle pelo Vite e ficam visíveis no cliente. **Nunca colocar a `SERVICE_ROLE_KEY` com prefixo VITE_**.

---

## 19. Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER (React SPA)                  │
│                                                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │AuthCtx   │  │ThemeCtx      │  │useLibrary (hook) │   │
│  │user/auth │  │T, dark       │  │data[], mutators  │   │
│  └──────────┘  └──────────────┘  └────────┬─────────┘   │
│                                           │              │
│  ┌────────────────────────────────────────▼───────────┐  │
│  │                    App.jsx                          │  │
│  │  page state │ detailId │ toast │ hero carousel     │  │
│  └──┬──────────┬──────────┬───────────────────────────┘  │
│     │          │          │                               │
│  Pages      AnimePage  Overlays                          │
│  Seasonal   WatchPanel  Auth, MALImport                  │
│  Top, Cal   Comments                                     │
│  Search                                                  │
│  Profile                                                 │
│  News, Community                                         │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  Services Layer                      │  │
│  │  jikan.js │ anilist.js │ userAnime.js │ friends.js  │  │
│  │  community.js │ notifications.js │ premium.js       │  │
│  └──────┬───────────┬──────────────┬────────────────────┘  │
└─────────│───────────│──────────────│─────────────────────┘
          │           │              │
          ▼           ▼              ▼
   ┌──────────┐ ┌──────────┐ ┌──────────────────────┐
   │ Jikan    │ │ AniList  │ │     SUPABASE         │
   │ REST API │ │GraphQL   │ │ ┌──────┐ ┌────────┐  │
   │ (MAL)   │ │ Public   │ │ │ Auth │ │  DB    │  │
   └──────────┘ └──────────┘ │ └──────┘ └────────┘  │
                              │ ┌────────────────┐   │
   ┌──────────┐               │ │ Edge Functions │   │
   │  ANN RSS │               │ │ anikoto        │   │
   │+ proxies │               │ └────────────────┘   │
   └──────────┘               └──────────────────────┘

   ┌───────────────────────────────┐
   │ MegaPlay (iframe embed)       │
   │ postMessage → progress track  │
   └───────────────────────────────┘
```

---

## 20. Fluxos Detalhados

### Fluxo: Usuário abre WatchPanel e assiste um episódio

```
1. Usuário abre AnimePage (isPremium = true)
      │
      ▼
2. WatchPanel monta
      │
      ▼
3. useEffect [item.id]
      ├── fetchAnilistData(item.id)         [AniList GraphQL]
      │     └── retorna { anilistId, episodes, streamingEpisodes, airingSchedule }
      │
      ├── Constrói epMap:
      │     streamingEpisodes → { thumbnail, title, airdate: null }
      │     airingSchedule    → adiciona airdate (Unix → "YYYY-MM-DD")
      │
      └── setStreamEps(epMap), setAnilistId(), setEpCount()
      │
      ▼
4. Calcula episódios visíveis:
      count = epCount ?? max(maxFromStreamEps, userEp + 1)
      airedEps = episodes onde (airdate === null OU airdate <= hoje)
      │
      ▼
5. Usuário clica em episódio N
      │
      └── setActiveEp(N) → iframe src = megaplay.buzz/stream/ani/{anilistId}/N/sub
      │
      ▼
6. MegaPlay envia postMessage quando atinge 85%
      │
      └── onEp(item.id, N)
            ├── useLibrary.setEp(id, N) → data[] atualizado
            └── upsertAnime(userId, {...item, userEp: N}) → Supabase
```

---

### Fluxo: Seleção de avatar com busca de personagens

```
1. Usuário faz login / ProfilePage monta
      │
      ▼
1b. useEffect [user.id]
      └── upsertProfile(user, meta) → garante linha na tabela profiles
      │
      ▼
2. Usuário abre modal de edição → editOpen = true
      │
      ▼
3. useEffect [editOpen]
      └── searchAnilistCharacters(null)
            → POST https://graphql.anilist.co
            → query: Page(perPage:16) { characters(sort:FAVOURITES_DESC) { id name { full } image { large } } }
            → Page.characters retorna array direto (NÃO .nodes)
            └── setCharResults([16 personagens mais populares])
      │
      ▼
4. Grid de 16 personagens exibido

5. Usuário digita no campo de busca → setCharQuery("Gojo")
      │
      ▼
6. useEffect [charQuery] — debounce 500ms
      └── searchAnilistCharacters("Gojo") → filtra por nome
            └── setCharResults([novos 16 resultados])
      │
      ▼
7. Usuário clica em personagem
      └── setDraft(d => ({ ...d, avatarUrl: node.image.large }))
      │
      ▼
8. Usuário salva
      ├── supabase.auth.updateUser({ data: draft })  → user_metadata.avatarUrl
      └── upsertProfile(user, draft)                 → profiles.avatar_url
```

**Onde o avatar aparece:**
- Próprio perfil (ProfilePage): lê `active.avatarUrl` — camelCase de `user_metadata`
- Perfis de amigos (FriendProfilePage, lista de amigos): `<AvatarPic profile={...}>` lê `profile.avatar_url` — snake_case da tabela `profiles`

---

### Fluxo: Importação de biblioteca do MAL

```
1. Usuário abre MALImport.jsx
      │
      ▼
2. Faz upload de animelist.xml
      │
      ▼
3. Parse XML → extrai cada <anime>:
      { id: mal_id, title, eps, userStatus, userEp, userScore }
      │
      ▼
4. importFromMAL(items) → useLibrary.js
      ├── setData(prev => merge itens existentes + novos)
      │
      └── upsertAnimesBatch(userId, items)
            └── chunks de 50 → upsert em animes + user_anime
      │
      ▼
5. Itens sem imagem são enriquecidos automaticamente:
      needsEnrich = library.filter(i => !i.img)
      → fetchAnimeById(id) [Jikan] com delay de 360ms entre requests
      → upsertAnime(userId, enriched) → Supabase
```

---

### Fluxo: Sistema de amigos

```
Usuário A busca Usuário B
      │
      ▼
searchProfiles("nomeusuario") → Supabase profiles

A envia request para B:
      sendFriendRequest(A.id, B.id)
        ├── INSERT INTO friendships (status='pending')
        └── createNotification(B.id, 'friend_request', ...)

B vê notificação → aceita:
      acceptFriendRequest(friendshipId)
        └── UPDATE friendships SET status='accepted'

A ou B podem ver perfil um do outro:
      loadFriendLibrary(userId) → SELECT *, animes(*) FROM user_anime WHERE user_id = ?

Desfazer amizade:
      deleteFriendship(friendshipId) → DELETE FROM friendships
```

---

### Fluxo: Notificações de episódio

```
useLibrary.js → onMount se user logado:

1. loadUserLibrary() retorna biblioteca
2. Filtra: airing=true, userStatus='watching', airDay=hoje
3. Para cada anime:
      hasNotificationToday(user.id, anime.id)
        → SELECT FROM notifications WHERE user_id=? AND data->>'anime_id'=? AND DATE(created_at)=TODAY
      Se false:
        createNotification(user.id, 'new_episode', 'New episode today!', anime.title, { anime_id, air_day })

NotificationBell polling: fetchNotifications() a cada 60s
```

---

## Dicas para Desenvolvedores

### Adicionar uma nova página

1. Criar `src/pages/MinhaPage.jsx`
2. Importar no `App.jsx`
3. Adicionar ao `Nav.jsx` (array de tabs)
4. Adicionar case no render do `App.jsx`:
   ```jsx
   {page === 'minha' && <MinhaPage ... />}
   ```
5. Adicionar traduções em `src/i18n/en.json`

### Adicionar uma nova tabela ao Supabase

1. Criar arquivo SQL em `supabase/migrations/YYYYMMDD_nome.sql`
2. Executar no SQL Editor do Dashboard Supabase
3. Criar funções correspondentes em `src/services/`
4. Habilitar RLS e criar políticas adequadas

### Adicionar uma nova coluna ao perfil do usuário

1. Alterar tabela `profiles` via migration
2. Atualizar `upsertProfile()` em `friends.js` para incluir a nova coluna
3. Atualizar `initMeta(user)` e `draft` no `ProfilePage.jsx`
4. Adicionar UI de edição no modal

### Estilo e tema

**Nova abordagem (Tailwind CSS v4):**
- Novos componentes → usar utilities do Tailwind: `className="bg-surf text-txt rounded-xl"`
- Tokens de cor disponíveis: `bg-bg`, `bg-surf`, `bg-surf2`, `text-txt`, `text-sub`, `border-bord`
- Dark mode automático via `dark:` prefix (ex: `dark:bg-surf2`) — funciona via classe `.dark` no `<html>`

**Abordagem legada (ainda válida):**
- Inline styles com valores do `T` (ThemeContext): `style={{ background: T.surf, color: T.txt }}`
- Para animações: usar classes do `index.css` (`.fu`, `.sc`, `.hf`, `.card`, `.shimmer`, `.t`)
- Para responsividade: `useIsMobile()` ou media queries em `index.css`

**Breakpoints:** `≤640px` = mobile, `641–900px` = tablet, `>900px` = desktop

**Adicionar novo token de cor ao tema:**
1. Adicionar valor em `PALETTES.dark` e `PALETTES.light` em `ThemeContext.jsx`
2. O `useEffect` já propagará automaticamente via `root.style.setProperty('--novaChave', valor)`
3. Adicionar `--color-novaChave: var(--novaChave)` no bloco `@theme inline` do `index.css`

### Boas práticas do projeto

- Todo serviço do Supabase começa com `if (!supabase) return` — mantém funcionalidade sem config
- Mutações de estado local acontecem **imediatamente** antes do Supabase — nunca aguardar a resposta para atualizar a UI
- Deduplicar arrays por `id` após merges para evitar itens duplicados
- Episódios sem `airdate` no AniList devem ser **mostrados** (assume lançado)
- A coluna `color` de um anime é gerada por `mal_id % 10` — determinística e sem API
