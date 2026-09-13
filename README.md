# DSH Token Usage Dashboard

A persistent [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web plugin that aggregates durable token consumption by effective provider and model.

## Features

- `/usage` — report all recorded usage.
- `/usage 30` — report sessions created during the last 30 days.
- `token_usage_stats` — model-callable tool with an optional `days` argument.
- **Settings → Token usage** — dashboard with all-time and 1/7/30/90-day filters.
- Separates uncached input, cache reads, cache writes, output, and reasoning tokens.
- Avoids double-counting the inherited event prefix of forked sessions.

The aggregator reads live-preferred, replay-validated logs through `sessionQuery` and attributes each usage record using the assistant message's actual `message.source.provider` and `message.source.model`.

## Requirements

- DeepSeek Harness `0.1.5-rc.2` or a compatible release.
- Node.js 22 or newer.
- The DSH Web profile.

## Install from GitHub

```bash
dsh plugin --profile web add github:andron-ua/dsh-token-usage-dashboard
```

Restart DSH Web after installation. To pin a release:

```bash
dsh plugin --profile web add github:andron-ua/dsh-token-usage-dashboard#v0.1.1
```

## Local development

From the directory containing this repository:

```bash
dsh plugin --profile web add ./dsh-token-usage-dashboard
```

The profile stores a local link. Restart DSH Web after Host changes.

## Usage

```text
/usage
/usage 7
/usage 30
```

You can also ask the model to run `token_usage_stats`, or open **Settings → Token usage**.

## Accounting notes

- `inputTokens` is uncached input.
- Cache reads and writes are displayed separately.
- Reasoning tokens are reported separately but are not added again to totals because providers generally include them in output accounting.
- Usage without a usable provider/model source is counted as unattributed.
- Unreadable sessions are reported rather than silently ignored.

## Test

```bash
npm test
```

The tests cover provider/model grouping, fork de-duplication, unattributed usage, date filtering, and compatibility with DSH's supported tool-output JSON Schema subset.

## License

MIT
