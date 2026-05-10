const ANN_RSS = 'https://www.animenewsnetwork.com/all/rss.xml'

const PROXIES = [
  url => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
]

const CAT_COLOR = {
  'Anime':  '#BF5AF2',
  'Manga':  '#FF9F0A',
  'Game':   '#34C759',
  'Music':  '#FF2D55',
  'News':   '#0A84FF',
}

function stripHtml(str) {
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ')
    .trim()
}

function parseItems(text) {
  if (!text.includes('<item')) return []
  const doc  = new DOMParser().parseFromString(text, 'text/xml')
  return [...doc.querySelectorAll('item')].slice(0, 40).map(item => {
    const title    = stripHtml(item.querySelector('title')?.textContent ?? '')
    const link     = item.querySelector('link')?.textContent?.trim() ?? ''
    const desc     = item.querySelector('description')?.textContent ?? ''
    const pubDate  = item.querySelector('pubDate')?.textContent ?? ''
    const category = item.querySelector('category')?.textContent?.trim() ?? 'News'
    return {
      id:       link || title,
      title,
      link,
      preview:  stripHtml(desc).slice(0, 160).trim(),
      img:      null,
      date:     pubDate ? new Date(pubDate) : null,
      category,
      color:    CAT_COLOR[category] ?? '#636366',
    }
  }).filter(i => i.title && i.link)
}

export async function fetchAnnNews() {
  for (const makeUrl of PROXIES) {
    try {
      const res = await fetch(makeUrl(ANN_RSS))
      if (!res.ok) continue
      const text = await res.text()
      const items = parseItems(text)
      if (items.length > 0) return items
    } catch {
      // try next proxy
    }
  }
  throw new Error('All proxies failed')
}
