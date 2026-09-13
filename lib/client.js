window.__ModuleLoader__.load({
  id: '@local/dsh-token-usage-dashboard',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')

    const styles = `
      .tud-root{color:var(--dsw-alias-label-primary);padding:4px 2px 24px}.tud-head{display:flex;align-items:center;gap:10px;margin-bottom:16px}.tud-head h2{font-size:18px;margin:0;flex:1}.tud-btn,.tud-select{border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;height:34px;padding:0 12px}.tud-btn{cursor:pointer}.tud-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:16px}.tud-card{background:var(--dsw-alias-bg-layer-2);border:.5px solid var(--dsw-alias-border-l2);border-radius:10px;padding:12px}.tud-card strong{display:block;font-size:18px}.tud-card span,.tud-note{font-size:12px;color:var(--dsw-alias-label-secondary)}.tud-table{width:100%;border-collapse:collapse;font-size:12px}.tud-table th{text-align:left;color:var(--dsw-alias-label-secondary);font-weight:500}.tud-table th,.tud-table td{padding:9px 6px;border-bottom:.5px solid var(--dsw-alias-border-l2);white-space:nowrap}.tud-table td:first-child{white-space:normal;word-break:break-word}.tud-num{text-align:right!important;font-variant-numeric:tabular-nums}.tud-error{color:var(--dsw-alias-label-error)}@media(max-width:720px){.tud-summary{grid-template-columns:1fr}.tud-table-wrap{overflow:auto}}
    `
    if (typeof document !== 'undefined' && !document.querySelector('style[data-plugin-css="token-usage-dashboard"]')) {
      const tag = document.createElement('style')
      tag.dataset.pluginCss = 'token-usage-dashboard'
      tag.textContent = styles
      document.head.appendChild(tag)
    }

    const fmt = new Intl.NumberFormat()
    const n = (value) => fmt.format(value || 0)

    function Dashboard() {
      const [days, setDays] = React.useState('all')
      const [state, setState] = React.useState({ status: 'loading' })
      const load = React.useCallback(() => {
        const controller = new AbortController()
        setState({ status: 'loading' })
        fetch(`/api/token-usage?days=${encodeURIComponent(days)}`, { signal: controller.signal })
          .then(async (response) => {
            const body = await response.json()
            if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`)
            setState({ status: 'ready', report: body })
          })
          .catch((error) => {
            if (error.name !== 'AbortError') setState({ status: 'error', error: error.message })
          })
        return () => controller.abort()
      }, [days])
      React.useEffect(load, [load])
      const report = state.report
      return React.createElement('section', { className: 'tud-root' },
        React.createElement('div', { className: 'tud-head' },
          React.createElement('h2', null, 'Token usage'),
          React.createElement('select', { className: 'tud-select', value: days, onChange: (event) => setDays(event.target.value), 'aria-label': 'Lookback period' },
            React.createElement('option', { value: 'all' }, 'All history'),
            React.createElement('option', { value: '1' }, 'Last day'),
            React.createElement('option', { value: '7' }, 'Last 7 days'),
            React.createElement('option', { value: '30' }, 'Last 30 days'),
            React.createElement('option', { value: '90' }, 'Last 90 days')),
          React.createElement('button', { className: 'tud-btn', type: 'button', onClick: load }, 'Refresh')),
        state.status === 'loading' ? React.createElement('p', { className: 'tud-note' }, 'Loading durable session usage…') : null,
        state.status === 'error' ? React.createElement('p', { className: 'tud-error' }, state.error) : null,
        report ? React.createElement(React.Fragment, null,
          React.createElement('div', { className: 'tud-summary' },
            React.createElement('div', { className: 'tud-card' }, React.createElement('strong', null, n(report.sessions)), React.createElement('span', null, 'sessions')),
            React.createElement('div', { className: 'tud-card' }, React.createElement('strong', null, n(report.attributedCalls)), React.createElement('span', null, 'model calls')),
            React.createElement('div', { className: 'tud-card' }, React.createElement('strong', null, n(report.totals.inputTokens + report.totals.cacheReadTokens + report.totals.cacheWriteTokens + report.totals.outputTokens)), React.createElement('span', null, 'accounted tokens'))),
          React.createElement('div', { className: 'tud-table-wrap' }, React.createElement('table', { className: 'tud-table' },
            React.createElement('thead', null, React.createElement('tr', null, ['Provider / model','Calls','Input','Cache read','Cache write','Output','Reasoning'].map((label, index) => React.createElement('th', { key: label, className: index ? 'tud-num' : '' }, label)))),
            React.createElement('tbody', null, report.rows.map((row) => React.createElement('tr', { key: `${row.provider}/${row.model}` },
              React.createElement('td', null, `${row.provider}/${row.model}`),
              React.createElement('td', { className: 'tud-num' }, n(row.calls)),
              React.createElement('td', { className: 'tud-num' }, n(row.inputTokens)),
              React.createElement('td', { className: 'tud-num' }, n(row.cacheReadTokens)),
              React.createElement('td', { className: 'tud-num' }, n(row.cacheWriteTokens)),
              React.createElement('td', { className: 'tud-num' }, n(row.outputTokens)),
              React.createElement('td', { className: 'tud-num' }, n(row.reasoningTokens))))))),
          React.createElement('p', { className: 'tud-note' }, `Generated ${new Date(report.generatedAt).toLocaleString()}. Fork-inherited events are counted only in their owning session.${report.failures.length ? ` ${report.failures.length} session(s) could not be read.` : ''}`)) : null)
    }

    const inject = ['slots']
    function apply(ctx) {
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'token-usage',
        order: 80,
        label: 'Token usage',
      }, Dashboard))
    }

    module.exports.apply = apply
    module.exports.inject = inject
    return module.exports
  },
})
