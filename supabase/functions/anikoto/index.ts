import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const ANILIST_TTL_MS = 24 * 60 * 60 * 1000  // 24 h

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  }
  const jwt = authHeader.slice(7)

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
  const { data: { user }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('is_premium')
    .eq('id', user.id)
    .single()

  const isAdmin = user.email === 'joaoguiar99@gmail.com'
  if (!profile?.is_premium && !isAdmin) {
    return new Response(JSON.stringify({ error: 'Premium required' }), {
      status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  }

  const body  = await req.json().catch(() => ({}))
  const route: string = body.route ?? ''

  // ── Route: anilist ─────────────────────────────────────────────────────────
  // Converts MAL ID → AniList ID + episode count via AniList public GraphQL API.
  // Result cached in anikoto_cache for 24 h.
  if (route === 'anilist') {
    const malId: number = Number(body.malId)
    if (!malId) {
      return new Response(JSON.stringify({ error: 'Missing malId' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      })
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
        return new Response(JSON.stringify(cached.data), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        })
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
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      })
    }

    const payload = { anilistId, episodes }

    await admin.from('anikoto_cache').upsert({
      cache_key: cacheKey, data: payload, cached_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify(payload), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  }

  return new Response(JSON.stringify({ error: 'Unknown route' }), {
    status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
})