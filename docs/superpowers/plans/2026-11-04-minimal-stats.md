# Minimal Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a concise `/stats` review page showing only trustworthy result-, R-, drawdown-, ticker-, and session-based journal statistics.

**Architecture:** Keep all calculations in a new pure `src/domain/stats.ts` module. `StatsPage` fetches journal trades from IndexedDB, applies the selected date range through that module, and renders the snapshot with a dependency-free SVG equity curve. The existing `Trade` record is read as-is: this feature creates no process-tracking fields, migrations, or writes.

**Tech Stack:** React 19, TypeScript, React Router 7, Dexie, date-fns, Vitest, Testing Library, existing CSS token system.

## Global Constraints

- Use only existing `Trade.result`, `Trade.rMultiple`, `Trade.ticker`, `Trade.session`, `Trade.tradeDate`, and `Trade.createdAt`; do not add trade fields, IndexedDB versions, rules, compliance, planned risk, or process tracking.
- `result` supports dollar P&L/drawdown and `rMultiple` supports R expectancy independently. Preserve numeric zero; exclude only `undefined`, `NaN`, and non-finite numbers.
- Use `All` as the default date range. `30D` and `90D` are inclusive, based on local `tradeDate` strings and a supplied reference date.
- Display Net P&L, Expectancy R, Profit Factor, Win Rate, Max Drawdown, and Largest Loss only. Do not add Sharpe, ROIC, rolling metrics, targets, scores, position sizing, rule compliance, drill-down filters, or custom date ranges.
- Profit Factor is gross positive P&L divided by absolute gross negative P&L; show `—` when there are no losses, never `∞`.
- Treat `/Users/nammtrong023/Downloads/deltalytix-main` as the calculation reference. Reuse its verified aggregate Profit Factor pattern at `context/data-provider.tsx:1017-1042` and peak-to-trough drawdown loop at `app/api/ai/chat/tools/get-overall-performance-metrics.ts:92-106`; translate `pnl - commission` to this app's already-net `Trade.result` because this schema has no commission field.
- Do not reuse Deltalytix's separate AI-tool formula at `app/api/ai/chat/tools/get-overall-performance-metrics.ts:60-67`: it divides average win by average loss, which is a payoff ratio, not Profit Factor.
- Ticker/session tables only show groups with at least five finite-result trades. Missing ticker/session groups under `Unspecified`. Sort by Net P&L descending then name ascending.
- Preserve the compact dark visual system. Use readable labels and signs in addition to red/green; use tabular numerals. Keep tables horizontally scrollable in their own wrapper so the page never scrolls horizontally.
- The workspace has no `.git`; do not initialize Git or add commit steps.
- Completion requires fresh `npm test`, `npm run build`, and browser runtime verification of `/stats` before claiming success.

## Planned File Structure

| Path | Responsibility |
| --- | --- |
| `src/domain/stats.ts` | Pure range filtering, eligibility, aggregate metrics, curve/drawdown, and grouped breakdowns. |
| `src/domain/stats.test.ts` | Deterministic calculation tests, including zero, missing values, boundaries, and five-trade grouping gate. |
| `src/features/stats/EquityCurve.tsx` | Accessible responsive SVG curve with a text alternative and empty state. |
| `src/features/stats/StatsPage.tsx` | IndexedDB fetch/retry flow, range state, metric rendering, and breakdown tables. |
| `src/features/stats/StatsPage.test.tsx` | UI tests for loading, normal, empty, range selection, group gate, and retry. |
| `src/App.tsx` | `/stats` route registration. |
| `src/features/shell/Sidebar.test.tsx` | Regression test that Stats is exposed in primary navigation. |
| `src/styles/app.css` | Stats-specific, responsive styles using existing tokens. |

---

### Task 1: Build the pure stats domain model and its test matrix

**Files:**
- Create: `src/domain/stats.ts`
- Create: `src/domain/stats.test.ts`

**Interfaces:**
- Consumes: `Trade` from `src/domain/trade.ts`.
- Produces:

```ts
export type StatsRange = '30D' | '90D' | 'ALL'

export interface SampleMetric {
  value: number | null
  sampleSize: number
}

export interface EquityPoint {
  tradeId: string
  tradeDate: string
  cumulativePnl: number
}

export interface BreakdownRow {
  name: string
  resultSampleSize: number
  rSampleSize: number
  netPnl: number
  expectancyR: number | null
  winRate: number | null
}

export interface StatsSnapshot {
  resultTradeCount: number
  netPnl: SampleMetric
  expectancyR: SampleMetric
  profitFactor: SampleMetric
  winRate: SampleMetric
  maxDrawdown: SampleMetric
  largestLoss: SampleMetric
  equityCurve: EquityPoint[]
  tickerBreakdown: BreakdownRow[]
  sessionBreakdown: BreakdownRow[]
}

export function buildStatsSnapshot(
  trades: Trade[],
  range: StatsRange,
  referenceDate?: Date,
): StatsSnapshot
```

- [ ] **Step 1: Inspect and record the upstream calculation reference before writing new logic.**

Run:

```bash
nl -ba /Users/nammtrong023/Downloads/deltalytix-main/context/data-provider.tsx | sed -n '1014,1042p'
nl -ba /Users/nammtrong023/Downloads/deltalytix-main/app/api/ai/chat/tools/get-overall-performance-metrics.ts | sed -n '92,112p'
```

Expected: the first excerpt sums positive and negative net trade outcomes separately before dividing gross profit by gross loss; the second starts at a zero peak, accumulates net P&L, updates the peak, then takes the maximum `peak - runningPnL`. Preserve these mechanics exactly with `Trade.result` as the net outcome.

- [ ] **Step 2: Write the failing domain tests from the upstream mechanics.**

Create `src/domain/stats.test.ts` with deterministic records and direct assertions:

```ts
import { describe, expect, it } from 'vitest'
import type { Trade } from './trade'
import { buildStatsSnapshot } from './stats'

const at = new Date('2026-11-04T12:00:00')

function trade(overrides: Partial<Trade>): Trade {
  return {
    id: crypto.randomUUID(),
    tradeDate: '2026-11-04',
    templateVersion: 1,
    ticker: 'MNQ',
    side: 'Long',
    session: 'New York AM',
    volatilityDriver: '',
    slides: [],
    createdAt: '2026-11-04T09:00:00.000Z',
    updatedAt: '2026-11-04T09:00:00.000Z',
    ...overrides,
  }
}

describe('buildStatsSnapshot', () => {
  it('calculates P&L, R metrics, peak-to-trough drawdown, and a chronological curve', () => {
    const snapshot = buildStatsSnapshot([
      trade({ id: 'a', tradeDate: '2026-11-01', createdAt: '2026-11-01T09:00:00Z', result: 100, rMultiple: 1 }),
      trade({ id: 'b', tradeDate: '2026-11-02', createdAt: '2026-11-02T09:00:00Z', result: -40, rMultiple: -0.4 }),
      trade({ id: 'c', tradeDate: '2026-11-03', createdAt: '2026-11-03T09:00:00Z', result: 60, rMultiple: 0.6 }),
      trade({ id: 'd', tradeDate: '2026-11-04', createdAt: '2026-11-04T09:00:00Z', result: -80, rMultiple: -0.8 }),
    ], 'ALL', at)

    expect(snapshot.netPnl).toEqual({ value: 40, sampleSize: 4 })
    expect(snapshot.expectancyR).toEqual({ value: 0.1, sampleSize: 4 })
    expect(snapshot.profitFactor).toEqual({ value: 160 / 120, sampleSize: 4 })
    expect(snapshot.winRate).toEqual({ value: 50, sampleSize: 4 })
    expect(snapshot.maxDrawdown).toEqual({ value: 80, sampleSize: 4 })
    expect(snapshot.largestLoss).toEqual({ value: 80, sampleSize: 4 })
    expect(snapshot.equityCurve.map(({ cumulativePnl }) => cumulativePnl)).toEqual([100, 60, 120, 40])
  })

  it('keeps zero, excludes non-finite values per metric, and returns null when data is unavailable', () => {
    const snapshot = buildStatsSnapshot([
      trade({ id: 'zero', result: 0, rMultiple: 0 }),
      trade({ id: 'r-only', result: undefined, rMultiple: 2 }),
      trade({ id: 'pnl-only', result: 50, rMultiple: undefined }),
      trade({ id: 'bad', result: Number.NaN, rMultiple: Number.POSITIVE_INFINITY }),
    ], 'ALL', at)

    expect(snapshot.netPnl).toEqual({ value: 50, sampleSize: 2 })
    expect(snapshot.expectancyR).toEqual({ value: 1, sampleSize: 2 })
    expect(snapshot.winRate).toEqual({ value: 50, sampleSize: 2 })
    expect(snapshot.profitFactor).toEqual({ value: null, sampleSize: 2 })
    expect(snapshot.largestLoss).toEqual({ value: null, sampleSize: 2 })
  })

  it('applies inclusive 30D and 90D ranges using local trade-date strings', () => {
    const snapshot30 = buildStatsSnapshot([
      trade({ id: 'outside', tradeDate: '2026-10-05', result: 99 }),
      trade({ id: 'edge', tradeDate: '2026-10-06', result: 10 }),
      trade({ id: 'today', tradeDate: '2026-11-04', result: 20 }),
    ], '30D', at)
    const snapshot90 = buildStatsSnapshot([
      trade({ id: 'outside', tradeDate: '2026-08-06', result: 99 }),
      trade({ id: 'edge', tradeDate: '2026-08-07', result: 10 }),
      trade({ id: 'today', tradeDate: '2026-11-04', result: 20 }),
    ], '90D', at)

    expect(snapshot30.netPnl).toEqual({ value: 30, sampleSize: 2 })
    expect(snapshot90.netPnl).toEqual({ value: 30, sampleSize: 2 })
  })

  it('shows qualified ticker/session groups only after five result trades and keeps missing values', () => {
    const mnq = Array.from({ length: 5 }, (_, index) => trade({ id: `mnq-${index}`, result: 10, rMultiple: 1 }))
    const fourEs = Array.from({ length: 4 }, (_, index) => trade({ id: `es-${index}`, ticker: 'MES', session: '', result: 20 }))
    const snapshot = buildStatsSnapshot([...mnq, ...fourEs], 'ALL', at)

    expect(snapshot.tickerBreakdown).toEqual([{
      name: 'MNQ', resultSampleSize: 5, rSampleSize: 5, netPnl: 50, expectancyR: 1, winRate: 100,
    }])
    expect(snapshot.sessionBreakdown).toEqual([{
      name: 'New York AM', resultSampleSize: 5, rSampleSize: 5, netPnl: 50, expectancyR: 1, winRate: 100,
    }])
  })
})
```

- [ ] **Step 3: Run the domain test and confirm the missing-module failure.**

Run:

```bash
npm test -- src/domain/stats.test.ts
```

Expected: FAIL because `./stats` does not exist.

- [ ] **Step 4: Implement the complete pure selector, preserving the referenced formulas.**

Create `src/domain/stats.ts`:

```ts
import { format, subDays } from 'date-fns'
import type { Trade } from './trade'

export type StatsRange = '30D' | '90D' | 'ALL'
export interface SampleMetric { value: number | null; sampleSize: number }
export interface EquityPoint { tradeId: string; tradeDate: string; cumulativePnl: number }
export interface BreakdownRow {
  name: string; resultSampleSize: number; rSampleSize: number
  netPnl: number; expectancyR: number | null; winRate: number | null
}
export interface StatsSnapshot {
  resultTradeCount: number; netPnl: SampleMetric; expectancyR: SampleMetric
  profitFactor: SampleMetric; winRate: SampleMetric; maxDrawdown: SampleMetric
  largestLoss: SampleMetric; equityCurve: EquityPoint[]
  tickerBreakdown: BreakdownRow[]; sessionBreakdown: BreakdownRow[]
}

const hasFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

function inRange(trade: Trade, range: StatsRange, referenceDate: Date): boolean {
  if (range === 'ALL') return true
  const days = range === '30D' ? 30 : 90
  const end = format(referenceDate, 'yyyy-MM-dd')
  const start = format(subDays(referenceDate, days - 1), 'yyyy-MM-dd')
  return trade.tradeDate >= start && trade.tradeDate <= end
}

function orderedResultTrades(trades: Trade[]): Trade[] {
  return trades.filter((trade) => hasFiniteNumber(trade.result)).sort((a, b) =>
    a.tradeDate.localeCompare(b.tradeDate) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  )
}

function buildBreakdown(trades: Trade[], key: 'ticker' | 'session'): BreakdownRow[] {
  const groups = new Map<string, Trade[]>()
  for (const trade of trades) {
    if (!hasFiniteNumber(trade.result)) continue
    const name = trade[key].trim() || 'Unspecified'
    groups.set(name, [...(groups.get(name) ?? []), trade])
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length >= 5)
    .map(([name, group]) => {
      const values = group.map((trade) => trade.result as number)
      const rValues = group.map((trade) => trade.rMultiple).filter(hasFiniteNumber)
      const wins = values.filter((value) => value > 0).length
      return {
        name,
        resultSampleSize: values.length,
        rSampleSize: rValues.length,
        netPnl: values.reduce((sum, value) => sum + value, 0),
        expectancyR: rValues.length ? rValues.reduce((sum, value) => sum + value, 0) / rValues.length : null,
        winRate: values.length ? (wins / values.length) * 100 : null,
      }
    })
    .sort((a, b) => b.netPnl - a.netPnl || a.name.localeCompare(b.name))
}

export function buildStatsSnapshot(
  trades: Trade[], range: StatsRange, referenceDate = new Date(),
): StatsSnapshot {
  const scoped = trades.filter((trade) => inRange(trade, range, referenceDate))
  const resultTrades = orderedResultTrades(scoped)
  const results = resultTrades.map((trade) => trade.result as number)
  const rValues = scoped.map((trade) => trade.rMultiple).filter(hasFiniteNumber)
  const grossProfit = results.filter((value) => value > 0).reduce((sum, value) => sum + value, 0)
  const grossLoss = Math.abs(results.filter((value) => value < 0).reduce((sum, value) => sum + value, 0))
  const largestLoss = results.filter((value) => value < 0).reduce<number | null>((worst, value) =>
    worst === null ? Math.abs(value) : Math.max(worst, Math.abs(value)), null)
  let cumulativePnl = 0
  let peakPnl = 0
  let maxDrawdown = 0
  const equityCurve = resultTrades.map((trade) => {
    cumulativePnl += trade.result as number
    peakPnl = Math.max(peakPnl, cumulativePnl)
    maxDrawdown = Math.max(maxDrawdown, peakPnl - cumulativePnl)
    return { tradeId: trade.id, tradeDate: trade.tradeDate, cumulativePnl }
  })
  const wins = results.filter((value) => value > 0).length
  const resultMetric = (value: number | null): SampleMetric => ({ value, sampleSize: results.length })

  return {
    resultTradeCount: results.length,
    netPnl: resultMetric(results.length ? results.reduce((sum, value) => sum + value, 0) : null),
    expectancyR: { value: rValues.length ? rValues.reduce((sum, value) => sum + value, 0) / rValues.length : null, sampleSize: rValues.length },
    profitFactor: resultMetric(grossLoss > 0 ? grossProfit / grossLoss : null),
    winRate: resultMetric(results.length ? (wins / results.length) * 100 : null),
    maxDrawdown: resultMetric(results.length ? maxDrawdown : null),
    largestLoss: resultMetric(largestLoss),
    equityCurve,
    tickerBreakdown: buildBreakdown(scoped, 'ticker'),
    sessionBreakdown: buildBreakdown(scoped, 'session'),
  }
}
```

- [ ] **Step 5: Run domain tests and typecheck.**

Run:

```bash
npm test -- src/domain/stats.test.ts
npm run build
```

Expected: the stats tests pass and the build exits 0.

- [ ] **Step 6: Record the no-Git checkpoint.**

Run:

```bash
find src/domain -maxdepth 1 -name 'stats*' -print
```

Expected: both `src/domain/stats.ts` and `src/domain/stats.test.ts` are present. Do not commit because the workspace is not a Git repository.

---

### Task 2: Create the Stats page, curve component, and UI tests

**Files:**
- Create: `src/features/stats/EquityCurve.tsx`
- Create: `src/features/stats/StatsPage.tsx`
- Create: `src/features/stats/StatsPage.test.tsx`

**Interfaces:**
- Consumes: `buildStatsSnapshot`, `StatsRange`, `StatsSnapshot`, and `EquityPoint` from `src/domain/stats.ts`; `Trade` from `src/domain/trade.ts`.
- Produces:

```ts
export interface StatsRepository { listAll(): Promise<Trade[]> }
export function StatsPage({ repository }: { repository?: StatsRepository }): JSX.Element
export function EquityCurve({ points, maxDrawdown }: {
  points: EquityPoint[]
  maxDrawdown: number | null
}): JSX.Element
```

- [ ] **Step 1: Write the failing page tests.**

Create `src/features/stats/StatsPage.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Trade } from '../../domain/trade'
import { StatsPage } from './StatsPage'

const makeTrade = (id: string, result: number, rMultiple: number, ticker = 'MNQ'): Trade => ({
  id, tradeDate: '2026-11-04', templateVersion: 1, ticker, side: 'Long', session: 'New York AM',
  volatilityDriver: '', result, rMultiple, slides: [], createdAt: `2026-11-04T0${id}:00:00.000Z`, updatedAt: '2026-11-04T10:00:00.000Z',
})

describe('StatsPage', () => {
  it('renders a low-noise snapshot with N, curve summary, and no process-tracking controls', async () => {
    render(<StatsPage repository={{ listAll: vi.fn().mockResolvedValue([
      makeTrade('1', 100, 1), makeTrade('2', -50, -0.5), makeTrade('3', 75, 0.75),
    ]) }} />)

    expect(screen.getByText('Loading stats…')).toBeVisible()
    expect(await screen.findByText('Net P&L')).toBeVisible()
    expect(screen.getByText('N closed trades: 3')).toBeVisible()
    expect(screen.getByText('Expectancy')).toBeVisible()
    expect(screen.getByRole('img', { name: /Equity curve/i })).toBeVisible()
    expect(screen.queryByText(/rule compliance|planned risk|daily target/i)).not.toBeInTheDocument()
  })

  it('recalculates a scoped snapshot when the 30D control is selected', async () => {
    const user = userEvent.setup()
    render(<StatsPage repository={{ listAll: vi.fn().mockResolvedValue([
      { ...makeTrade('old', 500, 5), tradeDate: '2026-01-01' }, makeTrade('new', 25, 0.25),
    ]) }} />)

    await screen.findByText('$525.00')
    await user.click(screen.getByRole('button', { name: '30D' }))
    expect(await screen.findByText('$25.00')).toBeVisible()
  })

  it('shows the group threshold note and retries a failed repository read', async () => {
    const retry = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([
      makeTrade('1', 10, 1), makeTrade('2', 10, 1), makeTrade('3', 10, 1), makeTrade('4', 10, 1),
    ])
    const user = userEvent.setup()
    render(<StatsPage repository={{ listAll: retry }} />)

    expect(await screen.findByText('Could not load stats.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findAllByText('Appears after 5 logged trades in one group.')).toHaveLength(2)
    expect(retry).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run the page tests and confirm the expected missing-module failure.**

Run:

```bash
npm test -- src/features/stats/StatsPage.test.tsx
```

Expected: FAIL because `./StatsPage` does not exist.

- [ ] **Step 3: Implement the accessible curve component.**

Create `src/features/stats/EquityCurve.tsx`:

```tsx
import type { EquityPoint } from '../../domain/stats'

export function EquityCurve({ points, maxDrawdown }: { points: EquityPoint[]; maxDrawdown: number | null }) {
  if (!points.length) return <p className="stats-empty-copy">Log a result on a trade to see your equity curve.</p>
  const values = points.map((point) => point.cumulativePnl)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const span = max - min || 1
  const polyline = points.map((point, index) => {
    const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100
    const y = 100 - ((point.cumulativePnl - min) / span) * 100
    return `${x},${y}`
  }).join(' ')
  const end = values.at(-1) ?? 0
  const drawdown = maxDrawdown ?? 0
  return <>
    <svg className="stats-equity-curve" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Equity curve. Start $0.00, end $${end.toFixed(2)}, maximum drawdown $${drawdown.toFixed(2)}.`}>
      <polyline points={polyline} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
    <p className="sr-only">Start $0.00, end ${end.toFixed(2)}, maximum drawdown ${drawdown.toFixed(2)}.</p>
  </>
}
```

- [ ] **Step 4: Implement StatsPage with fetch, retry, range, metrics, and tables.**

Create `src/features/stats/StatsPage.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Trade } from '../../domain/trade'
import { buildStatsSnapshot, type BreakdownRow, type SampleMetric, type StatsRange } from '../../domain/stats'
import { defaultRepository } from '../../data/trade-repository'
import { EquityCurve } from './EquityCurve'

export interface StatsRepository { listAll(): Promise<Trade[]> }
const ranges: StatsRange[] = ['30D', '90D', 'ALL']
const money = (value: number | null) => value === null ? '—' : `${value < 0 ? '-$' : '$'}${Math.abs(value).toFixed(2)}`
const rValue = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}R`
const ratio = (value: number | null, suffix = '') => value === null ? '—' : `${value.toFixed(2)}${suffix}`

function Metric({ label, metric, format, primary = false }: { label: string; metric: SampleMetric; format: (value: number | null) => string; primary?: boolean }) {
  return <section className={`stats-metric ${primary ? 'stats-metric-primary' : ''}`} aria-label={label}>
    <p>{label}</p><strong>{format(metric.value)}</strong>
    <small>N {label === 'Expectancy' ? 'trades with R' : 'closed trades'}: {metric.sampleSize}</small>
  </section>
}

function Breakdown({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  return <section className="stats-breakdown" aria-labelledby={`${title}-heading`}>
    <h2 id={`${title}-heading`}>{title}</h2>
    {!rows.length ? <p className="stats-threshold-note">Appears after 5 logged trades in one group.</p> : <div className="stats-table-wrap"><table>
      <thead><tr><th>Group</th><th>N</th><th>Net P&amp;L</th><th>Expectancy R</th><th>Win rate</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.name}><th scope="row">{row.name}</th><td>{row.resultSampleSize}</td><td>{money(row.netPnl)}</td><td>{rValue(row.expectancyR)} <span className="stats-r-sample">R n={row.rSampleSize}</span></td><td>{ratio(row.winRate, '%')}</td></tr>)}</tbody>
    </table></div>}
  </section>
}

export function StatsPage({ repository = defaultRepository }: { repository?: StatsRepository }) {
  const [trades, setTrades] = useState<Trade[] | null>(null)
  const [error, setError] = useState(false)
  const [range, setRange] = useState<StatsRange>('ALL')
  const load = useCallback(async () => {
    setError(false); setTrades(null)
    try { setTrades(await repository.listAll()) } catch { setError(true) }
  }, [repository])
  useEffect(() => { void load() }, [load])
  const snapshot = useMemo(() => trades ? buildStatsSnapshot(trades, range) : null, [trades, range])
  if (error) return <div className="stats-page"><p className="stats-error">Could not load stats.</p><button type="button" onClick={() => void load()}>Retry</button></div>
  if (!snapshot) return <div className="stats-page"><p>Loading stats…</p></div>
  return <div className="stats-page">
    <header className="stats-header"><div><h1>Stats</h1><p>A compact review of logged outcomes.</p></div><div className="stats-range-control" aria-label="Stats date range">{ranges.map((item) => <button key={item} type="button" aria-pressed={range === item} className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{item}</button>)}</div></header>
    <section className="stats-metric-grid" aria-label="Performance summary">
      <Metric label="Net P&L" metric={snapshot.netPnl} format={money} primary />
      <Metric label="Expectancy" metric={snapshot.expectancyR} format={rValue} primary />
      <Metric label="Profit Factor" metric={snapshot.profitFactor} format={ratio} />
      <Metric label="Win Rate" metric={snapshot.winRate} format={(value) => ratio(value, '%')} />
      <Metric label="Max Drawdown" metric={snapshot.maxDrawdown} format={(value) => value === null ? '—' : money(Math.abs(value))} primary />
      <Metric label="Largest Loss" metric={snapshot.largestLoss} format={(value) => value === null ? '—' : money(-Math.abs(value))} />
    </section>
    <section className="stats-curve-section" aria-labelledby="equity-curve-heading"><div><h2 id="equity-curve-heading">Equity curve</h2><p>N closed trades: {snapshot.resultTradeCount}</p></div><EquityCurve points={snapshot.equityCurve} maxDrawdown={snapshot.maxDrawdown.value} /></section>
    <Breakdown title="By ticker" rows={snapshot.tickerBreakdown} />
    <Breakdown title="By session" rows={snapshot.sessionBreakdown} />
  </div>
}
```

- [ ] **Step 5: Run the page tests and fix only the failures they expose.**

Run:

```bash
npm test -- src/features/stats/StatsPage.test.tsx
```

Expected: all three tests pass. The error test confirms retry performs a second `listAll()` call; the threshold test confirms both tables suppress four-trade groups.

- [ ] **Step 6: Record the no-Git checkpoint.**

Run:

```bash
find src/features/stats -maxdepth 1 -type f -print | sort
```

Expected: `EquityCurve.tsx`, `StatsPage.tsx`, and `StatsPage.test.tsx` exist. Do not commit because this workspace has no Git repository.

---

### Task 3: Wire navigation, apply responsive styling, and verify the real route

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/features/shell/Sidebar.test.tsx`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: `StatsPage` from `src/features/stats/StatsPage.tsx`.
- Produces: `/stats` is a valid route, linked by the existing sidebar `NavLink`; all stats content adapts to a narrow viewport without page-level horizontal overflow.

- [ ] **Step 1: Extend the sidebar regression test before route work.**

Replace `src/features/shell/Sidebar.test.tsx` with:

```tsx
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { Sidebar } from './Sidebar'

it('shows Stonk Journal navigation and New Trade', () => {
  render(<MemoryRouter initialEntries={['/stats']}><Sidebar /></MemoryRouter>)
  expect(screen.getByRole('link', { name: /Calendar/i })).toBeVisible()
  expect(screen.getByRole('link', { name: /Dashboard/i })).toBeVisible()
  expect(screen.getByRole('link', { name: /Stats/i })).toBeVisible()
  expect(screen.getByRole('link', { name: /New Trade/i })).toBeVisible()
  expect(screen.getByRole('link', { name: /Stats/i })).toHaveClass('bg-accent-blue/10')
})
```

- [ ] **Step 2: Run the sidebar test to establish the active-nav baseline.**

Run:

```bash
npm test -- src/features/shell/Sidebar.test.tsx
```

Expected: PASS. The existing sidebar already exposes `/stats`; this test locks it in while the route is added.

- [ ] **Step 3: Add the route to the app router.**

Apply this exact change in `src/App.tsx`:

```tsx
import { StatsPage } from './features/stats/StatsPage'

// Insert with the existing routes inside <AppShell>:
<Route path="/stats" element={<StatsPage />} />
```

The complete ordered route block must include:

```tsx
<Route path="/calendar" element={<CalendarPage />} />
<Route path="/dashboard" element={<DayDashboardPage />} />
<Route path="/stats" element={<StatsPage />} />
<Route path="/calculator" element={<CalculatorPage />} />
<Route path="/trades/new" element={<TradeEditor />} />
<Route path="/trades/:tradeId" element={<TradeEditor />} />
```

- [ ] **Step 4: Add the complete Stats style block to `src/styles/app.css`.**

Append this CSS:

```css
.stats-page { width: min(1120px, 100%); margin: 0 auto; padding: 1.5rem; color: var(--text-main); }
.stats-header { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
.stats-header h1 { margin: 0; color: var(--text-strong); font-size: 1.5rem; letter-spacing: -0.02em; }
.stats-header p, .stats-curve-section p, .stats-threshold-note, .stats-metric small { margin: .3rem 0 0; color: var(--text-muted); font-size: .75rem; }
.stats-range-control { display: inline-flex; padding: .2rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-panel); }
.stats-range-control button { border: 0; border-radius: 6px; background: transparent; color: var(--text-muted); padding: .38rem .6rem; font: inherit; font-size: .75rem; cursor: pointer; }
.stats-range-control button.active { background: rgba(79, 165, 255, .16); color: var(--text-strong); }
.stats-metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid var(--border); border-left: 1px solid var(--border); }
.stats-metric { min-height: 116px; padding: 1rem; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); background: var(--bg-panel); }
.stats-metric p { margin: 0; color: var(--text-muted); font-size: .75rem; }
.stats-metric strong { display: block; margin-top: .6rem; color: var(--text-strong); font-size: 1.18rem; font-variant-numeric: tabular-nums; }
.stats-metric-primary strong { font-size: 1.4rem; }
.stats-curve-section, .stats-breakdown { margin-top: 1.5rem; padding: 1rem; border: 1px solid var(--border); background: var(--bg-panel); }
.stats-curve-section h2, .stats-breakdown h2 { margin: 0; color: var(--text-strong); font-size: .9rem; }
.stats-equity-curve { display: block; width: 100%; height: 210px; margin-top: 1rem; overflow: visible; }
.stats-equity-curve polyline { stroke: var(--accent-blue); stroke-width: 2.25; }
.stats-empty-copy, .stats-error { margin: 1rem 0; color: var(--text-muted); }
.stats-table-wrap { overflow-x: auto; margin-top: .75rem; }
.stats-breakdown table { width: 100%; min-width: 620px; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.stats-breakdown th, .stats-breakdown td { padding: .7rem .5rem; border-bottom: 1px solid var(--border); text-align: right; white-space: nowrap; }
.stats-breakdown th:first-child { text-align: left; color: var(--text-strong); }
.stats-breakdown thead th { color: var(--text-muted); font-size: .7rem; font-weight: 600; }
.stats-r-sample { color: var(--text-muted); font-size: .7rem; }
@media (max-width: 720px) { .stats-page { padding: 1rem; } .stats-header { align-items: flex-start; flex-direction: column; } .stats-metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .stats-metric { min-height: 100px; padding: .8rem; } }
```

- [ ] **Step 5: Run the full automated suite and production build.**

Run:

```bash
npm test
npm run build
```

Expected: all existing tests plus new stats tests pass; TypeScript and Vite build exit 0.

- [ ] **Step 6: Verify `/stats` in the actual browser surface.**

Run the app:

```bash
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/stats` with the browser automation tool. Verify visually:

1. Sidebar **Stats** is blue/active and the page heading is visible.
2. Empty local data produces `Log a result on a trade to see your equity curve.` instead of invented zero performance.
3. No process/rules/compliance fields appear.
4. At a narrow viewport, summary metrics are two columns and the table wrapper—not the document—scrolls horizontally.

Stop the dev server after inspection. Expected: no browser console error and no blank surface.

- [ ] **Step 7: Record the no-Git delivery checkpoint.**

Run:

```bash
rg -n 'path="/stats"|StatsPage|stats-page' src/App.tsx src/features/shell/Sidebar.tsx src/styles/app.css
```

Expected: route, persistent navigation destination, and stats styling are all present. Do not commit because the workspace has no Git repository.

## Plan Self-Review

- **Spec coverage:** Task 1 implements every data rule, date boundary, statistical definition, N/sample count, drawdown/equity sequence, and group threshold, and anchors Profit Factor/drawdown mechanics to the local Deltalytix clone. Task 2 implements loading, retry, empty, regular, accessible-curve, date-control, metric, and table states. Task 3 wires the sidebar route, responsive visual treatment, full test/build checks, and browser verification.
- **Placeholder scan:** no deferred implementation wording, unspecified tests, or vague handling directives appear in the tasks.
- **Type consistency:** `StatsRange`, `SampleMetric`, `EquityPoint`, `BreakdownRow`, `StatsSnapshot`, `buildStatsSnapshot`, and `StatsRepository` are declared before the tasks that consume them; `StatsPage` and `EquityCurve` use exactly those names.
