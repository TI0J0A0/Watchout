# APIs Used in Watchout

## 1. Jikan API (MyAnimeList)

**Base URL:** `https://api.jikan.moe/v4`
**Authentication:** None (public, rate limit ~3 req/s)
**File:** `src/services/jikan.js`

Unofficial MyAnimeList REST API. Primary source for all anime metadata in the app. All IDs are **MAL IDs** and are used as the app-wide identifier across every service.

### Endpoints

| Endpoint | Function | Description |
|----------|----------|-------------|
| `GET /seasons/now?limit=24` | `fetchSeasonal()` | Currently airing seasonal anime |
| `GET /top/anime?limit=25` | `fetchTop()` | Top-ranked anime (adds `rank` field) |
| `GET /seasons/upcoming?limit=15` | `fetchUpcoming()` | Announced but not yet airing |
| `GET /seasons/{year}/{season}?limit=24` | `fetchSeasonArchive(year, season)` | Historical season archives |
| `GET /anime?q={query}&limit=20&sfw=true` | `searchAnime(query)` | Title search |
| `GET /anime?status=airing&order_by=members&sort=desc&limit=15&sfw=true` | `fetchPopular(opts)` | Trending currently-airing titles |
| `GET /anime?genres={id}&order_by=score&sort=desc&limit={n}&sfw=true&type=tv` | `fetchByGenre(genreId, limit, opts)` | Browse by genre (used in CategoriesPage) |
| `GET /seasons/now` + `GET /seasons/upcoming` | `fetchSeasonalTrailers()` | Current + upcoming titles that ship a trailer (News fallback) |
| `GET /anime/{id}/full` | `fetchAnimeById(id)` | Full details for a single anime |
| `GET /anime/{id}/recommendations` | `fetchRecommendations(id)` | Similar titles |
| `GET /anime/{id}/relations` | `fetchRelations(id)` | Sequels and prequels |
| `GET /anime/{id}/characters` | `fetchCharacters(id)` | Cast and voice actors |

> **`fresh` option** — `fetchPopular`, `fetchUpcoming` and `fetchByGenre` accept `{ fresh: true }`, which sets `forceRefresh` on the cached fetcher (see [`utils/apiCache.js`](../src/utils/apiCache.js)) to bypass the in-memory TTL cache. Used by the per-shelf manual refresh on the Seasonal page.

### `fetchRelations(id)` — return shape

```js
// Returns only Sequel/Prequel entries of type anime
[{ relation: 'Sequel' | 'Prequel', malId: number, name: string }]
```

### `mapAnime(a)` — Jikan → app object

All Jikan responses are normalized through `mapAnime()` before use:

| App field | Source |
|-----------|--------|
| `id` | `a.mal_id` |
| `title` | `a.title_english \|\| a.title` |
| `score` | `a.score \|\| 0` |
| `eps` | `a.episodes \|\| null` (null for ongoing/unknown) |
| `type` | `"film"` if `a.type === "Movie"`, else `"anime"` |
| `genres` | `a.genres[].name` mapped through `GENRE_PT` (Portuguese localized) |
| `airing` | `a.status === "Currently Airing"` |
| `img` | `a.images.jpg.large_image_url` |
| `color` / `colorB` | Deterministic palette from `mal_id % 10` |

### Genre IDs (Jikan)

Used in `CategoriesPage` for genre chips and in `fetchByGenre()`:

| Genre | ID | Genre | ID |
|-------|----|-------|----|
| Action | 1 | Sports | 30 |
| Adventure | 2 | Supernatural | 37 |
| Comedy | 4 | Psychological | 40 |
| Drama | 8 | Mecha | 18 |
| Fantasy | 10 | Historical | 13 |
| Horror | 14 | School | 23 |
| Mystery | 7 | Martial Arts | 17 |
| Romance | 22 | Military | 38 |
| Sci-Fi | 24 | Thriller | 41 |
| Slice of Life | 36 | Music | 19 |

---

## 2. AniList GraphQL API

**Base URL:** `https://graphql.anilist.co`
**Authentication:** None (public)
**File:** `src/services/anilist.js`

Used to supplement data that Jikan doesn't provide: episode metadata, banner images, character lists, and airing schedules. All requests are `POST` with `Content-Type: application/json`.

### `fetchAnilistData(malId)` — episode + schedule data

Called by `WatchPanel` to get episode thumbnails and airing schedule.

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

**Returns:**
```js
{
  anilistId: number,
  episodes: number | null,
  duration: number | null,
  streamingEpisodes: [{ title, thumbnail }],
  airingSchedule: [{ episode, airingAt }]  // airingAt is a Unix timestamp
}
```

> **Note on thumbnails:** `streamingEpisodes[].thumbnail` URLs are served from Crunchyroll's CDN, which applies hotlink protection. Requests from external domains return HTTP 403. The `WatchPanel` handles this with an `onError` fallback that hides the broken `<img>` and shows a `▶` placeholder div underneath.

### `fetchAnilistBanner(malId)` — banner image + characters

Called by `AnimePage` on anime detail open.

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

**Returns:**
```js
{
  bannerImage: string | null,
  characters: [{ name, img, role: 'Main' | 'Supporting', va, vaImg }]
}
```

### `fetchAnilistBannerOnly(malId)` — lightweight banner

Called by `SeasonalPage` (hero section) and `ProfilePage` (pinned anime banner). Fetches only `bannerImage` to avoid loading character data unnecessarily.

```graphql
query($malId: Int) { Media(idMal: $malId, type: ANIME) { bannerImage } }
```

### `fetchAnilistHeroImages(malId)` — hero artwork

Called by `SeasonalPage` for the hero background. Returns `{ bannerImage, coverImage }` (falls back to Kitsu cover when AniList has no banner).

### `fetchLatestTrailers({ perPage })` — News trailer feed

Called by `NewsPage`. Returns currently-releasing + upcoming anime that have a YouTube/Dailymotion trailer, ordered by trending so freshly-dropped PVs surface first.

```graphql
query($perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(type: ANIME, sort: [TRENDING_DESC], status_in: [RELEASING, NOT_YET_RELEASED]) {
      id idMal status
      title { english romaji }
      startDate { year }
      genres averageScore
      studios(isMain: true) { nodes { name } }
      coverImage { extraLarge large }
      trailer { id site thumbnail }
    }
  }
}
```

**Returns** an array of `{ id, anilistId, title, studio, year, genres, score, status, img, color, colorB, trailer }`, where `trailer` is a ready-to-embed URL. Items without a usable trailer are dropped. `NewsPage` falls back to `fetchSeasonalTrailers()` (Jikan) if this returns nothing.

### `searchAnilistCharacters(search)` — avatar picker

Called by `ProfilePage` avatar selector. Pass `null` or empty string to get the 16 most-favorited characters globally.

```graphql
query($search: String) {
  Page(perPage: 16) {
    characters(search: $search, sort: FAVOURITES_DESC) {
      id name { full } image { large }
    }
  }
}
```

> **Schema difference — important:**
> - `Page.characters` → returns `Character[]` directly (**no** `.nodes` wrapper)
> - `Media.characters` → returns `CharacterConnection` (access via `.edges[].node`)
>
> Using `.nodes` on `Page.characters` returns HTTP 400.

---

## 3. Kitsu API

**Base URL:** `https://kitsu.io/api/edge`
**Authentication:** None (public)
**File:** `src/services/kitsu.js`

Fallback artwork source. `fetchKitsuCoverByMalId(malId)` resolves a MAL ID to a Kitsu entry (via the MAL→Kitsu mapping) and returns its `coverImage` URL. Used by the Seasonal hero when AniList has no `bannerImage`.

---

## 4. MegaPlay (Streaming Player)

**Base URL:** `https://megaplay.buzz`
**Authentication:** None
**File:** `src/components/WatchPanel.jsx`

Embedded via `<iframe>`. The app communicates with it through `postMessage` to track playback progress and trigger seek operations.

### URL Format

```
https://megaplay.buzz/stream/mal/{malId}/{episode}/{language}
```

| Parameter | Options |
|-----------|---------|
| `malId` | MAL ID (integer) — app primary identifier |
| `episode` | Episode number (integer, starting at 1) |
| `language` | `sub`, `dub` |

> **Previous format (replaced 2026-05-12):** `/stream/ani/{anilistId}/{episode}/{language}`
> Switched to the MAL ID endpoint to remove the dependency on fetching an AniList ID just for the URL.

### Incoming postMessage events (player → app)

```js
// Primary progress event
{ type: 'watching-log', duration: 1440, currentTime: 1250 }
// → currentTime / duration >= 0.85 → marks episode as watched
// → currentTime > 60s && pct < 0.90 → saves resume position to localStorage
// → pct >= 0.90 → clears saved resume position (near end)

// Alternate percentage event
{ event: 'time', percent: 0.87 }

// Completion event
{ event: 'complete' }
```

### Outgoing postMessage commands (app → player)

```js
// Seek to a specific time (two formats sent simultaneously for compatibility)
{ event: 'seek', time: 1250 }
{ type: 'seek',  time: 1250 }
```

### Resume Watching (localStorage)

**Key:** `watchout_resume_{malId}`
**Value:** `{ ep: number, time: number }` (time in seconds)

- Saved when: `time > 60s` AND playback position `< 90%`
- Cleared when: position reaches `≥ 90%` (near completion)
- Restored when: `WatchPanel` state transitions to `'ready'`
- Seek is sent 2 seconds after `iframe.onLoad` to allow the player to initialize

---

## 5. AniSkip API

**Base URL:** `https://api.aniskip.com/v2`
**Authentication:** None (public)
**File:** `src/services/aniskip.js`

Provides community-sourced intro (OP) and outro (ED) timestamps for skip buttons in the player.

### Endpoint

```
GET /skip-times/{malId}/{episode}?types[]=op&types[]=ed
```

**Returns:**
```js
{
  op: { startTime: number, endTime: number } | null,
  ed: { startTime: number, endTime: number } | null
}
```

Returns `{ op: null, ed: null }` on 404 (no data for that episode) or network error. Times are in seconds.

---

## 6. Anime News Network (ANN) RSS

**URL:** `https://www.animenewsnetwork.com/all/rss.xml`
**Authentication:** None (public)
**File:** `src/services/ann.js`

RSS feed for anime news. ANN blocks CORS, so the app uses a cascading proxy chain with automatic fallback:

1. `https://api.codetabs.com/v1/proxy/` — primary
2. `https://api.allorigins.win/raw` — fallback
3. `https://corsproxy.io/` — final fallback

**Data returned:** title, link, description, publication date, category.

---

## 7. Supabase

**Base URL:** `VITE_SUPABASE_URL` (env var)
**Authentication:** JWT via `VITE_SUPABASE_ANON_KEY`
**Files:** `src/services/supabase.js`, `src/services/premium.js`, `src/services/community.js`, `src/services/userAnime.js`, `src/services/friends.js`, `src/services/notifications.js`, `src/services/announcements.js`

App backend — database, auth, and real-time.

### Auth

| Operation | Method |
|-----------|--------|
| Sign up | `supabase.auth.signUp({ email, password })` |
| Sign in | `supabase.auth.signInWithPassword({ email, password })` |
| Sign out | `supabase.auth.signOut()` |
| Session | `supabase.auth.getSession()` |
| Update profile | `supabase.auth.updateUser({ data: { displayName, avatarUrl, ... } })` |

### Database Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles: `id`, `username`, `display_name`, `avatar_url`, `avatar_grad`, `is_premium`, `is_banned` |
| `user_anime` | User library: `user_id`, `anime_id`, `status`, `score`, `ep`, `notes` |
| `forum_topics` | Community forum posts |
| `forum_posts` | Replies to forum topics |
| `feedback` | User feedback submissions (admin-only read/write) |
| `system_announcements` | Admin-created site-wide banners: `id`, `content`, `type` (`info`/`warning`/`maintenance`), `created_at` |

### Row Level Security (RLS)

All tables use RLS. Admin-restricted operations use the `is_admin()` SQL function:

```sql
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT COALESCE((auth.jwt() ->> 'email'), '') = 'joaoguiar99@gmail.com'
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

| Table | Policy |
|-------|--------|
| `system_announcements` | SELECT: everyone; INSERT/UPDATE/DELETE: `is_admin()` only |
| `forum_topics` | DELETE: `is_admin()` only |
| `forum_posts` | DELETE: `is_admin()` only |
| `feedback` | ALL operations: `is_admin()` only |
| `profiles` | UPDATE: `is_admin()` only (for `is_banned`, `is_premium` flags) |

### Service Functions

#### `src/services/premium.js`

| Function | Description |
|----------|-------------|
| `fetchUsers({ query, page })` | Paginated user list (20/page), optional ilike filter on username/display_name |
| `togglePremium(userId, value)` | Sets `is_premium` on a profile |
| `toggleBanUser(userId, banned)` | Sets `is_banned` on a profile |
| `isAdmin()` | Client-side check: compares session email to admin email |

#### `src/services/community.js`

| Function | Description |
|----------|-------------|
| `fetchTopics()` | Lists all forum topics |
| `deleteTopicWithPosts(id)` | Deletes all replies then the topic (explicit cascade) |
| `fetchFeedback()` | Lists all feedback entries (admin only) |
| `updateFeedbackStatus(id, status)` | Updates feedback status (`open`/`reviewing`/`done`) |
| `deleteFeedback(id)` | Hard-deletes a feedback entry |

#### `src/services/announcements.js`

| Function | Description |
|----------|-------------|
| `fetchAnnouncements()` | Fetches all announcements ordered by `created_at DESC` |
| `createAnnouncement({ content, type })` | Inserts a new announcement (`type`: `info`, `warning`, or `maintenance`) |
| `deleteAnnouncement(id)` | Deletes an announcement by ID |

### Analytics: `site_metrics_events`

Engagement events (`anime_open`, `episode_play`, `watchlist_add`, `banner_view/click`, `search`, `page_load`, player health, …) are ingested via the `metrics-ingest` edge function and read back for the admin metrics suite and the public **Trending Now** shelf.

| Function | Description |
|----------|-------------|
| `fetchTrendingAnimeIds({ days, limit })` (`metrics.js`) | Reads recent `site_metrics_events`, ranks anime via `aggregateTrendingEventIds` (pure, weighted by event type), returns ranked MAL IDs. Returns `[]` if RLS blocks the table. |
| `fetchAdminMetrics()` (`metrics.js`) | Full analytics aggregation for the admin dashboard. |

### Edge Functions (Deno, Supabase)

| Function | Status | Purpose |
|----------|--------|---------|
| `anikoto` | **Active** | Two routes: `animeSearch` (Jikan proxy for the admin hero search, admin-gated) and `anilist` (MAL→AniList id/episodes, cached 24h in `anikoto_cache`). Requires JWT + premium/admin. |
| `metrics-ingest` | Active | Validates and inserts analytics events into `site_metrics_events`. |
| `fetch-ann-news` | Active | Server-side fetch of Anime News Network headlines (avoids client CORS). |

> **Resilience:** if `anikoto` is unreachable (e.g. not deployed), `animeLookup.searchAnimeByName()` falls back to a direct client-side Jikan search. `WatchPanel` calls AniList directly via `fetchAnilistData()`, so it does not depend on the `anilist` route.

---

## 8. TMDB (image layer)

**Base URL:** `VITE_TMDB_PROXY_URL` (a key-injecting proxy on the VPS) + `https://image.tmdb.org/t/p` (public CDN)
**Authentication:** v4 Read Token, **server-side only** (never reaches the browser)
**File:** `src/services/tmdb.js` · hooks `useTmdbPosterBatch`, `useTmdbImage`
**Setup:** see [`TMDB_PROXY.md`](../TMDB_PROXY.md)

The **first-choice** source for artwork (posters, backdrops, episode stills), with graceful fallback to the Jikan/AniList/Kitsu image already on the item. TMDB has no MAL/AniList id, so items are matched by **title + year** and the result is cached in `localStorage`. If `VITE_TMDB_PROXY_URL` is unset, the whole layer is disabled (`TMDB_ENABLED === false`) and the app keeps its existing images.

### Resolution & caching

`resolveTmdb(item)` maps an app item (MAL id) to a TMDB reference, cached by MAL id under **`watchout_tmdb_map_v2`** (incl. negative results). Matching is intentionally forgiving — Jikan's per-season year/English title often differ from TMDB's:

1. `search/{tv|movie}?query={title}&{first_air_date_year|year}={year}` (precise)
2. retry **without** the year (catches sequels/cours where the year diverges)
3. retry with the **romaji** title

The cached value is `{ id, mediaType, poster, backdrop } | null` — the poster/backdrop paths come straight from the search hit, so cards need **no** second request.

### Functions

| Function | Calls | Used by |
|----------|-------|---------|
| `fetchTmdbPoster(item, size)` | resolve only (cached) | `useTmdbPosterBatch` (grids/cards), `useTmdbImage` |
| `fetchTmdbBackdrop(item, size)` | resolve only (cached) | `useTmdbImage('backdrop')` |
| `fetchTmdbImages(item)` | resolve + `GET /{type}/{id}/images?include_image_language=en,ja,null` | `AnimePage` gallery, `SeasonalPage` hero — always seeded with the search poster/backdrop so the list is never empty when TMDB has art |
| `fetchTmdbSeasonStills(item, n=1)` | resolve + `GET /tv/{id}/season/{n}` | `WatchPanel` — returns `{ [ep]: stillUrl }` for the **whole season in one request** |
| `fetchTmdbEpisodeStill(item, ep)` | derives from `fetchTmdbSeasonStills` (shared cache) | `ContinueWatchingRow` |
| `tmdbImg(path, kind)` | none (URL builder) | everywhere; `kind` ∈ `poster`/`posterXl`/`backdrop`/`still`/`logo` |

> **Why no `/images` per card:** the search response already carries `poster_path`/`backdrop_path`, so the grids resolve a title in a single call. The language-filtered `/images` list can come back empty for titles whose art is tagged in other languages — that used to leave cards blank even though TMDB had a poster; the search poster avoids that filter.

> **Episode-still limitation:** anime episode numbering rarely matches TMDB's season split, so `fetchTmdbSeasonStills` targets **season 1** by default. Sequels/cours may miss some stills; the player falls back to the AniList episode thumbnail, then the poster.

---

## Environment Variables

```env
VITE_SUPABASE_URL          # Supabase project URL (https://...)
VITE_SUPABASE_ANON_KEY     # Public JWT key (starts with eyJ...)
SUPABASE_SERVICE_ROLE_KEY  # Service role key — Edge Functions only, never expose client-side
VITE_TMDB_PROXY_URL        # TMDB key-injecting proxy base URL (no trailing slash); empty = TMDB disabled
```

---

## Summary

| API | Type | Auth | Primary Use |
|-----|------|------|-------------|
| Jikan (MAL) | REST | None | Anime metadata, search, seasons, relations, trailer fallback |
| AniList | GraphQL | None | Episode data, banners, characters, schedules, trailer feed |
| TMDB | REST (via proxy) + CDN | v4 token (server-side) | First-choice artwork: posters, backdrops, episode stills |
| Kitsu | REST | None | Fallback cover artwork for the hero |
| MegaPlay | iframe embed | None | Streaming player with postMessage comms |
| AniSkip | REST | None | OP/ED skip timestamps |
| ANN | RSS (via proxy) | None | Anime news feed |
| Supabase | REST + WebSocket + Edge | JWT | Database, auth, analytics, edge functions |
