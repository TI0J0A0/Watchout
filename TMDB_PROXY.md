# TMDB image layer — setup

TMDB is the **first choice** for every image on the site, with automatic
fallback to Jikan / AniList / Kitsu when there's no match (anime coverage on
TMDB is uneven, and it has no MAL/AniList id, so we match by title + year and
cache the result).

The API **key never reaches the browser**. The frontend talks to a small proxy
on your VPS that injects the key and forwards to `api.themoviedb.org`. The image
files themselves come straight from TMDB's public CDN (`image.tmdb.org`), which
needs no key — so only the metadata/search calls go through the proxy.

```
browser ──> https://your-vps/tmdb/<path>  ──(adds key)──> https://api.themoviedb.org/3/<path>
browser ──> https://image.tmdb.org/t/p/...  (public, direct)
```

## 1. Proxy contract

The proxy must accept `GET /<anything><?query>` and forward it verbatim to
`https://api.themoviedb.org/3/<anything><?query>`, adding the TMDB auth and
returning the JSON unchanged. It must also allow CORS from the site origin.

Paths the app calls:
- `GET /search/tv?query=…&first_air_date_year=…&include_adult=false`
- `GET /search/movie?query=…&year=…&include_adult=false`
- `GET /tv/{id}/images?include_image_language=en,ja,null`
- `GET /movie/{id}/images?include_image_language=en,ja,null`
- `GET /tv/{id}/season/1/episode/{n}/images`

## 2. Proxy — nginx (simplest)

Use a TMDB **v4 Read Access Token** (Bearer). Replace the token and your site
origin.

```nginx
location /tmdb/ {
    # CORS for the site
    add_header Access-Control-Allow-Origin "https://your-site.com" always;

    proxy_pass https://api.themoviedb.org/3/;
    proxy_set_header Host api.themoviedb.org;
    proxy_set_header Authorization "Bearer YOUR_TMDB_V4_READ_TOKEN";
    proxy_ssl_server_name on;

    # small cache (optional but recommended)
    proxy_cache_valid 200 6h;
}
```

So `https://your-vps/tmdb/search/tv?query=Frieren` → `…/3/search/tv?query=Frieren`
with the Authorization header attached.

## 3. Proxy — Node/Express (alternative)

```js
import express from 'express'
const app = express()
const KEY = process.env.TMDB_V4_TOKEN          // keep the key in the VPS env
const ORIGIN = 'https://your-site.com'

app.get('/tmdb/*', async (req, res) => {
  const path = req.originalUrl.replace(/^\/tmdb/, '')
  const r = await fetch(`https://api.themoviedb.org/3${path}`, {
    headers: { Authorization: `Bearer ${KEY}`, Accept: 'application/json' },
  })
  res.set('Access-Control-Allow-Origin', ORIGIN)
  res.set('Cache-Control', 'public, max-age=21600')
  res.status(r.status).type('application/json').send(await r.text())
})

app.listen(8787)
```

(Using the v3 key instead of v4 token? Append `?api_key=…` to the forwarded URL
rather than setting the Authorization header.)

## 4. Frontend env

Set the proxy base URL (no trailing slash) wherever the site is built:

```
VITE_TMDB_PROXY_URL=https://your-vps/tmdb
```

- Local dev: put it in `.env.local`.
- Vercel: add it as an Environment Variable and redeploy (Vite inlines it at
  build time).

If it's empty, TMDB is disabled and the app keeps using the existing sources.

## 5. CSP

`vercel.json` → `Content-Security-Policy` → `connect-src` contains the
placeholder **`https://YOUR-VPS-DOMAIN`**. Replace it with your proxy origin
(e.g. `https://api.yoursite.com`). `image.tmdb.org` is already permitted by the
existing `img-src https:`.
