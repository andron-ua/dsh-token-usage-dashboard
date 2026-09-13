import { aggregateSessionSnapshots, filterSnapshotsByDays } from './aggregate.js'

export const name = 'token-usage-dashboard'
export const inject = ['sessionQuery', 'commands', 'tools', 'connection']
export const TOKEN_USAGE_PATH = '/api/token-usage'

function parseDays(value) {
  if (value === undefined || value === null || value === '' || value === 'all') return undefined
  const days = Number(value)
  if (!Number.isSafeInteger(days) || days < 1 || days > 36500) throw new Error('days must be an integer from 1 to 36500, or all')
  return days
}

export async function collectUsage(sessionQuery, options = {}) {
  const records = await sessionQuery.listSessions(options.signal)
  const snapshots = []
  const failures = []
  for (const record of records) {
    options.signal?.throwIfAborted()
    try {
      snapshots.push(await sessionQuery.readSession(record.header.id))
    } catch (error) {
      failures.push({ sessionId: String(record.header.id), message: error instanceof Error ? error.message : String(error) })
    }
  }
  const filtered = filterSnapshotsByDays(snapshots, options.days, options.now)
  return { ...aggregateSessionSnapshots(filtered), failures }
}

function formatInteger(value) {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatUsageReport(report) {
  const lines = [
    `Token usage by provider/model — ${report.sessions} sessions, ${report.attributedCalls} attributed calls`,
    '',
  ]
  if (report.rows.length === 0) lines.push('No provider-attributed token usage was found.')
  for (const row of report.rows) {
    const input = row.inputTokens + row.cacheReadTokens + row.cacheWriteTokens
    lines.push(`${row.provider}/${row.model}`)
    lines.push(`  calls ${formatInteger(row.calls)} · input ${formatInteger(input)} (uncached ${formatInteger(row.inputTokens)}, cache read ${formatInteger(row.cacheReadTokens)}, cache write ${formatInteger(row.cacheWriteTokens)}) · output ${formatInteger(row.outputTokens)} · reasoning ${formatInteger(row.reasoningTokens)}`)
  }
  if (report.unattributedCalls > 0) lines.push('', `Unattributed usage records: ${formatInteger(report.unattributedCalls)}`)
  if (report.failures.length > 0) lines.push(`Unreadable sessions: ${formatInteger(report.failures.length)}`)
  return lines.join('\n')
}

const totalsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['calls', 'inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'reasoningTokens', 'providerTotalTokens'],
  properties: {
    calls: { type: 'integer' },
    inputTokens: { type: 'integer' },
    outputTokens: { type: 'integer' },
    cacheReadTokens: { type: 'integer' },
    cacheWriteTokens: { type: 'integer' },
    reasoningTokens: { type: 'integer' },
    providerTotalTokens: { type: 'integer' },
  },
}

export const reportSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['generatedAt', 'sessions', 'attributedCalls', 'unattributedCalls', 'rows', 'totals', 'attributedTotals', 'failures'],
  properties: {
    generatedAt: { type: 'string' },
    sessions: { type: 'integer' },
    attributedCalls: { type: 'integer' },
    unattributedCalls: { type: 'integer' },
    rows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['provider', 'model', 'calls', 'inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'reasoningTokens', 'providerTotalTokens'],
        properties: {
          provider: { type: 'string' },
          model: { type: 'string' },
          calls: { type: 'integer' },
          inputTokens: { type: 'integer' },
          outputTokens: { type: 'integer' },
          cacheReadTokens: { type: 'integer' },
          cacheWriteTokens: { type: 'integer' },
          reasoningTokens: { type: 'integer' },
          providerTotalTokens: { type: 'integer' },
        },
      },
    },
    totals: totalsSchema,
    attributedTotals: totalsSchema,
    failures: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['sessionId', 'message'],
        properties: {
          sessionId: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
}

export function apply(ctx) {
  ctx.effect(() => ctx.commands.register({
    name: 'usage',
    description: 'Show token consumption grouped by provider and model',
    input: { hint: '[all|<days>]' },
    async handler(invocation) {
      try {
        const days = parseDays(invocation.rawInput.trim())
        const report = await collectUsage(ctx.sessionQuery, { days, signal: invocation.signal })
        return { kind: 'success', text: formatUsageReport(report) }
      } catch (error) {
        return { kind: 'error', text: error instanceof Error ? error.message : String(error) }
      }
    },
  }), 'token-usage-dashboard: command')

  ctx.effect(() => ctx.tools.register({
    name: 'token_usage_stats',
    description: 'Aggregate durable DSH token consumption by provider and model. Includes every session and avoids double-counting fork-inherited history.',
    parameters: { days: { type: 'integer', description: 'Optional lookback in whole days (1–36500). Omit for all history.' } },
    output: {
      schema: reportSchema,
      render: (_args, value) => [{ type: 'text', text: formatUsageReport(value) }],
    },
    async execute(args, exec) {
      const days = args.days === undefined ? undefined : parseDays(args.days)
      return collectUsage(ctx.sessionQuery, { days, signal: exec.signal })
    },
  }), 'token-usage-dashboard: tool')

  ctx.connection.fetch.register({
    path: TOKEN_USAGE_PATH,
    methods: ['GET'],
    requestBody: 'buffered',
    async fetch(request) {
      try {
        const url = new URL(request.url)
        const days = parseDays(url.searchParams.get('days') ?? undefined)
        const report = await collectUsage(ctx.sessionQuery, { days, signal: request.signal })
        return Response.json(report, { headers: { 'cache-control': 'no-store' } })
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 })
      }
    },
  })
}
