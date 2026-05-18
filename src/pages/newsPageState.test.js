import test from 'node:test'
import assert from 'node:assert/strict'
import {
  NEWS_PAGE_TABS,
  NEWS_PAGE_DEFAULT_TAB,
} from './newsPageState.js'

test('news page defaults to trailers and has no news tab', () => {
  assert.equal(NEWS_PAGE_DEFAULT_TAB, 'trailers')
  assert.deepEqual(NEWS_PAGE_TABS.map(tab => tab.id), ['trailers', 'onair', 'upcoming'])
  assert.equal(NEWS_PAGE_TABS.some(tab => tab.id === 'news'), false)
})
