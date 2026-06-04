// Some persisted records store each provider as a JSON string
// (e.g. '{"name":"HIDIVE","url":"..."}'). Normalize to a plain object so the
// rest of the app can treat providers uniformly.
export function normalizeStreamingProvider(provider) {
  if (provider && typeof provider === 'object') return provider
  if (typeof provider !== 'string') return null
  const trimmed = provider.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      /* fall through — treat as a plain name string */
    }
  }
  return { name: trimmed, url: '' }
}

export function getStreamingProviderName(provider) {
  const p = normalizeStreamingProvider(provider)
  return typeof p?.name === 'string' ? p.name : ''
}

export function getStreamingProviderUrl(provider) {
  const p = normalizeStreamingProvider(provider)
  if (!p || typeof p !== 'object') return null
  return typeof p.url === 'string' && p.url.trim() ? p.url : null
}

export function hasStreamingProviderLinks(providers = []) {
  return providers.some(provider => Boolean(getStreamingProviderUrl(provider)))
}
