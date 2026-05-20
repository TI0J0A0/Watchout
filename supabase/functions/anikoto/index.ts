import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ANILIST_TTL_MS = 24 * 60 * 60 * 1000  // 24 h

const DEFAULT_ALLOWED_ORIGINS = [
  'https://funnyroll.com',
  'https://www.funnyroll.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]

function allowedOrigins() {
  return (Deno.env.get('ALLOWED_ORIGINS') || DEFAULT_ALLOWED_ORIGINS.join(','))
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
}

function isAllowedOrigin(origin: string | null) {
  if (!origin) return true
  return allowedOrigins().includes(origin)
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin')
  const allowedOrigin = isAllowedOrigin(origin) ? origin : null
  return {
    ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {}),
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  if (!isAllowedOrigin(req.headers.get('Origin'))) {
    return jsonResponse(req, { error: 'Forbidden' }, 403)
  }

  if (req.method !== 'POST') {
    return jsonResponse(req, { error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse(req, { error: 'Unauthorized' }, 401)
  }
  const jwt = authHeader.slice(7)

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) {
    return jsonResponse(req, { error: 'Invalid token' }, 401)
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('is_premium')
    .eq('id', user.id)
    .single()

  const { data: isAdminResult } = await userClient.rpc('is_admin')
  const isAdmin = Boolean(isAdminResult)
  if (!profile?.is_premium && !isAdmin) {
    return jsonResponse(req, { error: 'Premium required' }, 403)
  }

  const body  = await req.json().catch(() => ({}))
  const route: string = body.route ?? ''
  if (!['anilist', 'animeSearch'].includes(route)) {
    return jsonResponse(req, { error: 'Unknown route' }, 400)
  }

  // ── Route: anilist ─────────────────────────────────────────────────────────
  // Converts MAL ID → AniList ID + episode count via AniList public GraphQL API.
  // Result cached in anikoto_cache for 24 h.
  if (route === 'anilist') {
    const malId: number = Number(body.malId)
    if (!Number.isInteger(malId) || malId <= 0 || malId > 1000000) {
      return jsonResponse(req, { error: 'Invalid malId' }, 400)
    }

    const cacheKey = `anilist_mal_${malId}`

    const { data: cached } = await admin
      .from('anikoto_cache')
      .select('data, cached_at')
      .eq('cache_key', cacheKey)
      .single()

    if (cached) {
      const age = Date.now() - new Date(cached.cached_at).getTime()
      if (age < ANILIST_TTL_MS) {
        return jsonResponse(req, cached.data)
      }
    }

    const query = `
      query ($malId: Int) {
        Media(idMal: $malId, type: ANIME) {
          id
          episodes
        }
      }
    `

    let anilistId: number | null = null
    let episodes: number | null = null

    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query, variables: { malId } }),
      })

      if (res.ok) {
        const json = await res.json()
        const media = json?.data?.Media
        if (media) {
          anilistId = media.id ?? null
          episodes  = media.episodes ?? null
        }
      }
    } catch (e) {
      console.error('AniList query error:', e)
    }

    if (!anilistId) {
      return new Response(JSON.stringify({ anilistId: null, episodes: null }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
      })
    }

    const payload = { anilistId, episodes }

    await admin.from('anikoto_cache').upsert({
      cache_key: cacheKey, data: payload, cached_at: new Date().toISOString(),
    })

    return jsonResponse(req, payload)
  }

  // ── Route: animeSearch ─────────────────────────────────────────────────────
  // Searches Jikan by anime name and returns lightweight metadata for admin UI.
  if (route === 'animeSearch') {
    if (!isAdmin) {
      return jsonResponse(req, { error: 'Admin required' }, 403)
    }

    const query: string = String(body.query ?? '').trim()
    if (!query || query.length > 80) {
      return jsonResponse(req, { error: 'Invalid query' }, 400)
    }

    try {
      const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=8&order_by=members&sort=desc&sfw=true`
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Watchout/1.0' },
        signal: AbortSignal.timeout(8000),
      })

      if (!res.ok) {
        return jsonResponse(req, { error: 'Anime search failed' }, 502)
      }

      const json = await res.json()
      const items = (json?.data ?? []).map((anime: any) => ({
        id: anime.mal_id ?? null,
        title: anime.title_english || anime.title || '',
        titleDefault: anime.title || '',
        titleJapanese: anime.title_japanese || '',
        titleSynonyms: anime.title_synonyms ?? [],
        episodes: anime.episodes ?? null,
        status: anime.status ?? null,
        airing: anime.airing ?? false,
        airedFrom: anime.aired?.from ?? null,
        airedTo: anime.aired?.to ?? null,
        year: anime.year ?? null,
        season: anime.season ?? null,
        type: anime.type ?? null,
        source: anime.source ?? null,
        rating: anime.rating ?? null,
        score: anime.score ?? null,
        members: anime.members ?? null,
        studios: (anime.studios ?? []).map((studio: any) => studio.name).filter(Boolean),
        genres: (anime.genres ?? []).map((genre: any) => genre.name).filter(Boolean),
        synopsis: anime.synopsis ?? '',
        imageUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || '',
        trailerUrl: anime.trailer?.embed_url ?? anime.trailer?.url ?? null,
      }))

      return jsonResponse(req, { items })
    } catch (error) {
      console.error('animeSearch error:', error)
      return jsonResponse(req, { error: 'Anime search failed' }, 502)
    }
  }

  return jsonResponse(req, { error: 'Unknown route' }, 400)
})
