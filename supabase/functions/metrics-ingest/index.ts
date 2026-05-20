import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const DEFAULT_ALLOWED_ORIGINS = [
  'https://funnyroll.com',
  'https://www.funnyroll.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]

const ALLOWED_EVENT_TYPES = new Set([
  'anime_open',
  'banner_click',
  'banner_view',
  'episode_complete',
  'episode_play',
  'episode_progress',
  'feedback_vote',
  'notes_change',
  'page_load',
  'player_buffering',
  'player_error',
  'score_change',
  'search',
  'search_error',
  'search_recent_click',
  'search_result_click',
  'status_change',
  'video_start_time',
  'watchlist_add',
])

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) },
  })
}

function getClientIp(req: Request) {
  const candidates = [
    req.headers.get('cf-connecting-ip'),
    req.headers.get('x-real-ip'),
    req.headers.get('fly-client-ip'),
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
  ]

  return candidates.find(Boolean) ?? null
}

async function lookupGeo(ip: string | null) {
  if (!ip) return {}

  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return {}
    const json = await res.json()
    if (!json?.success) return {}
    return {
      countryCode: json.country_code ?? null,
      country: json.country ?? null,
      region: json.region ?? null,
      city: json.city ?? null,
      ipTimezone: json.timezone?.id ?? null,
    }
  } catch {
    return {}
  }
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

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)
  const authHeader = req.headers.get('Authorization')

  let userId: string | null = null
  if (authHeader?.startsWith('Bearer ')) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    userId = user?.id ?? null
  }

  const body = await req.json().catch(() => ({}))
  const type = String(body.type ?? '').trim()
  if (!ALLOWED_EVENT_TYPES.has(type)) {
    return jsonResponse(req, { error: 'Invalid event type' }, 400)
  }

  const page = body.page == null ? null : String(body.page).slice(0, 80)
  const sessionId = body.sessionId == null ? null : String(body.sessionId).slice(0, 120)
  const animeId = Number.isFinite(Number(body.animeId)) ? Number(body.animeId) : null
  const rawMetadata = body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
    ? body.metadata
    : {}
  if (JSON.stringify(rawMetadata).length > 5000) {
    return jsonResponse(req, { error: 'Invalid metadata' }, 400)
  }

  const ip = getClientIp(req)
  const geo = await lookupGeo(ip)
  const metadata = {
    ...rawMetadata,
    ...geo,
  }

  const { error } = await admin.from('site_metrics_events').insert({
    event_type: type,
    user_id: userId,
    anime_id: animeId,
    page,
    session_id: sessionId,
    metadata,
  })

  if (error) {
    console.error('[metrics-ingest] insert failed')
    return jsonResponse(req, { error: 'Unable to record metric' }, 500)
  }

  return jsonResponse(req, { ok: true })
})
