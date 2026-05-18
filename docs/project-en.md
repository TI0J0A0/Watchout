# Watchout — Complete Technical Documentation

> Developer reference guide for anyone working on the project.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Stack & Dependencies](#2-stack--dependencies)
3. [Directory Structure](#3-directory-structure)
4. [Main Data Flow](#4-main-data-flow)
5. [External APIs](#5-external-apis)
6. [Database (Supabase)](#6-database-supabase)
7. [Authentication](#7-authentication)
8. [Services (src/services/)](#8-services-srcservices)
9. [Custom Hooks (src/hooks/)](#9-custom-hooks-srchooks)
10. [Context Providers (src/context/)](#10-context-providers-srccontext)
11. [Pages (src/pages/)](#11-pages-srcpages)
12. [Components (src/components/)](#12-components-srccomponents)
13. [Utilities (src/utils/)](#13-utilities-srcutils)
14. [Constants (src/constants/)](#14-constants-srcconstants)
15. [Internationalization (src/i18n/)](#15-internationalization-srci18n)
16. [Edge Functions (Supabase)](#16-edge-functions-supabase)
17. [Build & Deploy](#17-build--deploy)
18. [Environment Variables](#18-environment-variables)
19. [Architecture Diagram](#19-architecture-diagram)
20. [Detailed Flows](#20-detailed-flows)

---

## 1. Overview

**Watchout** is an anime and series discovery and tracking platform. Users can:

- Discover current season anime, the most popular titles, and browse by genre
- Manage a personal library with status (watching, plan to watch, completed, dropped), score, and episode progress
- Watch episodes directly on the site (premium feature via MegaPlay embed)
- View a weekly airing calendar
- Read anime news (Anime News Network)
- Interact with the community via forum and feedback system
- Add friends and view other users' profiles and libraries
- Import a library from MyAnimeList via XML export

**Technical premise:** The frontend is a React SPA with no URL-based routing — navigation is handled by state (`page` and `detailId` in `App.jsx`). There is no Next.js, React Router, or similar.

### 1.1 Current Admin and Analytics Capabilities

The admin area is available from the `admin` page for the configured admin email. The interface is in English and grouped into Overview, Users, Content, and Moderation sections.

The `Real Metrics` panel reads real Supabase data from `site_metrics_events`, `user_anime`, `animes`, and `feedback_votes`. It shows anime views, episode plays, average watch time, completion rate, video start time, player errors, buffering events, banner CTR, views trend, top anime views, top episode plays, top searches, watchlist adds, banner performance, device performance, streaming quality, and trending anime.

Analytics events are sent through `trackMetricEvent()` in `src/services/metrics.js` and ingested by the `metrics-ingest` Supabase Edge Function. Current event types include `page_load`, `anime_open`, `search`, `search_result_click`, `search_recent_click`, `watchlist_add`, `banner_view`, `banner_click`, `episode_play`, `video_start_time`, `episode_complete`, `player_error`, and `player_buffering`.

New episode notifications use a 5-hour duplicate prevention window via `hasRecentEpisodeNotification()` and include anime metadata so `NotificationBell` can open the related anime detail page.

The search page centers the primary search box and stores opened search results in local storage under `watchout_recent_search_results`. Users can clear this list from the `Recent Search Results` section.

---

## 2. Stack & Dependencies

### Runtime
| Dependency | Version | Purpose |
|---|---|---|
| `react` | ^18.3.1 | UI library |
| `react-dom` | ^18.3.1 | DOM rendering |
| `@supabase/supabase-js` | ^2.105.1 | Database, auth, edge functions |
| `react-i18next` | ^17.0.6 | React translation bindings |
| `i18next` | ^26.0.8 | i18n engine |
| `i18next-browser-languagedetector` | ^8.2.1 | Browser language detection |

### Dev
| Dependency | Version | Purpose |
|---|---|---|
| `vite` | ^6.3.5 | Bundler / dev server |
| `@vitejs/plugin-react` | ^4.3.4 | JSX plugin for Vite |
| `tailwindcss` | ^4.x | CSS utilities and design tokens |
| `@tailwindcss/vite` | ^4.x | Tailwind v4 Vite integration (no PostCSS needed) |

### Tailwind CSS v4
Styling uses **Tailwind CSS v4** (Vite plugin, no `tailwind.config.js`) alongside inline styles with `ThemeContext` values for legacy components. Theme colors are exposed as CSS custom properties on `:root` and mapped to Tailwind color tokens via `@theme inline` in `index.css`.

| Approach | When to use |
|---|---|
| `className="bg-surf text-txt"` | New or migrated components |
| `style={{ background: T.surf }}` | Legacy components (still work) |
| `.fu`, `.sc`, `.card`, `.shimmer` | Animations and hover states (stay in `index.css`) |

### Scripts
```bash
npm run dev       # Start dev server (localhost:5173)
npm run build     # Production build to /dist
npm run preview   # Preview production build
```

---

## 3. Directory Structure

```
Watchout/
├── public/                        # Static assets (empty)
├── src/
│   ├── App.jsx                    # Root component, state-based routing
│   ├── main.jsx                   # React entry point
│   ├── index.css                  # Global styles and animations
│   │
│   ├── pages/                     # Full screen views
│   │   ├── SeasonalPage.jsx       # Discovery / Home
│   │   ├── TopPage.jsx            # MAL Top 25
│   │   ├── CalendarPage.jsx       # Weekly airing calendar
│   │   ├── SearchPage.jsx         # Anime search
│   │   ├── AnimePage.jsx          # Anime detail (overlay)
│   │   ├── ProfilePage.jsx        # User profile
│   │   ├── FriendProfilePage.jsx  # Friend profile (read-only)
│   │   ├── NewsPage.jsx           # News, trailers, on air
│   │   ├── CommunityPage.jsx      # Forum and feedback
│   │   └── AuthPage.jsx           # Login / signup (modal)
│   │
│   ├── components/                # Reusable UI components
│   │   ├── Nav.jsx                # Navigation bar
│   │   ├── MediaCard.jsx          # Anime card (grid/shelf)
│   │   ├── ShelfRow.jsx           # Horizontal scrollable shelf
│   │   ├── WatchPanel.jsx         # Episode player (premium)
│   │   ├── StatBox.jsx            # Stat display box
│   │   ├── AvatarPic.jsx          # User avatar renderer
│   │   ├── LoadingGrid.jsx        # Skeleton loader grid
│   │   ├── Toast.jsx              # Toast notification
│   │   ├── NotificationBell.jsx   # Notification dropdown
│   │   └── MALImport.jsx          # MAL XML import modal
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── useLibrary.js          # Global library state
│   │   ├── useClickOutside.js     # Close on outside click
│   │   ├── useIsMobile.js         # Mobile detection (≤640px)
│   │   └── useOnScreen.js         # Intersection Observer
│   │
│   ├── services/                  # Data access layer
│   │   ├── anilist.js             # AniList GraphQL API
│   │   ├── jikan.js               # Jikan API (MyAnimeList)
│   │   ├── userAnime.js           # User library CRUD (Supabase)
│   │   ├── friends.js             # Profiles and friendships (Supabase)
│   │   ├── community.js           # Forum and feedback (Supabase)
│   │   ├── notifications.js       # Notifications (Supabase)
│   │   ├── premium.js             # Premium status and admin
│   │   ├── ann.js                 # Anime News Network RSS
│   │   └── supabase.js            # Configured Supabase client
│   │
│   ├── context/
│   │   ├── AuthContext.jsx        # Authenticated user
│   │   └── ThemeContext.jsx       # Theme (dark mode)
│   │
│   ├── utils/
│   │   ├── index.js               # fmt, fmtTime, mergeWithUserData, saveUserData
│   │   └── tasteProfile.js        # Taste profile algorithm
│   │
│   ├── constants/
│   │   └── index.js               # DAYS, SC, SM, STREAMING_URLS, AVATAR_GRADS, BANNER_THEMES
│   │
│   └── i18n/
│       ├── index.js               # i18next configuration
│       └── en.json                # English translations (400+ keys)
│
├── supabase/
│   ├── functions/
│   │   └── anikoto/
│   │       └── index.ts           # Edge Function (Deno) — premium AniList proxy
│   └── migrations/
│       ├── 20260505_community.sql
│       ├── 20260505_anime_comments.sql
│       ├── 20260510_feedback_fixes.sql
│       ├── 20260510_user_anime_fix.sql
│       ├── 20260510_split_animes_table.sql
│       └── 20260510_drop_unused_tables.sql
│
├── docs/
│   ├── apis.md                    # External API documentation
│   ├── project.md                 # Full docs (Portuguese)
│   └── project-en.md              # This file
│
├── vite.config.js                 # Bundler configuration
└── package.json
```

---

## 4. Main Data Flow

### App Initialization

```
main.jsx
  └── App (AuthProvider > ThemeProvider)
        └── AppInner
              └── useLibrary()  ←── Central state hook
                    ├── fetchSeasonal()     [Jikan API]
                    └── loadUserLibrary()   [Supabase]  ← only if logged in
```

### Data merge (useLibrary)

```
fetchSeasonal() resolves
        │
        ▼
setData(mergeWithUserData(items))  ← localStorage fallback (guest mode)
        │
        ▼ (if user is logged in)
loadUserLibrary() resolves
        │
        ▼
setData(prev => {
  // update status/score/ep for seasonal items
  // append library items not in seasonal
  // deduplicate by id
})
```

### Opening anime detail

```
User clicks on a card
      │
      ▼
openDetail(item)
      │
      ├── addToData(item)      ← ensures item is in data[]
      └── setDetailId(item.id)
              │
              ▼
      AnimePage renders with:
        item = data.find(d => d.id === detailId)
              │
              ├── fetchAnilistBanner(item.id)   → banner + characters
              ├── fetchRecommendations(item.id) → recs via Jikan
              └── (if premium) WatchPanel
                        │
                        └── fetchAnilistData(item.id) → episodes, airingSchedule
```

### Status update flow

```
User selects a status
      │
      ▼
handleStatus(id, status) → App.jsx
      │
      ▼
setStatus(id, status) → useLibrary.js
      │
      ├── setData(d => d.map(...))          ← updates local state immediately
      └── upsertAnime(user.id, updated)     → Supabase [async, fire-and-forget]
```

---

## 5. External APIs

### 5.1 Jikan API (MyAnimeList)

**Base URL:** `https://api.jikan.moe/v4`  
**Auth:** None (public, rate limit ~3 req/s)  
**File:** `src/services/jikan.js`

| Function | Endpoint | Returns |
|--------|----------|-----------------|
| `fetchSeasonal()` | `GET /seasons/now?limit=24` | 24 current season anime |
| `fetchTop()` | `GET /top/anime?limit=25` | Top 25 ranked |
| `searchAnime(q)` | `GET /anime?q=...&limit=20&sfw=true` | Search by title |
| `fetchPopular()` | `GET /anime?status=airing&order_by=members&sort=desc&limit=15` | Most watched airing |
| `fetchUpcoming()` | `GET /seasons/upcoming?limit=15` | Next season |
| `fetchByGenre(id, limit)` | `GET /anime?genres=ID&order_by=score&sort=desc&limit=N` | By MAL genre ID |
| `fetchSeasonArchive(y, s)` | `GET /seasons/YEAR/SEASON?limit=24` | Past seasons |
| `fetchAnimeById(id)` | `GET /anime/ID` | Single anime metadata |
| `fetchRecommendations(id)` | `GET /anime/ID/recommendations` | Related anime |

**Data mapping via `mapAnime(a)`:**
```javascript
{
  id:        a.mal_id,
  title:     a.title_english || a.title,
  score:     a.score || 0,
  eps:       a.episodes || null,
  type:      a.type === "Movie" ? "film" : "anime",
  studio:    a.studios?.[0]?.name || "—",
  year:      a.year || new Date().getFullYear(),
  genres:    [],               // genre names
  airing:    Boolean,
  airDay:    "Mon"..."Sun" | null,
  duration:  Number,           // minutes per episode
  color:     String,           // primary palette color
  colorB:    String,           // secondary palette color
  img:       String,           // cover image URL
  synopsis:  String,
  streaming: [],               // ["Crunchyroll", "Netflix", ...]
  members:   Number,
  trailer:   String | null,    // YouTube embed_url
  userStatus: null, userScore: null, userEp: 0, userNotes: ""
}
```

**Color palette:** 10 pre-defined color pairs; selected by `mal_id % 10`. Deterministic — no API call needed.

---

### 5.2 AniList GraphQL API

**Base URL:** `https://graphql.anilist.co`  
**Auth:** None (public)  
**File:** `src/services/anilist.js`

All functions go through the internal helper `gql(query, variables)` which sends a `POST` request with `Content-Type: application/json`.

#### `fetchAnilistData(malId)`
Used by `WatchPanel` when opening the watch panel.

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

Returns:
```javascript
{
  anilistId:         Number,   // AniList ID (used in player URL)
  episodes:          Number | null,
  duration:          Number | null,  // minutes per episode
  streamingEpisodes: [{ title, thumbnail }],
  airingSchedule:    [{ episode, airingAt }]  // airingAt = Unix timestamp
}
```

#### `fetchAnilistBanner(malId)`
Used by `AnimePage` — returns banner + characters in a single request.

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

Returns:
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
Lightweight version — only `bannerImage`. Used in `SeasonalPage` (hero) and `ProfilePage` (pinned anime banner).

#### `searchAnilistCharacters(search)`
Used in the profile avatar picker.

```graphql
query($search: String) {
  Page(perPage: 16) {
    characters(search: $search, sort: FAVOURITES_DESC) {
      id name { full } image { large }
    }
  }
}
```

> **AniList schema note:** `Page.characters` returns a flat `Character[]` array — **not** a `CharacterConnection` with `.nodes`. Using `.nodes` causes a 400 error. By contrast, `Media.characters` (per-anime lookup) returns a `CharacterConnection` and requires `.edges[].node`.

- `search = null` → returns the 16 most popular characters globally.
- `search = "Naruto"` → filters by name.

Returns: `Character[]` with `{ id, name: { full }, image: { large } }`

---

### 5.3 Anime News Network RSS

**URL:** `https://www.animenewsnetwork.com/all/rss.xml`  
**Auth:** None  
**File:** `src/services/ann.js`

Cannot be fetched directly due to CORS. Uses 3 proxies in cascade with automatic fallback:

```
1. https://api.codetabs.com/v1/proxy/?quest=URL   ← primary
2. https://api.allorigins.win/raw?url=URL          ← fallback
3. https://corsproxy.io/?URL                       ← last resort
```

Returns up to 40 articles with: `title`, `link`, `description`, `pubDate`, `category`.

---

### 5.4 MegaPlay (Streaming embed)

**Base URL:** `https://megaplay.buzz/stream/ani`  
**Auth:** None  
**File:** `src/components/WatchPanel.jsx`

Not a REST API — embedded as an `<iframe>`.

**Player URL format:**
```
https://megaplay.buzz/stream/ani/{anilistId}/{episode}/{language}?quality={quality}
```

| Parameter | Options |
|-----------|--------|
| `{language}` | `sub`, `dub`, `pt-br`, `es` |
| `{quality}` | `auto`, `1080`, `720`, `480` |

**`postMessage` communication:**
The iframe sends events via `window.postMessage` that `WatchPanel` intercepts to track watch progress:

```javascript
// Watch time event
{ type: 'watching-log', duration: 1440, currentTime: 1250 }
// When currentTime/duration >= 0.85 → marks episode as watched

// Percentage event
{ event: 'time', percent: 0.87 }

// Completion event
{ event: 'complete' }
```

---

## 6. Database (Supabase)

### Table Schemas

#### `animes` — Shared anime metadata
```sql
id         INTEGER PRIMARY KEY   -- MAL ID
title      TEXT
img        TEXT                  -- Cover image URL
type       TEXT                  -- "anime" | "film"
eps        INTEGER
duration   INTEGER               -- Minutes per episode
score      FLOAT
color      TEXT                  -- Primary color (#hex)
color_b    TEXT                  -- Secondary color (#hex)
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
RLS: public read, authenticated write.

#### `user_anime` — User library
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

#### `profiles` — User profiles
```sql
id           UUID PRIMARY KEY REFERENCES auth.users(id)
username     TEXT UNIQUE
display_name TEXT
avatar_url   TEXT
avatar_grad  INTEGER DEFAULT 0    -- index into AVATAR_GRADS
is_premium   BOOLEAN DEFAULT false
role         TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'))
updated_at   TIMESTAMPTZ DEFAULT now()
```

#### `friendships` — Friend connections
```sql
id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
requester_id UUID REFERENCES auth.users(id)
addressee_id UUID REFERENCES auth.users(id)
status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted'))
created_at   TIMESTAMPTZ DEFAULT now()
```

#### `forum_topics` — Forum threads
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

#### `forum_posts` — Forum replies
```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
topic_id   UUID REFERENCES forum_topics(id)
user_id    UUID REFERENCES profiles(id)
content    TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

#### `anime_comments` — Per-anime comments
```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
anime_id   INTEGER
user_id    UUID REFERENCES profiles(id)
content    TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

#### `feedback` — Feature requests and bug reports
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

#### `feedback_votes` — Vote deduplication
```sql
user_id     UUID REFERENCES profiles(id)
feedback_id UUID REFERENCES feedback(id)
PRIMARY KEY (user_id, feedback_id)
```

#### `notifications` — User notifications
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

#### `anikoto_cache` — Edge Function cache
```sql
cache_key  TEXT PRIMARY KEY
data       JSONB
cached_at  TIMESTAMPTZ DEFAULT now()
```

### Entity Relationship Diagram

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

## 7. Authentication

**File:** `src/context/AuthContext.jsx`  
**Service:** Supabase Auth (email/password)

```javascript
// Consuming the context
const { user, loading, signIn, signUp, signOut, resetPassword } = useAuth()

// user = Supabase auth.users() record (null if not logged in)
// user.id   = UUID
// user.email = email address
```

### Login / Signup flow

```
AuthPage.jsx
      │
      ├── signIn(email, password)
      │         └── supabase.auth.signInWithPassword()
      │
      ├── signUp(email, password)
      │         └── supabase.auth.signUp()
      │                   └── Supabase trigger auto-creates a row in profiles
      │
      └── resetPassword(email)
                └── supabase.auth.resetPasswordForEmail()
```

### Session persistence
The Supabase client is configured with `persistSession: true` — the JWT is stored in localStorage and automatically refreshed.

### Admin
The admin is identified by a hardcoded email address:
```javascript
// src/services/premium.js
export const ADMIN_EMAIL = 'joaoguiar99@gmail.com'
export const isAdmin = (user) => user?.email === ADMIN_EMAIL
```
Admin users have access to the user management panel in `ProfilePage` and automatically bypass the premium gate.

---

## 8. Services (src/services/)

### `supabase.js`
```javascript
// Creates and exports the Supabase client, or null if env vars are missing
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
})
```
Always check `if (!supabase) return` before using — ensures the app works without configuration.

---

### `userAnime.js`

#### Main functions

```javascript
// Load the logged-in user's library with JOIN on the animes table
loadUserLibrary() → Promise<item[]>
// Query: SELECT *, animes(*) FROM user_anime WHERE user_id = ?

// Save/update a single anime (upsert into animes + user_anime)
upsertAnime(userId, item) → Promise<void>

// Batch upserts (MAL import) — processed in chunks of 50
upsertAnimesBatch(userId, items) → Promise<void>

// Remove from user's list (does not delete from animes table)
removeAnime(userId, animeId) → Promise<void>

// Another user's library (for viewing a friend's profile)
loadFriendLibrary(userId) → Promise<item[]>
```

#### `fromRow(row)` — DB → App mapping
```javascript
function fromRow(row) {
  // row.animes is populated after the split migration
  // falls back to row columns directly if migration not yet applied
  const a = row.animes || row
  return {
    id, title, img, type, eps, duration, score,
    color, colorB, genres, studio, year, airing, airDay,
    synopsis, streaming, members,           // from animes table
    userStatus, userScore, userEp, userNotes // from user_anime table
  }
}
```

---

### `friends.js`

```javascript
upsertProfile(user, meta)               // Save profile after login or edit
getProfile(userId)                      // Fetch any user's profile
checkDisplayNameAvailable(name, userId) // Boolean — checks uniqueness
searchProfiles(query)                   // Search by username/display_name
sendFriendRequest(requesterId, addresseeId) // Creates friendship + notification
acceptFriendRequest(friendshipId)       // status: 'pending' → 'accepted'
deleteFriendship(friendshipId)          // Removes friendship
getFriendsWithProfiles(userId)          // Accepted friendships + friend data
getPendingRequests(userId)              // Incoming pending requests
```

---

### `community.js`

#### Forum
```javascript
fetchTopics()                           // Last 60 topics
fetchTopic(id)                          // Single topic (increments view count)
fetchPosts(topicId)                     // Posts in a topic thread
createTopic({ userId, title, content, animeId, animeTitle })
createPost({ userId, topicId, content })
deleteTopic(id)
deletePost(id)
```

#### Feedback
```javascript
fetchFeedback()                         // All items, sorted by votes DESC
createFeedback({ userId, type, title, description })
toggleVote(feedbackId, userId, currentVotes, hasVoted) // Upvote/undo
fetchMyVotes(userId)                    // IDs of feedback items the user voted on
updateFeedbackStatus(feedbackId, status) // Admin: open | reviewing | done
```

#### Anime comments
```javascript
fetchAnimeComments(animeId)             // Comments on an anime
createAnimeComment({ userId, animeId, content })
deleteAnimeComment(id)
```

---

### `notifications.js`

```javascript
fetchNotifications(userId)              // Last 50 notifications
markRead(id)
markAllRead(userId)
createNotification(userId, type, title, body, data) // data = JSONB
hasNotificationToday(userId, animeId)   // Prevents duplicate episode notifs
hasRecentNotification(userId, type, animeId, epCount)
```

---

### `premium.js`

```javascript
ADMIN_EMAIL                             // "joaoguiar99@gmail.com"
isAdmin(user)                           // Boolean
loadPremiumStatus(userId)               // Boolean — reads profiles.is_premium
grantPremium(profileId)                 // Admin: set is_premium = true
revokePremium(profileId)                // Admin: set is_premium = false
adminSearchUsers(query)                 // Admin: search users by username/display_name
getAnilistData(malId)                   // Calls anikoto Edge Function (legacy, still exists)
```

---

### `ann.js`

```javascript
fetchAnnNews() → Promise<Article[]>
// Article = { title, link, description, pubDate, category }
```

Tries all 3 CORS proxies in sequence. Throws if all fail.

---

## 9. Custom Hooks (src/hooks/)

### `useLibrary()` — The most important hook

Global state for the entire anime library. Called exactly once in `App.jsx`.

**Returns:**
```javascript
{
  data: Item[],          // All anime (seasonal + user library)
  setData,               // Direct setter (use with care)
  loading: Boolean,      // true during initial Jikan fetch
  topData: Item[],       // Top 25 (lazy-loaded on demand)
  topLoaded: Boolean,
  loadTop: () => void,   // Triggers top 25 fetch

  // Mutators — update data[] locally AND sync to Supabase
  setStatus(id, status),  // null = remove from list
  setScore(id, value),
  setEp(id, value),
  setNotes(id, text),     // Auto-saves with 800ms debounce

  importFromMAL(items),   // Merge from MAL XML import
  addToData(item),        // Adds item if not already in data[]
}
```

**Execution order:**
```
Mount
  → fetchSeasonal() → setData (with localStorage if guest)
  → [if user] loadUserLibrary() → setData (merge)
  → [if user] enrich items missing img → fetchAnimeById + upsertAnime

user changes
  → re-executes loadUserLibrary
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
const isMobile = useIsMobile()  // true if window.innerWidth <= 640
```

---

### `useOnScreen(rootMargin)`

```javascript
const [ref, visible] = useOnScreen('300px')
// visible = true when the element enters the viewport with 300px lookahead
```

---

## 10. Context Providers (src/context/)

### `AuthContext`

Wraps the entire app. Provides the logged-in user.

```javascript
const { user, loading, signIn, signUp, signOut, resetPassword } = useAuth()
```

`user` is `null` while unauthenticated or during initial load (`loading = true`).

---

### `ThemeContext`

```javascript
const { T, dark, setDark } = useTheme()

// T contains the active theme colors:
T.bg     // Main background
T.surf   // Surface (cards)
T.surf2  // Secondary surface (inputs, badges)
T.txt    // Primary text
T.sub    // Secondary text
T.bord   // Border color
T.dark   // Boolean — true = dark mode
```

**How it works internally:**

1. `PALETTES.dark` and `PALETTES.light` define the hex values for each token
2. `useState(true)` controls the active theme (`setDark` is fully functional)
3. A `useEffect` syncs CSS custom properties on `document.documentElement`:

```javascript
// Runs every time dark changes
Object.entries(palette).forEach(([k, v]) =>
  root.style.setProperty(`--${k}`, v)   // --bg, --surf, --surf2, --txt, --sub, --bord
)
root.style.colorScheme = dark ? 'dark' : 'light'
root.classList.toggle('dark', dark)      // enables Tailwind dark: utilities
```

**Tailwind tokens mapped (via `@theme inline` in `index.css`):**

| CSS var | Tailwind utility |
|---|---|
| `var(--bg)` | `bg-bg`, `text-bg`, `border-bg` |
| `var(--surf)` | `bg-surf`, `text-surf` |
| `var(--surf2)` | `bg-surf2` |
| `var(--txt)` | `text-txt` |
| `var(--sub)` | `text-sub` |
| `var(--bord)` | `border-bord` |

Legacy components using `style={{ background: T.surf }}` continue to work. New components can use `className="bg-surf dark:bg-surf2"`.

**Light palette** (ready to wire up a toggle):
```javascript
// PALETTES.light in ThemeContext.jsx
bg:    '#F2F2F7', surf:  '#FFFFFF', surf2: '#E5E5EA',
txt:   '#000000', sub:   '#6E6E73', bord:  'rgba(0,0,0,.1)'
```

---

## 11. Pages (src/pages/)

### `App.jsx` — Routing

There is no React Router. "Routing" is done via two state variables:

```javascript
const [page, setPage]         = useState('seasonal') // active section
const [detailId, setDetailId] = useState(null)        // anime detail ID
const [friendId, setFriendId] = useState(null)        // friend profile ID
```

**Render hierarchy:**
```
friendId !== null → FriendProfilePage
detailId !== null → AnimePage
default           → <SeasonalPage | TopPage | CalendarPage | SearchPage | ProfilePage | NewsPage | CommunityPage>
```

---

### `SeasonalPage.jsx`

**Responsibility:** Home / discovery screen.

**Local state:**
```javascript
sections    // { popular: [], upcoming: [], romance: [], ... }
loadingSet  // Set of sections still loading
archYear, archSeason, archData  // Season archive
heroBanner  // AniList bannerImage for the hero anime
```

**Sections displayed (in order):**
1. Hero anime carousel (AniList banner + 5s auto-rotate)
2. "Continue Watching" shelf
3. "For You" (taste profile-based recommendations)
4. "Because you watched X" (based on currently watching)
5. Main grid (seasonal or archive)
6. Lazy-loaded discovery shelves (popular, upcoming, romance, etc.)

**How to add a new discovery section:**
```javascript
// In DISCOVER_KEYS (around line 22), add:
{ key: 'horror', emoji: '👻', fn: () => fetchByGenre(14) }
// The section will be automatically loaded and displayed as a ShelfRow
```

---

### `AnimePage.jsx`

**Responsibility:** Full anime detail view.

**Local state:**
```javascript
banner    // AniList bannerImage
chars     // characters [{name, img, role, va, vaImg}]
recs      // recommendations
synExpand // expanded synopsis
comments  // community comments
```

**Sections displayed:**
1. Banner (AniList) or color gradient
2. Poster + info + user actions (status, score, progress, notes)
3. Streaming service links
4. WatchPanel (if isPremium)
5. YouTube trailer (embed)
6. Characters (AniList)
7. Community comments
8. Recommendations (ShelfRow)

---

### `ProfilePage.jsx`

**Responsibility:** Full logged-in user profile.

**Key local state:**
```javascript
committed / draft    // Profile metadata (before/after editing)
editOpen             // Edit modal open
charQuery / charResults / charLoading  // Character search for avatar
pinnedBanner         // AniList banner of pinned anime
```

**Guaranteed `profiles` row:**
```javascript
// Runs on login and user change — creates/updates the profiles row
// Without this, friends see only initials for users who never edited their profile
useEffect(() => {
  if (!user?.id) return
  const meta = initMeta(user)
  setCommitted(meta)
  upsertProfile(user, meta).catch(() => {})
}, [user?.id])
```

**Profile banner priority order:**
```
active.bannerUrl (custom image)
  → pinnedBanner (AniList bannerImage of pinned anime)
    → bannerBlurImg (blurred cover image)
      → color gradient
```

**Admin Panel:** Visible only when `isAdmin(user)`. Allows searching users and toggling premium status.

---

### `WatchPanel.jsx`

**Responsibility:** Premium episode player.

**Episode data flow:**

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

**Episode visibility filter:**
```javascript
// Only hides episodes with a confirmed FUTURE airdate
// Episodes with no airdate are always shown (assumed released)
airedEps = episodes.filter(ep => {
  const airdate = streamEps[ep]?.airdate
  if (!airdate) return true       // no date → show
  return airdate <= today         // past date → show
})
```

**Progress tracking:**
```
MegaPlay iframe
  → postMessage({ type: 'watching-log', currentTime, duration })
  → WatchPanel: if (currentTime/duration >= 0.85) → onEp(item.id, activeEp)
  → useLibrary.setEp() → Supabase upsert
```

---

### `CommunityPage.jsx`

**Tabs:** Forum | Feedback

**Forum:** Topic list → click → opens thread inline → reply form.

**Feedback:** List with votes → new suggestion form → admin can change status.

---

## 12. Components (src/components/)

### `MediaCard.jsx`

```javascript
<MediaCard
  item={animeObject}
  delay={0.1}           // animation delay (seconds)
  onOpen={fn}
  onStatus={fn}
  variant="grid"        // "grid" | "shelf"
  matchPct={87}         // match % (optional, shows badge)
/>
```

Displays poster, score, status dot, airing badge. In `variant="shelf"` mode it is smaller and horizontal.

---

### `ShelfRow.jsx`

```javascript
<ShelfRow
  title="Popular"
  subtitle="Based on your taste"
  emoji="🔥"
  items={[]}
  loading={false}
  onOpen={fn}
  onStatus={fn}
  headerRight={<button>...</button>}  // optional
  matchScores={{ [id]: 87 }}          // optional
/>
```

---

### `WatchPanel.jsx`

Only used inside `AnimePage` when `isPremium = true`.

```javascript
<WatchPanel item={animeObject} onEp={fn} onStatus={fn} />
```

---

### `Nav.jsx`

Navigation tabs. Mobile uses a bottom nav bar. Desktop uses a top bar.

**Available tabs:** seasonal, top, calendar, search, news, community, profile.

---

### `NotificationBell.jsx`

Notification dropdown. Auto-polls every 60s when logged in.

---

### `MALImport.jsx`

Modal that accepts an XML file exported from MyAnimeList. Parses it and calls `importFromMAL(items)`.

---

### `AvatarPic.jsx`

```javascript
<AvatarPic profile={profileObject} size={40} animated={false} />
// Renders image (avatar_url) or gradient + initials (avatar_grad)
```

`profile` must be in snake_case format (object from the Supabase `profiles` table):
```javascript
{ avatar_url: String | null, avatar_grad: Number, display_name: String, username: String }
```

**Fallback behavior (in order):**
1. If `avatar_url` is set and loads → shows image with `objectFit: cover`
2. If `avatar_url` fails (`onError`) → shows gradient + initials
3. If `avatar_url` is null/empty → shows gradient (`AVATAR_GRADS[avatar_grad]`) + initials

**Auto-reset:** A `useEffect` resets the error state (`imgError`) whenever `avatar_url` changes, ensuring any new URL is always attempted even if the previous one failed.

---

### `LoadingGrid.jsx`

```javascript
<LoadingGrid count={8} />
// Renders N shimmer boxes
```

---

### `Toast.jsx`

```javascript
<Toast message="Naruto → Watching" />
// Auto-dismisses after 2.4s (controlled by App.jsx)
```

---

### `StatBox.jsx`

```javascript
<StatBox
  label="Episodes"
  val="1,240"
  color="#34C759"
  icon="▶"
  fill={true}   // filled background or transparent
/>
```

---

## 13. Utilities (src/utils/)

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
// Reads localStorage "watchout_v2" and applies userStatus/Score/Ep onto Jikan items
// Used to preserve guest data when the page loads

saveUserData(data)
// Saves data[] to localStorage "watchout_v2" (user fields only)
// Only called when the user is NOT logged in
```

---

### `tasteProfile.js`

**`computeTasteProfile(library, { minItems = 3 })`**

Analyzes the library and returns a taste profile. Requires at least `minItems` anime with an active status (not `plan_to_watch`).

```javascript
// Returns null if library is too small, otherwise:
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

Compares an anime against the user's profile. Returns 0–99.
- Considers genre overlap, relative weights, and average genre score.

**`personalityText(profile)`**

Returns a descriptive string based on top genres:

| Condition | Description |
|----------|-----------|
| Psychological/Thriller in top 3 | "You're drawn to dark, mind-bending stories" |
| Action at #1 | "You love intense action and epic battles" |
| Romance at #1 | "You're a hopeless romantic..." |
| Fantasy at #1 | "You're captivated by fantasy worlds" |
| Slice of Life at #1 | "You find beauty in everyday moments" |
| default | "You have eclectic taste..." |

---

## 14. Constants (src/constants/)

```javascript
DAYS          // ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

SC            // Streaming service brand colors
// { Crunchyroll: "#F47521", Netflix: "#E50914", Max: "#002BE7", ... }

STREAMING_URLS  // Functions that generate search URLs per platform
// { Crunchyroll: title => `https://www.crunchyroll.com/search?q=...`, ... }

SM            // Status colors and dot colors
// { watching: { color, dot }, plan_to_watch: ..., completed: ..., dropped: ... }

AVATAR_GRADS  // 6 gradient color pairs for avatars
// [['#0A84FF','#BF5AF2'], ['#FF6B35','#FF2D55'], ...]

BANNER_THEMES // 8 color pairs for profile banners
// [{ a:'#0A84FF', b:'#BF5AF2' }, ...]
```

---

## 15. Internationalization (src/i18n/)

**Engine:** i18next with react-i18next plugin.

**Supported languages:** English only (`en`). The structure is ready for `pt-BR` or other locales.

**Usage:**
```javascript
import { useTranslation } from 'react-i18next'
const { t } = useTranslation()

t('status.watching')      // "Watching"
t('nav.discover')         // "Discover"
t('anime.episodes')       // "Episodes"
```

**How to add a new language:**
1. Create `src/i18n/pt-BR.json` with the same keys as `en.json`
2. In `src/i18n/index.js`, import and add to `resources: { 'pt-BR': { translation: ptBR } }`
3. Remove `lng: 'en'` from the config to enable automatic browser detection

---

## 16. Edge Functions (Supabase)

### `supabase/functions/anikoto/index.ts`

**Runtime:** Deno  
**Endpoint:** `POST /functions/v1/anikoto`  
**Auth:** Requires a valid JWT in the `Authorization: Bearer <token>` header

**Request body:**
```json
{ "route": "anilist", "malId": 21 }
```

**Flow:**
```
1. Validate user JWT
2. Check if user is premium OR admin
3. Look up anikoto_cache (24h TTL)
4. If not cached: call AniList GraphQL
5. Save result to cache
6. Return { anilistId, episodes }
```

**Response status codes:**
- `401` — Invalid or missing JWT
- `403` — User is not premium
- `400` — Missing malId or unknown route
- `200` — Success

> **Note:** This Edge Function is legacy. `WatchPanel` now calls AniList directly via `fetchAnilistData()`. The function still exists and is called via `getAnilistData()` in `premium.js` as a fallback.

---

## 17. Build & Deploy

### Production build
```bash
npm run build
# Output in /dist
# Separate chunks: vendor-react, vendor-i18n, vendor-supabase
```

### Vite configuration (`vite.config.js`)
```javascript
import tailwindcss from '@tailwindcss/vite'

plugins: [react(), tailwindcss()]  // Tailwind v4 via Vite plugin (no PostCSS)

// Manual chunk splitting — avoids a single large bundle
build.rollupOptions.output.manualChunks = {
  'vendor-react':    ['react', 'react-dom'],
  'vendor-i18n':     ['react-i18next', 'i18next'],
  'vendor-supabase': ['@supabase/supabase-js'],
}
// Source maps disabled in production
// Chunk size warning threshold: 600KB
```

### Recommended hosting
The project is a static SPA — it can be deployed to:
- **Vercel** (recommended) — detects Vite automatically
- **Netlify** — add `_redirects` file with `/* /index.html 200`
- **Cloudflare Pages**

---

## 18. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

For Edge Functions (configure in Supabase Dashboard > Edge Functions > Secrets):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
```

> Variables prefixed with `VITE_` are injected into the bundle by Vite and are visible to the client. **Never expose `SERVICE_ROLE_KEY` with the `VITE_` prefix.**

---

## 19. Architecture Diagram

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
   │  Jikan   │ │ AniList  │ │      SUPABASE        │
   │ REST API │ │ GraphQL  │ │ ┌──────┐ ┌────────┐  │
   │  (MAL)   │ │  Public  │ │ │ Auth │ │   DB   │  │
   └──────────┘ └──────────┘ │ └──────┘ └────────┘  │
                              │ ┌────────────────┐   │
   ┌──────────┐               │ │ Edge Functions │   │
   │  ANN RSS │               │ │   anikoto      │   │
   │+ proxies │               │ └────────────────┘   │
   └──────────┘               └──────────────────────┘

   ┌───────────────────────────────┐
   │  MegaPlay (iframe embed)      │
   │  postMessage → progress track │
   └───────────────────────────────┘
```

---

## 20. Detailed Flows

### Flow: User opens WatchPanel and watches an episode

```
1. User opens AnimePage (isPremium = true)
      │
      ▼
2. WatchPanel mounts
      │
      ▼
3. useEffect [item.id]
      ├── fetchAnilistData(item.id)          [AniList GraphQL]
      │     └── returns { anilistId, episodes, streamingEpisodes, airingSchedule }
      │
      ├── Builds epMap:
      │     streamingEpisodes → { thumbnail, title, airdate: null }
      │     airingSchedule    → adds airdate (Unix timestamp → "YYYY-MM-DD")
      │
      └── setStreamEps(epMap), setAnilistId(), setEpCount()
      │
      ▼
4. Calculates visible episodes:
      count = epCount ?? max(maxFromStreamEps, userEp + 1)
      airedEps = episodes where (airdate === null OR airdate <= today)
      │
      ▼
5. User clicks episode N
      │
      └── setActiveEp(N) → iframe src = megaplay.buzz/stream/ani/{anilistId}/N/sub
      │
      ▼
6. MegaPlay sends postMessage when 85% is reached
      │
      └── onEp(item.id, N)
            ├── useLibrary.setEp(id, N) → data[] updated locally
            └── upsertAnime(userId, {...item, userEp: N}) → Supabase
```

---

### Flow: Avatar selection with character search

```
1. User logs in / ProfilePage mounts
      │
      ▼
1b. useEffect [user.id]
      └── upsertProfile(user, meta) → ensures a row exists in profiles table
      │
      ▼
2. User opens the edit modal → editOpen = true
      │
      ▼
3. useEffect [editOpen]
      └── searchAnilistCharacters(null)
            → POST https://graphql.anilist.co
            → query: Page(perPage:16) { characters(sort:FAVOURITES_DESC) { id name { full } image { large } } }
            → Page.characters returns a flat array (NOT .nodes)
            └── setCharResults([top 16 most popular characters])
      │
      ▼
4. Grid of 16 characters displayed

5. User types in the search field → setCharQuery("Gojo")
      │
      ▼
6. useEffect [charQuery] — 500ms debounce
      └── searchAnilistCharacters("Gojo") → filters by name
            └── setCharResults([new 16 results])
      │
      ▼
7. User clicks a character
      └── setDraft(d => ({ ...d, avatarUrl: node.image.large }))
      │
      ▼
8. User saves
      ├── supabase.auth.updateUser({ data: draft })  → user_metadata.avatarUrl
      └── upsertProfile(user, draft)                 → profiles.avatar_url
```

**Where the avatar is displayed:**
- Own profile (ProfilePage): reads `active.avatarUrl` — camelCase from `user_metadata`
- Friend profiles (FriendProfilePage, friends list): `<AvatarPic profile={...}>` reads `profile.avatar_url` — snake_case from the `profiles` table

---

### Flow: MAL library import

```
1. User opens MALImport.jsx
      │
      ▼
2. Uploads animelist.xml
      │
      ▼
3. XML is parsed → extracts each <anime>:
      { id: mal_id, title, eps, userStatus, userEp, userScore }
      │
      ▼
4. importFromMAL(items) → useLibrary.js
      ├── setData(prev => merge existing items + new ones)
      │
      └── upsertAnimesBatch(userId, items)
            └── chunks of 50 → upsert into animes + user_anime
      │
      ▼
5. Items missing images are automatically enriched:
      needsEnrich = library.filter(i => !i.img)
      → fetchAnimeById(id) [Jikan] with 360ms delay between requests
      → upsertAnime(userId, enriched) → Supabase
```

---

### Flow: Friend system

```
User A searches for User B
      │
      ▼
searchProfiles("username") → Supabase profiles

A sends a request to B:
      sendFriendRequest(A.id, B.id)
        ├── INSERT INTO friendships (status='pending')
        └── createNotification(B.id, 'friend_request', ...)

B sees notification → accepts:
      acceptFriendRequest(friendshipId)
        └── UPDATE friendships SET status='accepted'

A or B can view each other's profile:
      loadFriendLibrary(userId) → SELECT *, animes(*) FROM user_anime WHERE user_id = ?

Unfriend:
      deleteFriendship(friendshipId) → DELETE FROM friendships
```

---

### Flow: Episode airing notifications

```
useLibrary.js → on mount, if user is logged in:

1. loadUserLibrary() returns the library
2. Filter: airing=true, userStatus='watching', airDay=today
3. For each matching anime:
      hasNotificationToday(user.id, anime.id)
        → SELECT FROM notifications
          WHERE user_id=? AND data->>'anime_id'=? AND DATE(created_at)=TODAY
      If false:
        createNotification(
          user.id, 'new_episode', 'New episode today!', anime.title,
          { anime_id, air_day }
        )

NotificationBell polling: fetchNotifications() every 60s
```

---

## Developer Tips

### Adding a new page

1. Create `src/pages/MyPage.jsx`
2. Import it in `App.jsx`
3. Add it to `Nav.jsx` (tabs array)
4. Add a render case in `App.jsx`:
   ```jsx
   {page === 'mypage' && <MyPage ... />}
   ```
5. Add translations in `src/i18n/en.json`

### Adding a new Supabase table

1. Create a SQL file in `supabase/migrations/YYYYMMDD_name.sql`
2. Run it in the Supabase Dashboard SQL Editor
3. Create corresponding functions in `src/services/`
4. Enable RLS and create appropriate policies

### Adding a new column to the user profile

1. Alter the `profiles` table via a migration
2. Update `upsertProfile()` in `friends.js` to include the new column
3. Update `initMeta(user)` and `draft` in `ProfilePage.jsx`
4. Add edit UI in the profile edit modal

### Styling and theming

**New approach (Tailwind CSS v4):**
- New components → use Tailwind utilities: `className="bg-surf text-txt rounded-xl"`
- Available color tokens: `bg-bg`, `bg-surf`, `bg-surf2`, `text-txt`, `text-sub`, `border-bord`
- Automatic dark mode via `dark:` prefix (e.g. `dark:bg-surf2`) — driven by the `.dark` class on `<html>`

**Legacy approach (still valid):**
- Inline styles with `T` values: `style={{ background: T.surf, color: T.txt }}`
- For animations: use classes from `index.css` (`.fu`, `.sc`, `.hf`, `.card`, `.shimmer`, `.t`)
- For responsiveness: `useIsMobile()` or media queries in `index.css`

**Breakpoints:** `≤640px` = mobile, `641–900px` = tablet, `>900px` = desktop

**Adding a new color token to the theme:**
1. Add the value to `PALETTES.dark` and `PALETTES.light` in `ThemeContext.jsx`
2. The `useEffect` will automatically propagate it via `root.style.setProperty('--newKey', value)`
3. Add `--color-newKey: var(--newKey)` to the `@theme inline` block in `index.css`

### Project conventions

- Every Supabase service starts with `if (!supabase) return` — keeps the app functional without configuration
- Local state mutations happen **immediately** before the Supabase call — never wait for the response to update the UI
- Deduplicate arrays by `id` after merges to avoid duplicate items
- Episodes with no `airdate` in AniList must be **shown** (assumed to have already aired)
- The `color` field of an anime is derived from `mal_id % 10` — deterministic, no API call required
