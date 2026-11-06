import { format, subDays } from 'date-fns'
import type { Trade } from './trade'

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

const hasFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export function inRange(trade: Trade, range: StatsRange, referenceDate: Date = new Date()): boolean {
  if (range === 'ALL') return true

  const days = range === '30D' ? 30 : 90
  const end = format(referenceDate, 'yyyy-MM-dd')
  const start = format(subDays(referenceDate, days - 1), 'yyyy-MM-dd')
  return trade.tradeDate >= start && trade.tradeDate <= end
}

function orderedResultTrades(trades: Trade[]): Trade[] {
  return trades
    .filter((trade) => hasFiniteNumber(trade.result))
    .sort((a, b) =>
      a.tradeDate.localeCompare(b.tradeDate) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
    )
}

function orderedRTrades(trades: Trade[]): Trade[] {
  return trades
    .filter((trade) => hasFiniteNumber(trade.rMultiple))
    .sort((a, b) =>
      a.tradeDate.localeCompare(b.tradeDate) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id),
    )
}

function buildBreakdown(trades: Trade[], key: 'ticker' | 'session'): BreakdownRow[] {
  const groups = new Map<string, Trade[]>()

  for (const trade of trades) {
    if (!hasFiniteNumber(trade.result) && !hasFiniteNumber(trade.rMultiple)) continue
    const name = trade[key].trim() || 'Unspecified'
    groups.set(name, [...(groups.get(name) ?? []), trade])
  }

  return [...groups.entries()]
    .filter(([, group]) => group.length >= 5)
    .map(([name, group]) => {
      const results = group.map((trade) => trade.result).filter(hasFiniteNumber)
      const rValues = group.map((trade) => trade.rMultiple).filter(hasFiniteNumber)
      const wins = results.length
        ? results.filter((value) => value > 0).length
        : rValues.filter((value) => value > 0).length
      const totalSample = results.length || rValues.length

      return {
        name,
        resultSampleSize: totalSample,
        rSampleSize: rValues.length,
        netPnl: results.reduce((sum, value) => sum + value, 0),
        expectancyR: rValues.length
          ? rValues.reduce((sum, value) => sum + value, 0) / rValues.length
          : null,
        winRate: totalSample ? (wins / totalSample) * 100 : null,
      }
    })
    .sort((a, b) => b.netPnl - a.netPnl || a.name.localeCompare(b.name))
}

export function buildStatsSnapshot(
  trades: Trade[],
  range: StatsRange,
  referenceDate = new Date(),
): StatsSnapshot {
  const scopedTrades = trades.filter((trade) => inRange(trade, range, referenceDate))
  const resultTrades = orderedResultTrades(scopedTrades)
  const results = resultTrades.map((trade) => trade.result as number)
  const rValues = scopedTrades.map((trade) => trade.rMultiple).filter(hasFiniteNumber)

  const hasResults = results.length > 0

  // Gross-profit / gross-loss
  const grossProfit = results
    .filter((value) => value > 0)
    .reduce((sum, value) => sum + value, 0)
  const grossLoss = Math.abs(
    results.filter((value) => value < 0).reduce((sum, value) => sum + value, 0),
  )
  const largestLoss = results
    .filter((value) => value < 0)
    .reduce<number | null>(
      (worst, value) => (worst === null ? Math.abs(value) : Math.max(worst, Math.abs(value))),
      null,
    )

  // R-based calculations if no dollar results exist
  const rGrossProfit = rValues
    .filter((value) => value > 0)
    .reduce((sum, value) => sum + value, 0)
  const rGrossLoss = Math.abs(
    rValues.filter((value) => value < 0).reduce((sum, value) => sum + value, 0),
  )
  const rLargestLoss = rValues
    .filter((value) => value < 0)
    .reduce<number | null>(
      (worst, value) => (worst === null ? Math.abs(value) : Math.max(worst, Math.abs(value))),
      null,
    )

  // Peak-to-trough drawdown loop
  let cumulativePnl = 0
  let peakPnl = 0
  let maxDrawdown = 0

  const activeCurveTrades = hasResults ? resultTrades : orderedRTrades(scopedTrades)
  const equityCurve = activeCurveTrades.map((trade) => {
    const val = hasResults ? (trade.result as number) : (trade.rMultiple as number)
    cumulativePnl += val
    peakPnl = Math.max(peakPnl, cumulativePnl)
    maxDrawdown = Math.max(maxDrawdown, peakPnl - cumulativePnl)
    return { tradeId: trade.id, tradeDate: trade.tradeDate, cumulativePnl }
  })

  const wins = hasResults
    ? results.filter((value) => value > 0).length
    : rValues.filter((value) => value > 0).length
  const primarySampleSize = hasResults ? results.length : rValues.length

  const profitFactorVal = hasResults
    ? (grossLoss > 0 ? grossProfit / grossLoss : null)
    : (rGrossLoss > 0 ? rGrossProfit / rGrossLoss : null)

  const largestLossVal = hasResults ? largestLoss : rLargestLoss
  const maxDrawdownVal = primarySampleSize > 0 ? maxDrawdown : null

  return {
    resultTradeCount: primarySampleSize,
    netPnl: {
      value: hasResults ? results.reduce((sum, value) => sum + value, 0) : null,
      sampleSize: primarySampleSize,
    },
    expectancyR: {
      value: rValues.length ? rValues.reduce((sum, value) => sum + value, 0) / rValues.length : null,
      sampleSize: rValues.length,
    },
    profitFactor: {
      value: profitFactorVal,
      sampleSize: primarySampleSize,
    },
    winRate: {
      value: primarySampleSize > 0 ? (wins / primarySampleSize) * 100 : null,
      sampleSize: primarySampleSize,
    },
    maxDrawdown: {
      value: maxDrawdownVal,
      sampleSize: primarySampleSize,
    },
    largestLoss: {
      value: largestLossVal,
      sampleSize: primarySampleSize,
    },
    equityCurve,
    tickerBreakdown: buildBreakdown(scopedTrades, 'ticker'),
    sessionBreakdown: buildBreakdown(scopedTrades, 'session'),
  }
}
