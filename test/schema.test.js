import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { reportSchema } from '../lib/index.js'

const requireFromDsh = createRequire('/usr/local/lib/node_modules/@deepseek-ai/dsh/package.json')
const { assertSupportedJsonSchema, validateJsonSchemaValue } = requireFromDsh('@deepseek-ai/dsh-tools')

test('tool output schema uses the supported JSON Schema subset', () => {
  assert.doesNotThrow(() => assertSupportedJsonSchema(reportSchema))
})

test('tool output schema accepts a complete report', () => {
  const totals = {
    calls: 1,
    inputTokens: 2,
    outputTokens: 3,
    cacheReadTokens: 4,
    cacheWriteTokens: 5,
    reasoningTokens: 1,
    providerTotalTokens: 14,
  }
  const report = {
    generatedAt: new Date(0).toISOString(),
    sessions: 1,
    attributedCalls: 1,
    unattributedCalls: 0,
    rows: [{ provider: 'p', model: 'm', ...totals }],
    totals,
    attributedTotals: totals,
    failures: [],
  }
  assert.deepEqual(validateJsonSchemaValue(reportSchema, report), [])
})
