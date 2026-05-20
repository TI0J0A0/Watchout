const ANN_RSS  = 'https://www.animenewsnetwork.com/all/rss.xml'
const TTL_MS   = 15 * 60 * 1000   // 15 minutes in-memory cache

const CAT_COLOR: Record<string, string> = {
  'Anime': '#BF5AF2',
  'Manga': '#FF9F0A',
  'Game':  '#34C759',
  'Music': '#FF2D55',
  'News':  '#0A84FF',
}

interface NewsItem {
  id:       string
  title:    string
  link:     string
  preview:  string
  date:     string | null
  category: string
  color:    string
  img:      null
}

// Shared in-memory cache across requests within the same isolate lifetime
let cache: { items: NewsItem[]; at: number } | null = null

// Extract text content from an RSS tag, handling both CDATA and plain text
function getText(block: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${tag}>`,
    'i'
  )
  const m = block.match(re)
  return m ? (m[1] ?? m[2] ?? '').trim() : ''
}

function stripHtml(str: string): string {
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ')
    .trim()
}

function parseRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = []
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    if (items.length >= 40) break
    const raw      = m[1]
    const title    = stripHtml(getText(raw, 'title'))
    const link     = getText(raw, 'link').trim()
    const desc     = stripHtml(getText(raw, 'description')).slice(0, 160)
    const pubDate  = getText(raw, 'pubDate').trim()
    const category = getText(raw, 'category').trim() || 'News'
    if (!title || !link) continue
    items.push({
      id:       link || title,
      title,
      link,
      preview:  desc,
      date:     pubDate || null,
      category,
      color:    CAT_COLOR[category] ?? '#636366',
      img:      null,
    })
  }
  return items
}

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

function cors(req: Request) {
  const origin = req.headers.get('Origin')
  const allowedOrigin = isAllowedOrigin(origin) ? origin : null
  return {
    ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {}),
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }
}

function jsonResponse(req: Request, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(req), ...extra },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) })
  if (!isAllowedOrigin(req.headers.get('Origin'))) return jsonResponse(req, { error: 'Forbidden' }, 403)
  if (req.method !== 'GET') return jsonResponse(req, { error: 'Method not allowed' }, 405)

  // Serve from cache if still fresh
  if (cache && Date.now() - cache.at < TTL_MS) {
    return jsonResponse(req, cache.items, 200, { 'Cache-Control': 'public, max-age=900' })
  }

  try {
    const res = await fetch(ANN_RSS, {
      headers: { 'User-Agent': 'Watchout/1.0' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`ANN responded with ${res.status}`)
    const xml   = await res.text()
    const items = parseRSS(xml)
    if (items.length === 0) throw new Error('Empty RSS parse result')
    cache = { items, at: Date.now() }
    return jsonResponse(req, items, 200, { 'Cache-Control': 'public, max-age=900' })
  } catch (err) {
    console.error('[fetch-ann-news]', err)
    // Return stale cache rather than an error when available
    if (cache) return jsonResponse(req, cache.items, 200, { 'X-Cache': 'stale' })
    return jsonResponse(req, { error: 'Failed to fetch news' }, 502)
  }
})
