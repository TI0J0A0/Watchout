import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
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
    return new Response(null, { status: 204, headers: corsHeaders() })
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
  if (!type) {
    return new Response(JSON.stringify({ error: 'Missing type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  }

  const ip = getClientIp(req)
  const geo = await lookupGeo(ip)
  const metadata = {
    ...(body.metadata ?? {}),
    ...geo,
  }

  const { error } = await admin.from('site_metrics_events').insert({
    event_type: type,
    user_id: userId,
    anime_id: body.animeId ?? null,
    page: body.page ?? null,
    session_id: body.sessionId ?? null,
    metadata,
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
})
