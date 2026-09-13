import assert from 'node:assert/strict'
import test from 'node:test'
import { aggregateSessionSnapshots, filterSnapshotsByDays } from '../lib/aggregate.js'

function message(seq, provider, model, usage) {
  return { type: 'assistant/message', seq, time: 1, data: { usage, message: { source: { provider, model } } } }
}

test('groups usage by effective provider and model', () => {
  const result = aggregateSessionSnapshots([{ session: { createdAt: 1 }, inheritedEventCount: 0, events: [
    message(0, 'openai', 'alpha', { inputTokens: 10, outputTokens: 4, cacheReadTokens: 3, cacheWriteTokens: 2, reasoningTokens: 1, totalTokens: 19 }),
    message(1, 'openai', 'alpha', { inputTokens: 5, outputTokens: 2 }),
    message(2, 'other', 'beta', { inputTokens: 7, outputTokens: 1 }),
  ] }])
  assert.equal(result.sessions, 1)
  assert.equal(result.attributedCalls, 3)
  assert.deepEqual(result.rows.map((row) => [row.provider, row.model, row.calls]), [['openai', 'alpha', 2], ['other', 'beta', 1]])
  assert.equal(result.rows[0].inputTokens, 15)
  assert.equal(result.rows[0].cacheReadTokens, 3)
  assert.equal(result.totals.outputTokens, 7)
})

test('does not double-count inherited fork prefix', () => {
  const inherited = message(0, 'openai', 'alpha', { inputTokens: 100, outputTokens: 20 })
  const owned = message(1, 'openai', 'beta', { inputTokens: 10, outputTokens: 2 })
  const result = aggregateSessionSnapshots([
    { session: { createdAt: 1 }, inheritedEventCount: 0, events: [inherited] },
    { session: { createdAt: 2 }, inheritedEventCount: 1, events: [inherited, owned] },
  ])
  assert.equal(result.attributedCalls, 2)
  assert.equal(result.totals.inputTokens, 110)
})

test('tracks usage without a usable source as unattributed', () => {
  const event = message(0, '', '', { inputTokens: 3, outputTokens: 2 })
  const result = aggregateSessionSnapshots([{ session: { createdAt: 1 }, inheritedEventCount: 0, events: [event] }])
  assert.equal(result.unattributedCalls, 1)
  assert.equal(result.rows.length, 0)
  assert.equal(result.totals.inputTokens, 3)
})

test('filters snapshots by session creation date', () => {
  const now = Date.parse('2026-01-10T00:00:00Z')
  const snapshots = [
    { session: { createdAt: '2026-01-09T12:00:00Z' } },
    { session: { createdAt: '2025-12-01T00:00:00Z' } },
  ]
  assert.deepEqual(filterSnapshotsByDays(snapshots, 7, now), [snapshots[0]])
  assert.equal(filterSnapshotsByDays(snapshots, undefined, now), snapshots)
})
