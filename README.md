# Watchout

> Personal tracker for anime, series, and films — with cloud sync via Supabase and real-time data from the MyAnimeList API.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)

---

## About

Watchout is a Portuguese-language media tracker that lets you discover and manage your anime, series, and film watchlist. It pulls live data from [Jikan API v4](https://jikan.moe/) (the unofficial MyAnimeList API) and syncs your personal library to Supabase when you're logged in — or falls back to `localStorage` when offline or unauthenticated.

---

## Features

- **Seasonal browser** — displays currently airing anime with an auto-cycling hero banner
- **Top rankings** — lazy-loaded list of the top-rated anime from MyAnimeList
- **Weekly calendar** — see what airs on each day of the week
- **Personal library** — filter by status and sort by title, MAL score, or your score
- **Search** — global search across the entire MyAnimeList catalogue (debounced, 500 ms)
- **Profile & stats** — total watch time, episodes watched, average score, genre/studio breakdown
- **Dark / light theme** — toggle persisted across sessions
- **MAL import** — import your existing list from a MyAnimeList XML export file
- **Authentication** — sign up / log in via Supabase Auth
- **Offline-first** — all actions work without an account; data is saved to `localStorage`

### Status labels

| Status | Meaning |
|---|---|
| Assistindo | Currently watching |
| Planejo Assistir | Plan to watch |
| Concluído | Completed |
| Dropado | Dropped |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6 |
| Backend / Auth | Supabase (PostgreSQL + Auth) |
| Anime data | Jikan API v4 (MyAnimeList) |
| Styling | Global CSS + inline styles (no UI library) |

---

## Getting Started

### Prerequisites

- **Node.js** v18 or newer
- A **Supabase** project (free tier is sufficient) — [supabase.com](https://supabase.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/watchout.git
cd watchout

# Install dependencies
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
| `VITE_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → Project API keys → `anon public` |

> The app works without these variables — it will run in offline/localStorage mode with no authentication.

### Database setup

Run the SQL in `supabase_schema.sql` inside your Supabase project:

1. Open the **SQL Editor** in your Supabase dashboard
2. Click **New query**
3. Paste the contents of `supabase_schema.sql` and click **Run**

This creates the `user_anime` table and a Row Level Security policy that ensures each user can only access their own data.

### Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

```
src/
├── App.jsx                  # Root component — global state, routing, data fetching
├── main.jsx                 # Entry point
├── index.css                # Global styles and theme variables
│
├── pages/
│   ├── SeasonalPage.jsx     # Currently airing anime + hero banner
│   ├── TopPage.jsx          # Top-ranked anime list
│   ├── CalendarPage.jsx     # Weekly airing schedule
│   ├── LibraryPage.jsx      # Personal watchlist
│   ├── SearchPage.jsx       # Global search
│   ├── ProfilePage.jsx      # User stats and profile
│   └── AuthPage.jsx         # Sign up / log in modal
│
├── components/
│   ├── Nav.jsx              # Top/bottom navigation bar
│   ├── MediaCard.jsx        # Anime/series/film card grid item
│   ├── Modal.jsx            # Detail modal (status, score, episodes, notes, recommendations)
│   ├── StatusBtn.jsx        # Inline status change button
│   ├── ShelfRow.jsx         # Horizontal scrollable shelf
│   ├── StatBox.jsx          # Stat display box (used in profile)
│   ├── LoadingGrid.jsx      # Shimmer skeleton grid
│   ├── Toast.jsx            # Temporary notification banner
│   └── MALImport.jsx        # MyAnimeList XML import dialog
│
├── context/
│   ├── AuthContext.jsx      # Supabase auth state (user, sign in/out)
│   └── ThemeContext.jsx     # Dark/light theme + colour tokens
│
├── services/
│   ├── jikan.js             # Jikan API v4 client (seasonal, top, search, recommendations)
│   ├── supabase.js          # Supabase client initialisation
│   └── userAnime.js         # CRUD operations for user_anime table
│
├── hooks/
│   └── useClickOutside.js   # Close modals/menus on outside click
│
├── constants/
│   └── index.js             # Status map, streaming service colours and URLs, demo catalogue
│
└── utils/
    └── index.js             # localStorage helpers, number/time formatters
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server at `localhost:5173` |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Preview the production build locally |

---

## Offline Mode

Watchout works fully without a Supabase account. When you are not logged in (or when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not set), all library changes are persisted to `localStorage` under the key `watchout_v2`. Logging in later will merge the Supabase library with any locally saved data.

---

## Database Schema

The single table `user_anime` stores both cached anime metadata and user-specific data (status, score, episode progress, notes). A unique constraint on `(user_id, anime_id)` ensures there are no duplicates, and upserts are used for all write operations.

See [`supabase_schema.sql`](./supabase_schema.sql) for the full DDL, RLS policy, and the `updated_at` trigger.

---

## License

MIT
