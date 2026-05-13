# Hero Banner Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the seasonal hero into a clean horizontal background banner with a dark overlay and Kitsu fallback imagery.

**Architecture:** Keep the existing `SeasonalPage` carousel and hero data flow. Move fallback selection into `src/utils/heroCarousel.js`, add a small Kitsu service helper in `src/services/kitsu.js`, and refactor only the hero markup/styles in `src/pages/SeasonalPage.jsx`.

**Tech Stack:** React 18, Vite, browser `fetch`, Node test runner.

---

## File Structure

- Modify `src/utils/heroCarousel.js`: extend `getHeroImage` so image priority is explicit and testable.
- Modify `src/utils/heroCarousel.test.js`: cover AniList, Kitsu, YouTube thumbnail, and poster fallback order.
- Create `src/services/kitsu.js`: fetch Kitsu anime data by MAL id and return the best cover image URL.
- Create `src/services/kitsu.test.js`: test pure Kitsu response parsing without network.
- Modify `src/pages/SeasonalPage.jsx`: fetch Kitsu fallback when AniList banner is missing and refactor the hero into a single background image layer with overlay and left-aligned content.

---

### Task 1: Hero Image Fallback Selection

**Files:**
- Modify: `src/utils/heroCarousel.js`
- Modify: `src/utils/heroCarousel.test.js`

- [ ] **Step 1: Write the failing fallback-order test**

Add this test in `src/utils/heroCarousel.test.js`, replacing the current `getHeroImage prefers banner imagery and falls back to poster image` test:

```js
test('getHeroImage prefers AniList, then Kitsu, then trailer thumbnail, then poster', () => {
  const item = { img: 'poster.jpg' }

  assert.equal(getHeroImage(item, 'anilist-banner.jpg', 'kitsu-cover.jpg', 'thumb.jpg'), 'anilist-banner.jpg')
  assert.equal(getHeroImage(item, null, 'kitsu-cover.jpg', 'thumb.jpg'), 'kitsu-cover.jpg')
  assert.equal(getHeroImage(item, null, null, 'thumb.jpg'), 'thumb.jpg')
  assert.equal(getHeroImage(item, null, null, null), 'poster.jpg')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/utils/heroCarousel.test.js`

Expected: FAIL because `getHeroImage` currently accepts only `(item, bannerUrl, trailerThumbUrl)` and treats the Kitsu URL as the trailer thumbnail.

- [ ] **Step 3: Update `getHeroImage`**

Change `src/utils/heroCarousel.js` to:

```js
export function getHeroImage(item, bannerUrl, kitsuCoverUrl, trailerThumbUrl) {
  return bannerUrl || kitsuCoverUrl || trailerThumbUrl || item?.img || null
}
```

- [ ] **Step 4: Run the focused test**

Run: `node --test src/utils/heroCarousel.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/heroCarousel.js src/utils/heroCarousel.test.js
git commit -m "test: cover hero image fallback order"
```

---

### Task 2: Kitsu Cover Fallback Service

**Files:**
- Create: `src/services/kitsu.js`
- Create: `src/services/kitsu.test.js`

- [ ] **Step 1: Write parsing tests**

Create `src/services/kitsu.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { getKitsuCoverImage } from './kitsu.js'

test('getKitsuCoverImage returns the largest useful cover image', () => {
  const anime = {
    attributes: {
      coverImage: {
        original: 'https://media.kitsu.app/anime/cover_images/1/original.jpg',
        large: 'https://media.kitsu.app/anime/cover_images/1/large.jpg',
        small: 'https://media.kitsu.app/anime/cover_images/1/small.jpg',
      },
    },
  }

  assert.equal(getKitsuCoverImage(anime), 'https://media.kitsu.app/anime/cover_images/1/original.jpg')
})

test('getKitsuCoverImage falls back through cover sizes and poster image', () => {
  assert.equal(
    getKitsuCoverImage({
      attributes: {
        coverImage: { original: null, large: 'large.jpg' },
        posterImage: { original: 'poster-original.jpg' },
      },
    }),
    'large.jpg'
  )

  assert.equal(
    getKitsuCoverImage({
      attributes: {
        coverImage: null,
        posterImage: { original: 'poster-original.jpg' },
      },
    }),
    'poster-original.jpg'
  )
})

test('getKitsuCoverImage returns null when no image exists', () => {
  assert.equal(getKitsuCoverImage(null), null)
  assert.equal(getKitsuCoverImage({ attributes: {} }), null)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/services/kitsu.test.js`

Expected: FAIL because `src/services/kitsu.js` does not exist.

- [ ] **Step 3: Create the Kitsu service**

Create `src/services/kitsu.js`:

```js
const KITSU = 'https://kitsu.io/api/edge'

export function getKitsuCoverImage(anime) {
  const cover = anime?.attributes?.coverImage
  const poster = anime?.attributes?.posterImage
  return cover?.original || cover?.large || cover?.small || cover?.tiny ||
    poster?.original || poster?.large || poster?.small || poster?.tiny || null
}

export async function fetchKitsuCoverByMalId(malId) {
  if (!malId) return null

  try {
    const url = `${KITSU}/anime?filter[externalId]=${encodeURIComponent(malId)}&filter[externalSite]=myanimelist/anime&page[limit]=1`
    const res = await fetch(url, {
      headers: { Accept: 'application/vnd.api+json' },
    })
    if (!res.ok) return null
    const json = await res.json()
    return getKitsuCoverImage(json?.data?.[0])
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run the focused service test**

Run: `node --test src/services/kitsu.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/kitsu.js src/services/kitsu.test.js
git commit -m "feat: add kitsu hero image fallback"
```

---

### Task 3: Seasonal Hero Banner Refactor

**Files:**
- Modify: `src/pages/SeasonalPage.jsx`

- [ ] **Step 1: Import the fallback helpers**

Change the imports at the top of `src/pages/SeasonalPage.jsx`:

```js
import { fetchAnilistBannerOnly } from '../services/anilist'
import { fetchKitsuCoverByMalId } from '../services/kitsu'
import { getHeroImage } from '../utils/heroCarousel'
```

- [ ] **Step 2: Track the Kitsu fallback**

Near the existing hero banner state:

```js
const [heroBanner, setHeroBanner] = useState(null)
const [heroKitsuCover, setHeroKitsuCover] = useState(null)
```

- [ ] **Step 3: Fetch Kitsu only when AniList has no banner**

Replace the current hero banner effect with:

```js
useEffect(() => {
  let cancelled = false
  if (!hero?.id) return

  setHeroBanner(null)
  setHeroKitsuCover(null)

  fetchAnilistBannerOnly(hero.id)
    .then(async url => {
      if (cancelled) return
      setHeroBanner(url || null)
      if (url) return

      const kitsuUrl = await fetchKitsuCoverByMalId(hero.id)
      if (!cancelled) setHeroKitsuCover(kitsuUrl || null)
    })
    .catch(async () => {
      const kitsuUrl = await fetchKitsuCoverByMalId(hero.id)
      if (!cancelled) setHeroKitsuCover(kitsuUrl || null)
    })

  return () => { cancelled = true }
}, [hero?.id])
```

- [ ] **Step 4: Compute the final background image**

Replace:

```js
const ytThumb = heroBanner ?? (ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null)
```

with:

```js
const ytThumb = ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null
const heroBackground = getHeroImage(hero, heroBanner, heroKitsuCover, ytThumb)
```

- [ ] **Step 5: Refactor the hero markup**

Inside the `!isArchive` hero block, remove the separate right-side portrait image and use one background image plus overlays. The top-level hero `style` should keep the current height, radius, click behavior, and box shadow. The image layer should be:

```jsx
{heroBackground && (
  <img src={heroBackground} alt="" style={{
    position: 'absolute', inset: 0,
    width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center'
  }} />
)}
<div style={{
  position: 'absolute', inset: 0,
  background: 'linear-gradient(90deg, rgba(0,0,0,.86) 0%, rgba(0,0,0,.58) 44%, rgba(0,0,0,.16) 100%)'
}} />
<div style={{
  position: 'absolute', inset: 0,
  background: 'linear-gradient(0deg, rgba(0,0,0,.58) 0%, transparent 46%)'
}} />
```

The content wrapper should remain `className="hero-pad"` and use:

```js
{
  position: 'relative',
  zIndex: 2,
  padding: '48px 52px',
  height: '100%',
  maxWidth: 620,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  alignItems: 'flex-start'
}
```

Keep the existing badge, title, synopsis, score chips, streaming chips, user status chip, and dots.

- [ ] **Step 6: Run the build**

Run: `npm run build`

Expected: PASS with Vite production build output.

- [ ] **Step 7: Commit**

```bash
git add src/pages/SeasonalPage.jsx
git commit -m "feat: simplify seasonal hero banner"
```

---

### Task 4: Final Verification

**Files:**
- Verify: `src/utils/heroCarousel.test.js`
- Verify: `src/services/kitsu.test.js`
- Verify: Vite build output

- [ ] **Step 1: Run all Node tests**

Run: `node --test src/**/*.test.js`

Expected: PASS for all test files.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Inspect git status**

Run: `git status --short`

Expected: no uncommitted files from this implementation, except unrelated user changes if they already existed.
