export function getSafeExternalLinkProps(url) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return null
    return {
      href: parsed.toString(),
      target: '_blank',
      rel: 'noopener noreferrer',
    }
  } catch {
    return null
  }
}
