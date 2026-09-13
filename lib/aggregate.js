const ZERO = Object.freeze({
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  reasoningTokens: 0,
  providerTotalTokens: 0,
})

export function emptyTotals() {
  return { ...ZERO }
}

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

function addUsage(target, usage) {
  target.calls += 1
  target.inputTokens += safeCount(usage.inputTokens)
  target.outputTokens += safeCount(usage.outputTokens)
  target.cacheReadTokens += safeCount(usage.cacheReadTokens)
  target.cacheWriteTokens += safeCount(usage.cacheWriteTokens)
  target.reasoningTokens += safeCount(usage.reasoningTokens)
  target.providerTotalTokens += safeCount(usage.totalTokens)
}

function mergeTotals(target, source) {
  for (const key of Object.keys(ZERO)) target[key] += source[key]
}

export function aggregateSessionSnapshots(snapshots) {
  const groups = new Map()
  const totals = emptyTotals()
  let attributedCalls = 0
  let unattributedCalls = 0

  for (const snapshot of snapshots) {
    const start = safeCount(snapshot.inheritedEventCount)
    for (const event of snapshot.events.slice(start)) {
      if (event.type !== 'assistant/message') continue
      const usage = event.data && event.data.usage
      if (!usage) continue
      addUsage(totals, usage)
      const source = event.data.message && event.data.message.source
      const provider = source && typeof source.provider === 'string' ? source.provider : ''
      const model = source && typeof source.model === 'string' ? source.model : ''
      if (!provider || !model) {
        unattributedCalls += 1
        continue
      }
      attributedCalls += 1
      const key = `${provider}\u0000${model}`
      let group = groups.get(key)
      if (!group) {
        group = { provider, model, ...emptyTotals() }
        groups.set(key, group)
      }
      addUsage(group, usage)
    }
  }

  const rows = [...groups.values()].sort((a, b) => {
    const totalA = a.inputTokens + a.outputTokens + a.cacheReadTokens + a.cacheWriteTokens
    const totalB = b.inputTokens + b.outputTokens + b.cacheReadTokens + b.cacheWriteTokens
    return totalB - totalA || a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model)
  })

  const attributedTotals = emptyTotals()
  for (const row of rows) mergeTotals(attributedTotals, row)

  return {
    generatedAt: new Date().toISOString(),
    sessions: snapshots.length,
    attributedCalls,
    unattributedCalls,
    rows,
    totals,
    attributedTotals,
  }
}

export function filterSnapshotsByDays(snapshots, days, now = Date.now()) {
  if (days === undefined) return snapshots
  const cutoff = now - days * 86400000
  return snapshots.filter((snapshot) => {
    const createdAt = snapshot.session && snapshot.session.createdAt
    const value = typeof createdAt === 'number' ? createdAt : Date.parse(createdAt)
    return Number.isFinite(value) && value >= cutoff
  })
}
