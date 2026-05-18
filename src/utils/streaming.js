export function getStreamingProviderName(provider) {
  if (typeof provider === 'string') return provider
  return typeof provider?.name === 'string' ? provider.name : ''
}

export function getStreamingProviderUrl(provider) {
  if (!provider || typeof provider !== 'object') return null
  return typeof provider.url === 'string' && provider.url.trim() ? provider.url : null
}

export function hasStreamingProviderLinks(providers = []) {
  return providers.some(provider => Boolean(getStreamingProviderUrl(provider)))
}
