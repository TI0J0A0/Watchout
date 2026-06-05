import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))
const seasonalPageSource = readFileSync(join(currentDir, 'SeasonalPage.jsx'), 'utf8')

test('seasonal hero does not embed a remote video player', () => {
  assert.equal(seasonalPageSource.includes('youtube-nocookie.com/embed'), false)
  assert.equal(seasonalPageSource.includes('<iframe'), false)
  assert.equal(seasonalPageSource.includes('heroTrailerOn'), false)
})
