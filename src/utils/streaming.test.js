import assert from 'node:assert/strict'
import test from 'node:test'
import { getStreamingProviderName, getStreamingProviderUrl, hasStreamingProviderLinks } from './streaming.js'

test('getStreamingProviderName supports legacy strings and provider objects', () => {
  assert.equal(getStreamingProviderName('Netflix'), 'Netflix')
  assert.equal(getStreamingProviderName({ name: 'Crunchyroll', url: 'https://example.com' }), 'Crunchyroll')
})

test('getStreamingProviderUrl returns provider urls only from provider objects', () => {
  assert.equal(getStreamingProviderUrl('Netflix'), null)
  assert.equal(getStreamingProviderUrl({ name: 'Netflix', url: 'https://www.netflix.com/title/80001305' }), 'https://www.netflix.com/title/80001305')
  assert.equal(getStreamingProviderUrl({ name: 'Netflix', url: '' }), null)
})

test('hasStreamingProviderLinks detects real provider urls', () => {
  assert.equal(hasStreamingProviderLinks(['Netflix']), false)
  assert.equal(hasStreamingProviderLinks([{ name: 'Netflix', url: '' }]), false)
  assert.equal(hasStreamingProviderLinks([{ name: 'Netflix', url: 'https://www.netflix.com/title/80001305' }]), true)
})
