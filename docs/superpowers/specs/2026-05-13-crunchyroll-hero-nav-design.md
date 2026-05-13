# Crunchyroll Hero and Navigation Design

## Goal

Move the seasonal landing experience closer to a premium streaming hero:

- Full-bleed cinematic hero.
- Large background artwork with visible characters on the center/right.
- Left-side content column with clear metadata and CTAs.
- Cleaner carousel controls.
- Desktop dropdown navigation for categories and season archive years.
- Replace the text-based Watchout brand mark with `img/Funnyroll Banner.png`.

## Hero Design

The seasonal hero should leave the page container and span the viewport width. It should use a tall first-fold layout:

- Desktop height: `clamp(620px, 78vh, 820px)`.
- Tablet height: around `620px`.
- Mobile height: around `520px`.

The background image should fill the hero with cover behavior and favor the center/right of the artwork on desktop. Use the existing hero image fallback chain:

1. AniList banner image.
2. Kitsu cover fallback.
3. Trailer thumbnail.
4. Poster image.

The overlay should protect readability without hiding the artwork:

- Strong horizontal dark gradient on the left.
- Lighter center/right overlay so characters remain visible.
- Bottom fade into the app background.

The content column should sit left and vertically lower-middle/bottom, with `max-width` between 420px and 520px. It includes:

- Airing/status badge.
- Premium-styled title, with official logo support only if future data provides one.
- Metadata line using rating, sub/dub or streaming labels, genres, and current list status.
- Clamped synopsis.
- Primary CTA: `Watch Now`.
- Secondary CTA: `Add to List`, or the translated current status when already saved.
- Small carousel dots below the content.

Carousel controls should add subtle left/right arrows at the viewport edges of the hero, hidden on mobile.

## Navigation Design

Desktop navigation should expose two dropdowns:

- `Categories`: Action, Adventure, Comedy, Drama, Fantasy, Horror, Mystery, Romance, Sci-Fi, Slice of Life, Sports, Supernatural, Psychological, Mecha, Historical, School, Martial Arts, Military, Thriller, Music.
- `Years`: current year and the previous three years, opening the seasonal archive.

The dropdowns should close after selection and use compact menu styling consistent with the existing profile menu.

Mobile bottom navigation should remain simple. Category/year browsing stays available inside the relevant pages to avoid overcrowding the bottom tab bar.

## Data Flow

`App.jsx` owns selection state for:

- Initial category selected from the nav dropdown.
- Initial seasonal archive year selected from the nav dropdown.

`CategoriesPage` accepts an initial genre id and updates its internal selection when that prop changes.

`SeasonalPage` accepts an initial archive year and opens archive mode using that year and a default season of `spring`.

## Brand Asset

Replace the upper-left CSS/text Watchout mark in `Nav.jsx` with `img/Funnyroll Banner.png`.

The asset should be displayed as a horizontal image, constrained by nav height. It should still navigate to Discover when clicked.

## Scope

In scope:

- `src/pages/SeasonalPage.jsx`
- `src/pages/CategoriesPage.jsx`
- `src/components/Nav.jsx`
- `src/App.jsx`
- Focused helper tests where behavior is moved into pure helpers.

Out of scope:

- Fetching official anime logos from a new API.
- New routes or URL schema beyond current hash navigation.
- Redesigning all shelves/cards.
