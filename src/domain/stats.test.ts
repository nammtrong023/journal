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
    expect(snapshot.expectancyR.sampleSize).toBe(4)
    expect(snapshot.expectancyR.value).toBeCloseTo(0.1)
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

  it('calculates full statistics, win rate, and equity curve in R when trades have no dollar result', () => {
    const rTrades = [
      trade({ id: 'r1', tradeDate: '2026-11-01', createdAt: '2026-11-01T09:00:00Z', result: undefined, rMultiple: 2 }),
      trade({ id: 'r2', tradeDate: '2026-11-02', createdAt: '2026-11-02T09:00:00Z', result: undefined, rMultiple: -1 }),
      trade({ id: 'r3', tradeDate: '2026-11-03', createdAt: '2026-11-03T09:00:00Z', result: undefined, rMultiple: 1.5 }),
    ]
    const snapshot = buildStatsSnapshot(rTrades, 'ALL', at)

    expect(snapshot.resultTradeCount).toBe(3)
    expect(snapshot.winRate).toEqual({ value: (2 / 3) * 100, sampleSize: 3 })
    expect(snapshot.expectancyR.value).toBeCloseTo(0.833, 2)
    expect(snapshot.profitFactor).toEqual({ value: 3.5 / 1, sampleSize: 3 })
    expect(snapshot.largestLoss).toEqual({ value: 1, sampleSize: 3 })
    expect(snapshot.equityCurve.map(({ cumulativePnl }) => cumulativePnl)).toEqual([2, 1, 2.5])
  })
})
