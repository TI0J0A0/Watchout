# Changelog

## [2026-05-18] - Admin Metrics, Search UX, Notifications, and Supabase Access Repair

**Files:** `src/pages/AdminPage.jsx`, `src/components/admin/AdminMetricsPanel.jsx`, `src/services/metrics.js`, `src/services/metricsAnalytics.js`, `src/pages/SearchPage.jsx`, `src/pages/searchState.js`, `src/components/NotificationBell.jsx`, `src/components/WatchPanel.jsx`, `src/hooks/useLibrary.js`, `supabase/migrations/20260518_repair_admin_access_policies.sql`

### What Changed
- Rebuilt the admin metrics panel in English with KPI cards, chart-style trend lines, ranked tables, device performance, banner CTR, streaming quality, and trending anime.
- Added pure metric aggregation helpers with tests for anime views, episode plays, search analytics, banner metrics, player health, device breakdown, and trending score.
- Instrumented real events for search, search result clicks, watchlist adds, banner views/clicks, page load, episode play, video start time, episode completion, player errors, and buffering.
- Reorganized the admin menu into clearer English sections: Overview, Users, Content, and Moderation.
- Updated notifications so new episode alerts use a 5-hour duplicate prevention window and can open the related anime page.
- Redesigned the search page with a centered branded search box and `Recent Search Results` stored locally, including a `Clear` action.
- Added admin-side Supabase error fallbacks so dashboard/metrics panels render a visible error message instead of breaking the page.

### Supabase
- Confirmed the remote `watchout` project already has `profiles`, `user_anime`, `animes`, `site_metrics_events`, `admin_error_logs`, `system_announcements`, and `notifications`.
- Applied the `repair_admin_access_policies` migration remotely to restore admin access policies for `admin_error_logs`, `user_anime`, `site_metrics_events`, and `profiles`.
- Added the same SQL locally in `supabase/migrations/20260518_repair_admin_access_policies.sql` so the repository matches the remote database repair.

### Validation
- `node --test src/pages/searchState.test.js src/services/metrics.test.js src/services/notifications.test.js src/utils/playerNavigation.test.js`
- `npm run build`

---

All notable changes to Watchout are documented here.
Format: `[YYYY-MM-DD] — Title` → What was done & how.

---

## [2026-05-12] — Admin Panel Bugfix

**Files:** `src/components/Nav.jsx`, `src/pages/AdminPage.jsx`

### Problem
`ReferenceError: isAdmin is not defined` crashed the app on load.

### Root Cause
`Nav.jsx` referenced `isAdmin()` (to conditionally render the admin button) but never imported it. Additionally, the admin button JSX was placed outside the dropdown `<div>` — floating between `<nav>` and the mobile tab bar.

Three separate bugs in `AdminPage.jsx`:
- `setFeedbacks` called instead of `setFeedback` (wrong setter name)
- `updateFeedback()` called instead of `updateFeedbackStatus()` (wrong function name)
- `feedbacks.map` used instead of `feedback.map` (wrong variable name)

### Fix
- Added `import { isAdmin } from '../services/premium'` to `Nav.jsx`
- Moved admin button inside the dropdown `{menu && (...)}` block
- Removed the orphan duplicate button block outside the nav
- Corrected all three variable/function name mismatches in `AdminPage.jsx`

---

## [2026-05-12] — Full Admin Ecosystem

**Files:** `supabase/migrations/admin_schema.sql`, `src/services/community.js`, `src/services/premium.js`, `src/services/announcements.js` *(new)*, `src/pages/AdminPage.jsx` *(rewrite)*, `src/components/AnnouncementBanner.jsx` *(new)*, `src/App.jsx`

### What Was Built

#### Database (Supabase PostgreSQL)
- Added `is_banned boolean DEFAULT false` column to `profiles`
- Created `system_announcements` table: `id uuid`, `content text`, `type text CHECK ('info','warning','maintenance')`, `created_at timestamptz`
- Created `is_admin()` scalar SQL function that validates the `email` claim from the JWT against the admin email — used inside RLS policies
- RLS policies added:
  - `system_announcements`: SELECT open to all; INSERT/UPDATE/DELETE restricted to `is_admin()`
  - `forum_topics` + `forum_posts`: DELETE restricted to `is_admin()`
  - `feedback`: ALL operations restricted to `is_admin()`
  - `profiles`: UPDATE restricted to `is_admin()` (for ban/premium flags)

#### Services
| Function | File | Description |
|---|---|---|
| `deleteTopicWithPosts(id)` | `community.js` | Deletes all posts then the topic (explicit cascade) |
| `deleteFeedback(id)` | `community.js` | Permanently deletes a feedback entry |
| `toggleBanUser(userId, banned)` | `premium.js` | Sets `is_banned` on a profile |
| `fetchAnnouncements()` | `announcements.js` | Fetches all system announcements ordered by date |
| `createAnnouncement({content, type})` | `announcements.js` | Inserts a new announcement |
| `deleteAnnouncement(id)` | `announcements.js` | Deletes an announcement by ID |

#### AdminPage (4 tabs)
- **Forum**: Lists all topics with author, reply count, views. Delete cascades to all replies
- **Feedbacks**: Lists all feedback with status selector (`open/reviewing/done`) and permanent delete
- **Users**: Paginated user list (20/page) with search, grant/revoke premium, ban/unban
- **Announcements**: Form to create new announcements (type + text), list of active ones with delete

#### AnnouncementBanner Component
- Injected in `AppInner` between `<Nav>` and page content
- Fetches active announcements on mount and on every page navigation
- Renders color-coded banners per type: blue (info), orange (warning), red (maintenance)
- Each banner individually dismissible — state kept in local `Set`
- Re-fetches without hard reload (reactive to `page` prop change)

---

## [2026-05-12] — Admin Panel Users: Pagination

**Files:** `src/services/premium.js`, `src/pages/AdminPage.jsx`

### What Changed
Replaced `adminSearchUsers(query)` (search-only, returned array) with `fetchUsers({ query, page })` (paginated + optional filter, returns `{ data, count }`).

- Page size: **20 users per page**
- Default load: all users on tab open, ordered by `created_at DESC`
- Filter: optional `ilike` on `username` and `display_name`
- Pagination: Supabase `.range(page * 20, (page + 1) * 20 - 1)` with `{ count: 'exact' }` for total count
- UI: search field + clear button, user count label, Previous/Next buttons with `page / totalPages` indicator

`ProfilePage.jsx` also imported `adminSearchUsers` — updated to use `fetchUsers` with destructuring.

---

## [2026-05-12] — Removed Duplicate Admin Panel from ProfilePage

**Files:** `src/pages/ProfilePage.jsx`

Removed the inline admin section (user search + premium toggle) that existed at the bottom of the Profile page. This functionality is now fully covered by the dedicated Admin Panel page. Cleaned up associated states (`adminQuery`, `adminResults`, `adminLoading`, `adminUpdating`), handler functions, and unused imports.

---

## [2026-05-12] — Removed Library Counter from Nav

**Files:** `src/components/Nav.jsx`

Removed the blue badge `{count} titles` that appeared in the desktop nav bar. The information is redundant and cluttered the header.

---

## [2026-05-12] — Progress Bar Fix (All Anime)

**Files:** `src/pages/AnimePage.jsx`

### Problem
The episode progress tracker (counter + fill bar) only rendered when `item.eps` was truthy. Anime with unknown total episodes (ongoing series, films) had `eps: null` from the Jikan API (`a.episodes || null`), so the tracker never appeared for them.

### Fix
Removed `item.eps` from the render condition. Now renders for any anime with `userStatus`.
- When `eps` is known: shows `4 / 12` format + filled progress bar
- When `eps` is null: shows `4 ep` format, no bar, `+` button increments freely (`Math.min(Infinity, ...)`)

---

## [2026-05-12] — Categories Page

**Files:** `src/pages/CategoriesPage.jsx` *(new)*, `src/components/Nav.jsx`, `src/App.jsx`

### What Was Built
New **Categories** page accessible via the nav bar.

**Genre chips (horizontal scroll):** 20 genres mapped to Jikan genre IDs — Action (1), Adventure (2), Comedy (4), Drama (8), Fantasy (10), Horror (14), Mystery (7), Romance (22), Sci-Fi (24), Slice of Life (36), Sports (30), Supernatural (37), Psychological (40), Mecha (18), Historical (13), School (23), Martial Arts (17), Military (38), Thriller (41), Music (19).

**Genre mode:** clicking a genre chip calls `fetchByGenre(id, 20)` from Jikan and renders a responsive grid of `MediaCard` components.

**Surprise Me mode:** 
1. Analyzes the user's library (`items with userStatus`) to count genre frequency per anime
2. Picks the most-watched genre name (Portuguese, as stored by Jikan) and maps it to the Jikan ID via `GENRE_PT_TO_ID`
3. Fetches 25 anime from that genre, filters out titles already in the library
4. Picks a random candidate and displays a large featured card with banner image, synopsis, genre tags, score, and a "View details" button
5. "Another suggestion" button re-runs the whole flow for a fresh pick
6. Falls back to a random genre if the user has no library data

---

## [2026-05-12] — Language Buttons: Sub & Dub Only

**Files:** `src/components/WatchPanel.jsx`

Removed PT-BR, EN, and ES language options from the Watch Online player controls. Only **Sub** and **Dub** remain, consistent across desktop and mobile (previously mobile had a different reduced set).

Changed from:
```js
const LANGS = isMobile
  ? [{ code: 'sub', label: 'Sub' }, { code: 'dub', label: 'EN' }, { code: 'pt-br', label: 'PT' }]
  : [{ code: 'sub', label: 'Sub' }, { code: 'dub', label: 'EN' }, { code: 'pt-br', label: 'PT-BR' }, { code: 'es', label: 'ES' }]
```
To:
```js
const LANGS = [{ code: 'sub', label: 'Sub' }, { code: 'dub', label: 'Dub' }]
```

---

## [2026-05-12] — Player: Switch to MAL ID Endpoint

**Files:** `src/components/WatchPanel.jsx`

### Previous Behavior
The embed URL required first fetching the AniList ID for each anime:
```
https://megaplay.buzz/stream/ani/{anilistId}/{ep}/{lang}
```
This added an extra AniList GraphQL query purely to resolve the ID for the URL.

### New Behavior
megaplay.buzz supports a direct MAL ID endpoint:
```
https://megaplay.buzz/stream/mal/{malId}/{ep}/{lang}
```
Since the app uses MAL IDs as its primary identifier (from Jikan API), this eliminates the AniList ID dependency for the player URL. The AniList API is still used for episode metadata (count, thumbnails, airdates, duration).

Removed `anilistId` state, its setter, and all references in the embed URL and iframe `key`.

---

## [2026-05-12] — Episode Thumbnail Fallback (onError)

**Files:** `src/components/WatchPanel.jsx`

### Problem
Episode card thumbnails from AniList's `streamingEpisodes` are served from Crunchyroll's CDN, which applies hotlink protection — requests from external domains return 403. With no `onError` handler, the browser rendered a broken image icon.

### Fix
The placeholder `▶` div is now always rendered behind the image (position absolute). The `<img>` tag has an `onError` handler that sets `display: none` on failure, revealing the clean placeholder underneath.

```jsx
<div style={{ ...placeholderStyle }}>
  <span>▶</span>
</div>
{thumbnail && (
  <img
    onError={e => { e.currentTarget.style.display = 'none' }}
    style={{ position: 'absolute', ... }}
  />
)}
```

---

## [2026-05-12] — Sequel / Prequel Navigation

**Files:** `src/services/jikan.js`, `src/pages/AnimePage.jsx`

### What Was Built
When opening any anime page, the app fetches its related entries from the Jikan API (`/anime/{id}/relations`) and displays navigation banners for sequels and prequels.

**`fetchRelations(id)`** in `jikan.js`:
- Calls `/anime/{id}/relations`
- Filters to only `Sequel` and `Prequel` relation types
- Returns only `anime` type entries (excludes manga, light novels, etc.)
- Returns: `[{ relation: 'Sequel' | 'Prequel', malId: number, name: string }]`

**AnimePage banner:**
- Appears inline in the info column, between the metadata badges and the score
- `⏭ Next Season` for sequels, `⏮ Previous Season` for prequels
- Styled with the anime's accent color
- On click: calls `fetchAnimeById(malId)` then `onOpen(fullData)` — navigates seamlessly without page reload
- Fetched in parallel with recommendations and AniList banner on `item.id` change

---

## [2026-05-12] — Anime Poster Aspect Ratio Fix

**Files:** `src/components/MediaCard.jsx`

MAL poster images are 225×319px — an aspect ratio of approximately **1:1.42**. The card container used `paddingTop: "133%"` (≈ 3:4 ratio), causing `objectFit: cover` to crop ~9% from the top and bottom of every poster.

Changed `paddingTop` from `"133%"` to `"142%"` to match the native MAL image ratio, minimizing cropping.

---

## [2026-05-12] — Continue Watching First + Picked for You Filter

**Files:** `src/pages/SeasonalPage.jsx`

### Changes

**1. Section order**
`Continue Watching` shelf moved above the "Personalize your experience" / "Picked for You" block — it is now the first content section after the hero.

**2. Picked for You filter improvement**
Previous filter: `!a.userStatus` — excluded ALL statuses including `plan_to_watch`.
New filter: `!EXCLUDE_STATUSES.has(a.userStatus)` where `EXCLUDE_STATUSES = new Set(['watching', 'completed', 'dropped'])`.

Anime the user has added to their plan-to-watch now correctly appears in Picked for You (it's relevant — they haven't seen it). Only titles actively being watched, already finished, or abandoned are excluded.

---

## [2026-05-12] — Resume Watching (Playback Position Persistence)

**Files:** `src/components/WatchPanel.jsx`

### What Was Built
Automatic save and restore of playback position using `localStorage`.

**Storage key:** `watchout_resume_{malId}`
**Stored value:** `{ ep: number, time: number }` (time in seconds)

#### Saving progress
Inside the `watching-log` postMessage handler:
- If `currentTime > 60s` AND position `< 90%` of total duration → saves `{ ep, time }` to localStorage (debounced 2s to avoid excessive writes)
- If position `≥ 90%` → clears the saved entry (near end, no need to resume)

#### Restoring progress
1. When `state` transitions to `'ready'`, reads localStorage for the current anime
2. If a valid entry exists with `time > 60s`, sets `activeEp` to the saved episode and stores `time` in `pendingSeek` ref
3. The iframe `onLoad` callback fires after the player loads — waits 2s for the player to initialize, then calls `seek(t)` via postMessage
4. `seek()` sends both `{ event: 'seek', time }` and `{ type: 'seek', time }` to cover both megaplay.buzz message formats

#### Edge cases
- If the user manually clicks a different episode, `pendingSeek` is consumed and reset to 0 — no double-seek
- Completed episodes (85%+ watched, existing auto-mark) eventually fall under the 90% clear rule
- No resume if `time ≤ 60s` (too early to be meaningful)
