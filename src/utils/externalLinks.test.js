import assert from 'node:assert/strict'
import test from 'node:test'
import { getSafeExternalLinkProps } from './externalLinks.js'

test('getSafeExternalLinkProps allows https links and adds safe target attributes', () => {
  assert.deepEqual(getSafeExternalLinkProps('https://www.netflix.com/title/1'), {
    href: 'https://www.netflix.com/title/1',
    target: '_blank',
    rel: 'noopener noreferrer',
  })
})

test('getSafeExternalLinkProps blocks javascript/data and remote http links', () => {
  assert.equal(getSafeExternalLinkProps('javascript:alert(1)'), null)
  assert.equal(getSafeExternalLinkProps('data:text/html,test'), null)
  assert.equal(getSafeExternalLinkProps('http://example.com'), null)
})
