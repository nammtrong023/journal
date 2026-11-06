import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  TrendingUp,
  Percent,
  Activity,
  ArrowDownRight,
  Shield,
  Sparkles,
  AlertOctagon,
} from 'lucide-react'
import type { Trade } from '../../domain/trade'
import {
  buildStatsSnapshot,
  inRange,
  type BreakdownRow,
  type SampleMetric,
  type StatsRange,
} from '../../domain/stats'
import { computeEmotionStats } from '../../domain/emotion-stats'
import { defaultRepository } from '../../data/trade-repository'
import { EquityCurve } from './EquityCurve'

export interface StatsRepository {
  listAll(): Promise<Trade[]>
}

const ranges: StatsRange[] = ['30D', '90D', 'ALL']

const money = (value: number | null) =>
  value === null ? '—' : `${value < 0 ? '-$' : '$'}${Math.abs(value).toFixed(2)}`
const lossMoney = (value: number | null) => (value === null ? '—' : `$${Math.abs(value).toFixed(2)}`)
const rValue = (value: number | null) =>
  value === null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}R`
const ratio = (value: number | null, suffix = '') =>
  value === null ? '—' : `${value.toFixed(2)}${suffix}`

interface MetricProps {
  label: string
  metric: SampleMetric
  format: (value: number | null) => string
  emphasis?: 'gain' | 'loss' | 'neutral'
  icon?: React.ReactNode
}

function Metric({ label, metric, format, emphasis = 'neutral', icon }: MetricProps) {
  const isGain = emphasis === 'gain' && metric.value !== null && metric.value > 0
  const isLoss = (emphasis === 'loss' && metric.value !== null && metric.value > 0) ||
                 (emphasis === 'gain' && metric.value !== null && metric.value < 0)

  return (
    <section
      className="stats-metric bg-bg-panel border border-border rounded-lg p-4 sm:p-5 flex flex-col justify-between hover:border-text-muted/40 transition-all shadow-sm select-none"
      aria-label={label}
      data-emphasis={emphasis}
      data-empty={metric.value === null}
    >
      <div className="flex items-center justify-between text-text-muted mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted m-0">
          {label}
        </p>
        {icon && <div className="text-text-muted/60">{icon}</div>}
      </div>

      <div className="my-1">
        <strong
          className={`block text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums ${
            isGain
              ? 'text-accent-green'
              : isLoss
              ? 'text-accent-red'
              : 'text-text-strong'
          }`}
        >
          {format(metric.value)}
        </strong>
      </div>

      <small className="text-[11px] text-text-muted/80 mt-1 font-mono block">
        N {label === 'Expectancy' ? 'trades with R' : 'closed trades'}: {metric.sampleSize}
      </small>
    </section>
  )
}

function Breakdown({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  const headingId = `${title.toLowerCase().replace(/ /g, '-')}-heading`

  return (
    <section
      className="stats-breakdown bg-bg-panel border border-border rounded-lg p-5 flex flex-col shadow-sm"
      aria-labelledby={headingId}
    >
      <div className="stats-section-heading flex items-baseline justify-between border-b border-border/70 pb-3 mb-3">
        <h2 id={headingId} className="text-sm sm:text-base font-bold text-text-strong tracking-tight m-0">
          {title}
        </h2>
        <p className="text-[11px] text-text-muted m-0">
          Only groups with 5+ closed trades are shown.
        </p>
      </div>

      {!rows.length ? (
        <div className="flex items-center justify-center min-h-[140px] p-4 text-center">
          <p className="stats-threshold-note text-xs text-text-muted m-0">
            Appears after 5 logged trades in one group.
          </p>
        </div>
      ) : (
        <div className="stats-table-wrap overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse tabular-nums">
            <thead>
              <tr className="border-b border-border/80 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                <th className="py-2.5 px-3 font-semibold text-text-muted">Group</th>
                <th className="py-2.5 px-3 text-right font-semibold text-text-muted">N</th>
                <th className="py-2.5 px-3 text-right font-semibold text-text-muted">Net P&amp;L</th>
                <th className="py-2.5 px-3 text-right font-semibold text-text-muted">Expectancy R</th>
                <th className="py-2.5 px-3 text-right font-semibold text-text-muted">Win rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.map((row) => (
                <tr key={row.name} className="hover:bg-white/[0.02] transition-colors">
                  <th scope="row" className="py-2.5 px-3 font-medium text-text-strong font-mono">
                    {row.name}
                  </th>
                  <td className="py-2.5 px-3 text-right text-text-muted">
                    {row.resultSampleSize}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-semibold font-mono ${
                      row.netPnl < 0
                        ? 'stats-loss text-accent-red'
                        : row.netPnl > 0
                        ? 'stats-gain text-accent-green'
                        : 'text-text-strong'
                    }`}
                  >
                    {money(row.netPnl)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-text-strong">
                    {rValue(row.expectancyR)}{' '}
                    <span className="stats-r-sample text-[10px] text-text-muted ml-1">
                      R n={row.rSampleSize}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-text-strong font-mono">
                    {ratio(row.winRate, '%')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function StatsPage({ repository = defaultRepository }: { repository?: StatsRepository }) {
  const [trades, setTrades] = useState<Trade[] | null>(null)
  const [error, setError] = useState(false)
  const [range, setRange] = useState<StatsRange>('ALL')

  const load = useCallback(async () => {
    setError(false)
    setTrades(null)
    try {
      setTrades(await repository.listAll())
    } catch {
      setError(true)
    }
  }, [repository])

  useEffect(() => {
    void load()
  }, [load])

  // Silent refresh when background sync pulls newer remote trades
  useEffect(() => {
    const refresh = () => {
      repository.listAll().then(setTrades).catch(() => {})
    }
    window.addEventListener('trades-changed', refresh)
    return () => window.removeEventListener('trades-changed', refresh)
  }, [repository])

  const snapshot = useMemo(
    () => (trades ? buildStatsSnapshot(trades, range) : null),
    [trades, range],
  )

  const scopedTrades = useMemo(
    () => (trades ? trades.filter((t) => inRange(t, range)) : []),
    [trades, range],
  )

  const emotionStats = useMemo(
    () => computeEmotionStats(scopedTrades),
    [scopedTrades],
  )

  if (error) {
    return (
      <div className="stats-page stats-feedback flex-1 flex flex-col items-center justify-center min-h-[360px] p-8 text-center select-none gap-3">
        <p className="stats-error text-sm text-accent-red font-medium">Could not load stats.</p>
        <button
          type="button"
          className="stats-retry px-4 py-2 text-xs font-semibold rounded-md bg-accent-blue/15 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/25 transition-colors cursor-pointer"
          onClick={() => void load()}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="stats-page stats-feedback flex-1 flex flex-col items-center justify-center min-h-[360px] p-8 text-center text-text-muted gap-3">
        <div className="w-6 h-6 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
        <p className="text-xs">Loading stats…</p>
      </div>
    )
  }

  return (
    <div className="stats-page flex-1 flex flex-col p-4 lg:p-6 lg:px-8 space-y-5 max-w-[1440px] mx-auto w-full">
      {/* Header with Title and Range Tabs */}
      <header className="stats-header flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-border/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-strong tracking-tight m-0">
            Stats
          </h1>
          <p className="text-xs text-text-muted mt-1 m-0">
            A compact review of logged outcomes.
          </p>
        </div>

        {/* Range Segmented Control */}
        <div
          className="stats-range-control inline-flex p-1 bg-bg-panel border border-border rounded-lg gap-1 select-none"
          aria-label="Stats date range"
        >
          {ranges.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={range === item}
              className={`stats-range-btn px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                range === item
                  ? 'active bg-accent-blue text-white shadow-sm'
                  : 'text-text-muted hover:text-text-strong hover:bg-white/[0.05]'
              }`}
              onClick={() => setRange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      {/* 6 Core Performance Metrics Grid (Clean 3x2) */}
      <section
        className="stats-metric-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
        aria-label="Performance summary"
      >
        <Metric
          label="Net P&L"
          metric={snapshot.netPnl}
          format={money}
          emphasis="gain"
          icon={<TrendingUp size={16} />}
        />
        <Metric
          label="Expectancy"
          metric={snapshot.expectancyR}
          format={rValue}
          emphasis="gain"
          icon={<Activity size={16} />}
        />
        <Metric
          label="Profit Factor"
          metric={snapshot.profitFactor}
          format={ratio}
          icon={<Sparkles size={16} />}
        />
        <Metric
          label="Win Rate"
          metric={snapshot.winRate}
          format={(value) => ratio(value, '%')}
          icon={<Percent size={16} />}
        />
        <Metric
          label="Max Drawdown"
          metric={snapshot.maxDrawdown}
          format={lossMoney}
          emphasis="loss"
          icon={<ArrowDownRight size={16} />}
        />
        <Metric
          label="Largest Loss"
          metric={snapshot.largestLoss}
          format={lossMoney}
          emphasis="loss"
          icon={<Shield size={16} />}
        />
      </section>

      {/* Equity Curve Chart Section */}
      <section
        className="stats-curve-section bg-bg-panel border border-border rounded-lg p-4 sm:p-5 flex flex-col gap-3 shadow-sm"
        aria-labelledby="equity-curve-heading"
      >
        <div className="stats-section-heading flex items-center justify-between border-b border-border/70 pb-3">
          <h2 id="equity-curve-heading" className="text-sm sm:text-base font-bold text-text-strong tracking-tight m-0">
            Equity curve
          </h2>
          <p className="text-xs text-text-muted m-0 font-mono">
            N closed trades: {snapshot.resultTradeCount}
          </p>
        </div>

        <EquityCurve
          points={snapshot.equityCurve}
          maxDrawdown={snapshot.maxDrawdown.value}
        />
      </section>

      {/* Ticker and Session Breakdown Tables */}
      <div className="stats-breakdown-grid grid grid-cols-1 lg:grid-cols-2 gap-4 pb-1">
        <Breakdown title="By ticker" rows={snapshot.tickerBreakdown} />
        <Breakdown title="By session" rows={snapshot.sessionBreakdown} />
      </div>

      {/* Emotion Performance Breakdown */}
      <section
        className="stats-breakdown bg-bg-panel border border-border rounded-lg p-5 flex flex-col shadow-sm mb-4"
        aria-labelledby="emotion-breakdown-heading"
      >
        <div className="stats-section-heading flex items-baseline justify-between border-b border-border/70 pb-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 id="emotion-breakdown-heading" className="text-sm sm:text-base font-bold text-text-strong tracking-tight m-0">
              Emotion Performance
            </h2>
            {emotionStats.topEdge && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green border border-accent-green/20">
                Top Edge: {emotionStats.topEdge.emoji} {emotionStats.topEdge.label}
              </span>
            )}
            {emotionStats.topLeak && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20">
                Top Leak: {emotionStats.topLeak.emoji} {emotionStats.topLeak.label}
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-muted m-0">
            Performance grouped by logged emotion tags.
          </p>
        </div>

        {/* Cost of Tilt Behavioral Highlight Card */}
        <div className="mb-4">
          <section
            className="stats-card bg-bg-muted/70 border border-border/80 rounded-lg p-4 flex items-center justify-between hover:border-accent-red/30 transition-all select-none"
            aria-label="Cost of Tilt"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red shrink-0">
                <AlertOctagon size={16} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted m-0">
                  Cost of Tilt
                </p>
                <small className="text-[11px] text-text-muted/80 font-mono block">
                  Losses across {emotionStats.tiltTradesCount} tilt trades
                </small>
              </div>
            </div>
            <div className="text-right">
              <strong className="block text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums text-accent-red">
                {emotionStats.costOfTilt > 0
                  ? `-$${emotionStats.costOfTilt.toLocaleString()}`
                  : emotionStats.costOfTiltR > 0
                  ? `-${emotionStats.costOfTiltR}R`
                  : '$0'}
              </strong>
            </div>
          </section>
        </div>

        {emotionStats.rows.length === 0 ? (
          <div className="flex items-center justify-center min-h-[100px] p-4 text-center">
            <p className="stats-threshold-note text-xs text-text-muted m-0">
              No emotion tags recorded for trades in this range.
            </p>
          </div>
        ) : (
          <div className="stats-table-wrap overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-border/80 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="py-2.5 px-3 font-semibold text-text-muted">Emotion</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-text-muted">Trades</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-text-muted">Win Rate</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-text-muted">Net RR</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-text-muted">Net P&amp;L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {emotionStats.rows.map((row) => (
                  <tr key={row.emotionId} className="hover:bg-white/[0.02] transition-colors">
                    <th scope="row" className="py-2.5 px-3 font-medium text-text-strong font-mono flex items-center gap-1.5">
                      <span>{row.emoji}</span>
                      <span>{row.label}</span>
                    </th>
                    <td className="py-2.5 px-3 text-right text-text-muted">
                      {row.tradeCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-text-strong font-mono">
                      {row.winRate.toFixed(1)}%
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-semibold font-mono ${
                        row.netR < 0
                          ? 'stats-loss text-accent-red'
                          : row.netR > 0
                          ? 'stats-gain text-accent-green'
                          : 'text-text-muted'
                      }`}
                    >
                      {row.netR > 0 ? `+${row.netR.toFixed(2)}R` : `${row.netR.toFixed(2)}R`}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-semibold font-mono ${
                        row.netPnL < 0
                          ? 'stats-loss text-accent-red'
                          : row.netPnL > 0
                          ? 'stats-gain text-accent-green'
                          : 'text-text-strong'
                      }`}
                    >
                      {money(row.netPnL)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
