# Hero Banner Background Design

## Goal

Update the seasonal `HeroBanner` so it reads as a large horizontal media banner:

- A wide background image fills the hero.
- A dark gradient overlay keeps text legible.
- The content stack stays aligned left: badge/status, title, description, metadata/actions, and carousel dots.
- The layout remains responsive and stable on mobile.

## Image Strategy

The hero should prefer true horizontal artwork:

1. AniList `bannerImage`, via the existing `fetchAnilistBannerOnly(hero.id)`.
2. Kitsu cover image fallback when AniList has no usable banner.
3. YouTube trailer thumbnail when available.
4. Existing poster image as the final fallback.

If a horizontal image is unavailable, the same overlay and object-fit behavior should still make the fallback acceptable without adding a separate poster panel.

## Visual Design

Use one image layer as the hero background. Remove the separate portrait cover on the right.

The overlay should combine:

- A strong left-to-right dark gradient for left-aligned text.
- A subtle vertical fade at the bottom so the hero blends into the page.
- Optional background color fallback from `hero.color`/`hero.colorB` while images load.

The text column should have a bounded width and sit left/bottom within the banner. Existing hero details should remain: airing badge, title, synopsis, score, streaming chips, user status chip, and carousel dots.

## Responsive Behavior

Desktop keeps a large cinematic banner around the current hero height.

Mobile uses the existing reduced hero height and stronger overlay opacity. Text remains clamped so titles, synopsis, buttons, and dots do not overlap or push the layout.

## Scope

In scope:

- Refactor the current hero markup in `src/pages/SeasonalPage.jsx`.
- Add a Kitsu image fallback service/helper if needed.
- Add focused tests for image fallback selection.
- Keep existing carousel and click-to-open behavior.

Out of scope:

- Reworking shelves, archive mode, navigation, or unrelated hero systems.
- Adding new API keys or server-side functions.
