# Crunchyroll Hero Nav Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-bleed Crunchyroll-style seasonal hero, desktop category/year dropdowns, and replace the nav wordmark with the Funnyroll banner asset.

**Architecture:** Add shared browse constants for genres and archive years, then wire them through `App`, `Nav`, `CategoriesPage`, and `SeasonalPage`. Keep visual changes component-local and preserve current hash navigation and existing hero image fallback services.

**Tech Stack:** React 18, Vite, Node test runner, CSS-in-JS inline styles plus existing global responsive CSS.

---

## File Structure

- Create `src/constants/browse.js`: shared genre/year definitions and pure lookup helpers.
- Create `src/constants/browse.test.js`: tests for lookup/default behavior.
- Modify `src/pages/CategoriesPage.jsx`: use shared genres and accept `initialGenreId`.
- Modify `src/pages/SeasonalPage.jsx`: full-bleed hero, CTA controls, carousel arrows, and `initialArchiveYear`.
- Modify `src/components/Nav.jsx`: Funnyroll image wordmark and desktop dropdowns.
- Modify `src/App.jsx`: own selected category/archive state and pass dropdown handlers.

---

### Task 1: Shared Browse Constants

**Files:**
- Create: `src/constants/browse.js`
- Create: `src/constants/browse.test.js`

- [ ] **Step 1: Write tests**

Create `src/constants/browse.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { ARCHIVE_YEARS, GENRES, getGenreById, getDefaultArchiveYear } from './browse.js'

test('GENRES exposes named genre ids for navigation', () => {
  assert.equal(getGenreById(8).name, 'Drama')
  assert.equal(getGenreById(4).name, 'Comedy')
  assert.equal(GENRES.some(g => g.name === 'Romance'), true)
})

test('getGenreById falls back to the first genre for unknown ids', () => {
  assert.equal(getGenreById(999), GENRES[0])
})

test('ARCHIVE_YEARS starts with the current year', () => {
  const current = new Date().getFullYear()
  assert.equal(ARCHIVE_YEARS[0], current)
  assert.equal(getDefaultArchiveYear(), current)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/constants/browse.test.js`

Expected: FAIL because `src/constants/browse.js` does not exist.

- [ ] **Step 3: Create shared constants**

Create `src/constants/browse.js`:

```js
export const GENRES = [
  { id: 1, name: 'Action', icon: '⚔️' },
  { id: 2, name: 'Adventure', icon: '🗺️' },
  { id: 4, name: 'Comedy', icon: '😂' },
  { id: 8, name: 'Drama', icon: '🎭' },
  { id: 10, name: 'Fantasy', icon: '🔮' },
  { id: 14, name: 'Horror', icon: '👻' },
  { id: 7, name: 'Mystery', icon: '🔍' },
  { id: 22, name: 'Romance', icon: '💕' },
  { id: 24, name: 'Sci-Fi', icon: '🚀' },
  { id: 36, name: 'Slice of Life', icon: '🌸' },
  { id: 30, name: 'Sports', icon: '⚽' },
  { id: 37, name: 'Supernatural', icon: '👁️' },
  { id: 40, name: 'Psychological', icon: '🧠' },
  { id: 18, name: 'Mecha', icon: '🤖' },
  { id: 13, name: 'Historical', icon: '📜' },
  { id: 23, name: 'School', icon: '📚' },
  { id: 17, name: 'Martial Arts', icon: '🥋' },
  { id: 38, name: 'Military', icon: '🎖️' },
  { id: 41, name: 'Thriller', icon: '😰' },
  { id: 19, name: 'Music', icon: '🎵' },
]

const CUR_YEAR = new Date().getFullYear()
export const ARCHIVE_YEARS = [CUR_YEAR, CUR_YEAR - 1, CUR_YEAR - 2, CUR_YEAR - 3]

export function getGenreById(id) {
  return GENRES.find(g => g.id === id) ?? GENRES[0]
}

export function getDefaultArchiveYear() {
  return ARCHIVE_YEARS[0]
}
```

- [ ] **Step 4: Run focused test**

Run: `node --test src/constants/browse.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/constants/browse.js src/constants/browse.test.js
git commit -m "feat: share browse navigation constants"
```

---

### Task 2: Categories and Seasonal State Wiring

**Files:**
- Modify: `src/pages/CategoriesPage.jsx`
- Modify: `src/pages/SeasonalPage.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Update `CategoriesPage`**

Import shared genres and accept `initialGenreId`:

```js
import { GENRES, getGenreById } from '../constants/browse'
```

Change the signature:

```js
export function CategoriesPage({ library, onOpen, onStatus, initialGenreId }) {
```

Initialize selected id from the prop:

```js
const [selectedId, setSelectedId] = useState(() => getGenreById(initialGenreId).id)
```

Add an effect after state declarations:

```js
useEffect(() => {
  if (!initialGenreId) return
  setMode('genre')
  setSelectedId(getGenreById(initialGenreId).id)
}, [initialGenreId])
```

Remove the local `GENRES` array and keep `GENRE_PT_TO_ID`.

- [ ] **Step 2: Update `SeasonalPage` props and archive sync**

Import shared years:

```js
import { ARCHIVE_YEARS } from '../constants/browse'
```

Remove local `CUR_YEAR` and `ARCH_YEARS`.

Add prop:

```js
initialArchiveYear,
```

Add effect after archive state declarations:

```js
useEffect(() => {
  if (!initialArchiveYear) return
  setArchYear(initialArchiveYear)
  setArchSeason(prev => prev || 'spring')
}, [initialArchiveYear])
```

Replace `ARCH_YEARS.map` with `ARCHIVE_YEARS.map`.

- [ ] **Step 3: Update `App.jsx` state and handlers**

Import constants:

```js
import { getGenreById } from './constants/browse'
```

Add state:

```js
const [selectedGenreId, setSelectedGenreId] = useState(null)
const [selectedArchiveYear, setSelectedArchiveYear] = useState(null)
```

Add handlers:

```js
const openCategory = (genreId) => {
  setSelectedGenreId(getGenreById(genreId).id)
  navigate('categories')
}

const openArchiveYear = (year) => {
  setSelectedArchiveYear(year)
  navigate('seasonal')
}
```

Pass them to `Nav`:

```jsx
<Nav
  page={page}
  setPage={navigate}
  onSelectCategory={openCategory}
  onSelectArchiveYear={openArchiveYear}
  ...
/>
```

Pass state to pages:

```jsx
<SeasonalPage ... initialArchiveYear={selectedArchiveYear} />
<CategoriesPage ... initialGenreId={selectedGenreId} />
```

- [ ] **Step 4: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CategoriesPage.jsx src/pages/SeasonalPage.jsx src/App.jsx
git commit -m "feat: wire browse dropdown selections"
```

---

### Task 3: Nav Dropdowns and Funnyroll Brand

**Files:**
- Modify: `src/components/Nav.jsx`

- [ ] **Step 1: Import browse constants and brand asset**

Add:

```js
import funnyrollBanner from '../../img/Funnyroll Banner.png'
import { ARCHIVE_YEARS, GENRES } from '../constants/browse'
```

Change signature:

```js
export function Nav({ page, setPage, libraryCount, userProfile, onLogin, onShowMAL, onSelectCategory, onSelectArchiveYear }) {
```

- [ ] **Step 2: Add dropdown state**

Add near menu state:

```js
const [browseMenu, setBrowseMenu] = useState(null)
const browseRef = useRef(null)
useClickOutside(browseRef, () => setBrowseMenu(null))
```

- [ ] **Step 3: Replace brand markup**

Replace the existing logo div contents with:

```jsx
<img
  src={funnyrollBanner}
  alt="Funnyroll"
  style={{ height: 34, width: 154, objectFit: 'contain', objectPosition: 'left center', display: 'block' }}
/>
```

Keep the outer click handler that navigates to seasonal.

- [ ] **Step 4: Render desktop dropdown buttons**

In desktop links, render normal pages except `categories`; add `Categories` and `Years` dropdown buttons. Dropdown menu items call:

```js
onSelectCategory?.(g.id)
onSelectArchiveYear?.(year)
```

Use existing menu visual style: absolute panel, `T.surf`, `T.bord`, `boxShadow`, compact row buttons.

- [ ] **Step 5: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Nav.jsx img/Funnyroll\ Banner.png
git commit -m "feat: add browse dropdowns and funnyroll brand"
```

---

### Task 4: Full-Bleed Crunchyroll Hero

**Files:**
- Modify: `src/pages/SeasonalPage.jsx`
- Modify: `src/utils/heroCarousel.js`
- Modify: `src/utils/heroCarousel.test.js`

- [ ] **Step 1: Add CTA/meta tests**

Extend `src/utils/heroCarousel.test.js` with:

```js
test('getHeroCta returns Crunchyroll-style primary and secondary actions', () => {
  assert.deepEqual(getHeroCta({ userStatus: null }), {
    primaryLabel: 'Watch Now',
    secondaryLabel: 'Add to List',
    canAdd: true,
  })
  assert.deepEqual(getHeroCta({ userStatus: 'watching' }, s => `status:${s}`), {
    primaryLabel: 'Watch Now',
    secondaryLabel: 'status:watching',
    canAdd: false,
  })
})
```

Replace the older `getHeroCta prompts add only when the hero is not already in the list` test.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/utils/heroCarousel.test.js`

Expected: FAIL because `getHeroCta` still returns `{ label, canAdd }`.

- [ ] **Step 3: Update `getHeroCta`**

Change `src/utils/heroCarousel.js`:

```js
export function getHeroCta(item, translateStatus = status => status) {
  return {
    primaryLabel: 'Watch Now',
    secondaryLabel: item?.userStatus ? translateStatus(item.userStatus) : 'Add to List',
    canAdd: !item?.userStatus,
  }
}
```

- [ ] **Step 4: Run focused test**

Run: `node --test src/utils/heroCarousel.test.js`

Expected: PASS.

- [ ] **Step 5: Refactor hero markup**

In `src/pages/SeasonalPage.jsx`, import:

```js
import { getHeroCta, getHeroImage, getHeroMeta } from '../utils/heroCarousel'
```

Add:

```js
const heroMeta = getHeroMeta(hero)
const heroCta = getHeroCta(hero, status => t(`status.${status}`))
```

Change hero shell style to full-bleed:

```js
margin: '0 0 42px calc(50% - 50vw)',
width: '100vw',
height: 'clamp(620px, 78vh, 820px)',
borderRadius: 0,
```

Use background image object position:

```js
objectPosition: 'center right'
```

Use overlays:

```js
background: 'linear-gradient(90deg, rgba(0,0,0,.86) 0%, rgba(0,0,0,.45) 48%, rgba(0,0,0,.05) 100%)'
background: 'linear-gradient(0deg, var(--bg-main) 0%, rgba(5,5,9,.74) 22%, transparent 58%)'
```

Set content:

```js
padding: '96px clamp(28px, 7vw, 96px) 86px',
maxWidth: 520,
justifyContent: 'flex-end',
```

Add CTA buttons below synopsis and put dots below CTAs.

Add arrow buttons only when `airingItems.length > 1`:

```js
setHeroIdx((heroIdx - 1 + airingItems.length) % airingItems.length)
setHeroIdx((heroIdx + 1) % airingItems.length)
```

- [ ] **Step 6: Adjust mobile CSS**

In `src/index.css`, update existing `.hero-h`, `.hero-pad`, `.hero-title`, `.hero-sub` mobile rules as needed:

```css
@media (max-width: 640px) {
  .hero-h { height: 520px !important; }
  .hero-pad { padding: 96px 20px 44px !important; max-width: 100% !important; }
  .hero-title { font-size: 34px !important; }
  .hero-sub { font-size: 13px !important; -webkit-line-clamp: 2; }
}
```

- [ ] **Step 7: Run build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/pages/SeasonalPage.jsx src/utils/heroCarousel.js src/utils/heroCarousel.test.js src/index.css
git commit -m "feat: make seasonal hero full bleed"
```

---

### Task 5: Final Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run tests**

Run each test file explicitly:

```bash
node --test src/constants/browse.test.js
node --test src/services/anilist.test.js
node --test src/services/kitsu.test.js
node --test src/utils/heroCarousel.test.js
```

Expected: PASS for all.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Start/check dev server**

Run or verify Vite at `http://127.0.0.1:5173/`.

Expected: HTTP 200.

- [ ] **Step 4: Check status**

Run: `git status --short`

Expected: no uncommitted implementation files.
