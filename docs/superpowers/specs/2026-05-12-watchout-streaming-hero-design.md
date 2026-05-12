# Watchout Streaming Hero Design

Date: 2026-05-12

## Decision

Use direction A: a cinematic streaming hero inspired by anime streaming platforms. The existing seasonal hero will be upgraded into a full-width carousel instead of replacing the data flow or routing model.

## Goals

- Make the first viewport feel like a premium anime streaming product.
- Replace the current card-like hero with a 70vh to 75vh full-width carousel on desktop.
- Keep existing anime data, navigation, detail opening, status updates, shelves, grids, and archive behavior intact.
- Improve the dark visual system with purple as the brand accent and orange only for the primary CTA.
- Preserve accessibility with readable contrast, focus styles, and labelled carousel controls.

## Existing Context

The current home experience lives in `src/pages/SeasonalPage.jsx`. `App.jsx` owns `heroIdx`, rotates through `airingItems`, and passes `hero`, `heroIdx`, `setHeroIdx`, and `airingItems` into `SeasonalPage`.

The hero already uses AniList banner art through `fetchAnilistBannerOnly(hero.id)` with a YouTube thumbnail fallback. `MediaCard.jsx` is shared by multiple pages and shelves, so card styling changes must remain compatible with grid and shelf variants. `Nav.jsx` owns the top navigation and the mobile bottom tab bar. Global animation and responsive rules are in `src/index.css`.

## Hero Design

The seasonal hero will become a cinematic carousel section:

- Full-bleed relative to the viewport width using a wrapper that breaks out of the `.main-content` horizontal padding.
- Desktop height: `70vh` to `75vh`, with sensible `min-height` and `max-height` to avoid unusable extremes.
- Background image uses AniList banner art or YouTube thumbnail when available, with the poster image layered on the right to keep character art visible.
- Left-side text column sits above a strong dark left-to-right gradient.
- Bottom gradient fades into the page background so the shelves below feel connected.
- Text content includes:
  - badge: `ON AIR` for airing titles, otherwise `TRENDING`;
  - title;
  - metadata line built from available rating/streaming/genres data, with fallbacks;
  - clamped synopsis;
  - `Start Watching` primary CTA;
  - `Add to List` secondary CTA;
  - carousel dots;
  - previous/next arrow buttons.

Interaction behavior:

- Clicking `Start Watching` opens the anime detail using the existing `onOpen(hero)` flow.
- Clicking the main hero background can continue opening the anime detail for continuity.
- Clicking `Add to List` applies the existing `plan_to_watch` status when `hero.userStatus` is empty and stops event propagation. If the anime already has a status, the secondary CTA displays the current translated status and does not remove or change it.
- Previous/next arrows update `heroIdx` and stop event propagation.
- Dots update `heroIdx` and include accessible labels.
- Existing auto-rotation in `App.jsx` remains intact.

## Navbar Design

The top navbar will become fixed at the top with a dark glass treatment:

- `background: rgba(5, 5, 9, 0.75)`;
- `backdrop-filter: blur(18px)`;
- `border-bottom: 1px solid rgba(255, 255, 255, 0.08)`;
- active desktop nav items use purple text and a soft purple surface;
- search and sign-in controls align with the purple/orange palette;
- mobile bottom navigation keeps its existing behavior but adopts the updated dark glass and active purple accent.

Because a fixed navbar leaves normal document flow, pages need top spacing where necessary. The hero can sit under the glass nav visually, but text and controls must not be hidden behind it.

## Card Design

`MediaCard.jsx` keeps its current props and shared role across shelves, grids, search, profile, and categories. Styling changes will be mostly class-driven:

- larger radius for grid cards and refined radius for shelf cards;
- darker surface and softer border;
- hover transform: `translateY(-6px) scale(1.02)` on hover-capable devices;
- deeper but soft hover shadow;
- image scale on hover remains subtle;
- image overlay gradient is strengthened so title and badges remain readable;
- focus-visible state remains visible for keyboard users.

The touch media query will continue disabling hover lift and overlays on touch devices.

## Visual System

Add or align CSS variables to the requested palette:

- `--bg-main: #050509`;
- `--bg-surface: #101018`;
- `--bg-card: #151522`;
- `--primary: #8b5cf6`;
- `--primary-soft: #a78bfa`;
- `--cta: #ff7a00`;
- `--text-main: #f8fafc`;
- `--text-muted: #a1a1aa`;
- `--border-soft: rgba(255, 255, 255, 0.08)`.

The app still supports the existing theme context, but the default dark palette should match the premium Watchout direction. Light mode should not be the focus of this change; it should remain functional without blocking the dark redesign.

## Responsive Design

Desktop:

- hero text left, character/poster art right;
- strong CTA row and visible carousel arrows;
- hero height around 70vh to 75vh.

Tablet:

- hero height lowers to around 58vh to 64vh;
- title and content width reduce;
- right art remains visible but less dominant.

Mobile:

- hero height around 520px or viewport-aware equivalent;
- text becomes compact and lower in the hero;
- background art is centered and darkened enough for contrast;
- buttons stack or become full-width when needed;
- arrows may be hidden if they crowd the layout, with dots remaining available.

## Accessibility

- Carousel arrow buttons use `aria-label`.
- Dot buttons use `aria-label` and `aria-current` for the active slide.
- CTAs are real buttons with visible focus.
- Decorative images use empty `alt`.
- Text contrast is protected by gradients and text shadows, not by relying on the image.
- Buttons have minimum usable touch targets on mobile.

## Testing And Verification

- Build the app with `npm run build`.
- Run the local Vite server and inspect the seasonal page on desktop, tablet, and mobile widths.
- Verify:
  - hero loads with current anime data;
  - arrows and dots change slides;
  - `Start Watching` opens the detail page;
  - `Add to List` does not accidentally open detail;
  - archive mode still hides the hero;
  - cards remain usable on shelves and grids;
  - navbar does not cover important content.

## Out Of Scope

- Replacing the anime data source.
- Adding a third-party carousel dependency.
- Redesigning detail pages, auth, profile, community, admin, or news pages beyond shared card/nav effects.
- Creating new image assets.
