# Watchout

> Discover, track, and watch anime — live data from MyAnimeList/AniList, cloud sync via Supabase, a Crunchyroll-style browse experience, and a built-in premium player.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20Edge-3ECF8E?logo=supabase&logoColor=white)
![i18next](https://img.shields.io/badge/i18n-i18next-26A69A)

---

## About

Watchout (deployed as **funnyroll.com**) is a media tracker and discovery app for anime. It pulls live data from [Jikan API v4](https://jikan.moe/) (MyAnimeList) and the [AniList GraphQL API](https://anilist.gitbook.io/anilist-apiv2-docs/), uses **TMDB** as the first-choice source for artwork (with Kitsu as a fallback), and surfaces trailers and news. Your library, profile, social graph, and analytics are stored in **Supabase** (PostgreSQL + Auth + Edge Functions). The UI is localized with i18next (English by default).

---

## Features

- **Seasonal browser** — cinematic hero carousel with static artwork, animated progress dots, and horizontally-scrolling shelves (Continue Watching, Trending Now, For You, genre rows).
- **Trending Now** — a shelf ranked from **real engagement metrics** (views, plays, watchlist adds, banner clicks) aggregated from `site_metrics_events`.
- **Trailers & Releases (News)** — an **auto-refreshing** trailer feed (AniList, with a Jikan fallback) that flags newly-dropped trailers with a **NEW** badge, plus genre filters, On-Air, Upcoming, and a **For You** tab ("You'll probably like" + "Because you watched X", driven by your watch history). The Trailers and On-Air feeds are release-based and refresh on their own — never tied to your library.
- **Crunchyroll-style cards** — large 2:3 posters with a rich hover panel (title, rating, episodes, synopsis).
- **Top rankings**, **weekly calendar**, and **categories/genre** browsing.
- **Search** — debounced global search across MyAnimeList with recent-search history.
- **Anime detail** — synopsis, characters, relations, recommendations, streaming providers ("Where to Watch"), and a collapsible trailer.
- **Premium player** — in-app episode playback (AniSkip intro/outro markers, quality/language switch) for premium users.
- **Profile & stats** — watch time, episodes, average score, taste profile, and genre/studio breakdown.
- **Community & friends** — friend profiles, comments, and a community page.
- **Notifications** — new-episode alerts (with duplicate-prevention window).
- **Admin panel** — dashboard, users, content (hero carousel, announcements), moderation, support, and a metrics analytics suite.
- **MAL import** — import your list from a MyAnimeList XML export.
- **Dark / light theme** — persisted across sessions.

### Status labels (i18n keys under `status.*`)

| Key | English label |
|---|---|
| `watching` | Watching |
| `plan_to_watch` | Plan to watch |
| `completed` | Completed |
| `dropped` | Dropped |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6 |
| Styling | Tailwind CSS v4 + inline styles (no component library) |
| i18n | i18next + react-i18next |
| Backend / Auth | Supabase (PostgreSQL, Auth, Edge Functions) |
| Anime data | Jikan API v4 (MyAnimeList), AniList GraphQL |
| Artwork | TMDB (first choice, via key-injecting proxy), Kitsu (fallback covers) |
| News | Anime News Network (via the `fetch-ann-news` edge function) |

---

## Getting Started

### Prerequisites

- **Node.js** v18 or newer
- A **Supabase** project — [supabase.com](https://supabase.com)

### Installation

```bash
git clone https://github.com/TI0J0A0/Watchout.git
cd Watchout
npm install
```

### Environment variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → `anon public` key |
| `VITE_TMDB_PROXY_URL` *(optional)* | Base URL of your TMDB key-injecting proxy (no trailing slash). Empty = TMDB artwork disabled, falls back to Jikan/AniList/Kitsu. See [`TMDB_PROXY.md`](./TMDB_PROXY.md). |

> Without the Supabase vars, the app still boots but auth, the personal library, and analytics are disabled.

### Database & Edge Functions

Schema is managed as SQL migrations under [`supabase/migrations/`](./supabase/migrations). Apply them with the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push                # apply migrations
supabase functions deploy anikoto metrics-ingest fetch-ann-news
```

Core tables: `profiles`, `user_anime`, `animes`, `site_metrics_events`, `notifications`, `system_announcements`, `hero_entries`, `hero_settings`, `anime_comments`, plus community/feedback tables. Row Level Security restricts each user to their own rows; admin policies are defined in the migrations.

### Edge Functions

| Function | Purpose |
|---|---|
| `anikoto` | Admin anime search (Jikan proxy) + MAL→AniList id/episode lookup. Premium/admin gated. |
| `metrics-ingest` | Ingests analytics events into `site_metrics_events`. |
| `fetch-ann-news` | Fetches Anime News Network headlines. |

> If `anikoto` is not deployed, admin anime search falls back to a direct Jikan search client-side.

### Start the dev server

```bash
npm run dev          # http://localhost:5173
```

---

## Project Structure

```
src/
├── App.jsx                  # Root: state, hash routing, lazy-loaded pages, hero carousel
├── main.jsx                 # Entry point
├── index.css                # Global styles, theme tokens, animations
├── i18n/                    # i18next setup + en.json
│
├── pages/
│   ├── SeasonalPage.jsx     # Hero + discovery shelves + season grid
│   ├── AnimePage.jsx        # Anime detail (characters, relations, trailer, streaming)
│   ├── TopPage.jsx          # Top-ranked list
│   ├── CalendarPage.jsx     # Weekly airing schedule
│   ├── CategoriesPage.jsx   # Genre browsing
│   ├── SearchPage.jsx       # Global search
│   ├── NewsPage.jsx         # Trailers & Releases (auto-refresh feed)
│   ├── ProfilePage.jsx      # Stats, taste profile
│   ├── CommunityPage.jsx    # Community feed
│   ├── FriendProfilePage.jsx
│   ├── AdminPage.jsx        # Admin suite (see components/admin/)
│   └── AuthPage.jsx         # Sign up / log in modal
│
├── components/              # MediaCard, ShelfRow, Nav, WatchPanel, NotificationBell,
│   │                        # BackToTop, Toast, MALImport, admin/*, profile/*, ui/* …
│
├── context/                 # AuthContext, ThemeContext
│
├── services/                # jikan, anilist, kitsu, aniskip, ann, supabase, userAnime,
│   │                        # friends, community, notifications, premium, metrics,
│   │                        # metricsAnalytics, heroAdmin, animeLookup, announcements …
│
├── hooks/                   # useLibrary, useIsMobile, useOnScreen, useClickOutside, admin/*, profile/*
│
├── constants/               # status map, streaming colours/URLs, genre browse config
│
└── utils/                   # apiCache, streaming, formatters, tasteProfile, playerSecurity …

supabase/
├── functions/               # anikoto, metrics-ingest, fetch-ann-news (Deno edge functions)
└── migrations/              # SQL schema migrations
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server at `localhost:5173` |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Preview the production build locally |
| `node --test src/` | Run the unit test suite (Node's built-in test runner) |
| `npm run cap:sync` | Build the web app and sync it into the native project(s) |
| `npm run cap:android` | Open the Android project in Android Studio |
| `npm run cap:run` | Build and run the app on a connected Android device/emulator |

---

## Android TV / Fire TV app (Capacitor)

The same React app is packaged for **Android TV, Fire TV (Firestick) and Android projectors** with [Capacitor](https://capacitorjs.com). The native shell is a thin WebView that loads the live site (`server.url` in [`capacitor.config.json`](capacitor.config.json)), so **front-end changes ship by deploying the site — no app rebuild required**. The `android/` folder is the Capacitor-generated project (app id `com.funnyroll.app`).

### Develop without building the app

TV navigation is built into the web app, so you can develop and test it entirely in a desktop browser — no Android toolchain needed:

```bash
npm run dev
# then open with the TV override:
#   http://localhost:5173/?tv=1   → forces 10-foot / D-pad mode
#   http://localhost:5173/?tv=0   → forces normal mode
```

`?tv=1` is remembered in `localStorage` so it survives in-app navigation. Use arrow keys to move focus (spatial D-pad navigation), and the focused card reveals its info panel just like it will on a remote.

### Build the APK (for Firestick / Android TV)

Requires **JDK 17** + **Android Studio / Android SDK** installed locally.

```bash
npm run cap:sync          # vite build + copy web assets into android/
npm run cap:android       # open in Android Studio → Run on an Android TV emulator
# or from the CLI:
cd android && ./gradlew assembleDebug   # APK at app/build/outputs/apk/debug/
```

Sideload onto a Firestick (Developer Options → ADB debugging enabled):

```bash
adb connect <firestick-ip>:5555
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

The manifest declares a **Leanback launcher** + TV banner, so the app appears on the Android TV / Fire TV home row. The remote **Back** button is handled in [`src/App.jsx`](src/App.jsx) (closes overlays → steps back through history → exits). TV detection lives in [`src/utils/platform.js`](src/utils/platform.js) (`isAndroidTV`), tagged by the WebView User-Agent in [`MainActivity.java`](android/app/src/main/java/com/funnyroll/app/MainActivity.java).

### Future: Apple

`npx cap add ios` adds an **iPhone/iPad** target later (the web app is reused as-is). Note that **Apple TV (tvOS) is not supported by Capacitor** — it would require a separate native app.

---

## Performance Notes

- **Code splitting** — heavy/rare routes (Admin, Profile, Community, News, …) are `React.lazy`-loaded behind `Suspense`, keeping the initial bundle small.
- **Stable callbacks** — library mutators and page handlers are memoized so the rotating hero doesn't re-render the shelf tree.
- **Off-screen culling** — cards use `content-visibility: auto`; discovery shelves hydrate just before entering the viewport with reserved height to avoid scroll jumps.
- **Caching** — API responses are cached in-memory (TTL) with a `forceRefresh` bypass for manual shelf refreshes; the background hero trailer pauses when scrolled out of view.

---

## Data & Sync

The personal library lives in Supabase (`user_anime` joined with cached `animes` metadata); a unique `(user_id, anime_id)` constraint plus upserts prevent duplicates. There is **no anonymous offline library** — auth is required to track titles (legacy `localStorage` data is cleared on load).

---

## License

MIT
