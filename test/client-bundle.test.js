import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const EXPECTED_ID = 'dsh-token-usage-dashboard'

test('client bundle registers the package manifest name', async () => {
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
  const match = source.match(/window\.__ModuleLoader__\.load\(\{\s*id:\s*['"]([^'"]+)['"]/u)
  assert.ok(match, 'client bundle must register through window.__ModuleLoader__.load')
  assert.equal(match[1], EXPECTED_ID)
})
