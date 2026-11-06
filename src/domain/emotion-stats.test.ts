import { describe, it, expect } from 'vitest'
import { Trade } from './trade'
import { computeEmotionStats } from './emotion-stats'

function makeMockTrade(result: number | undefined, emotions: string[]): Trade {
  return {
    id: 'mock-' + Math.random(),
    tradeDate: '2026-11-06',
    templateVersion: 1,
    ticker: 'NQ',
    side: 'Long',
    session: 'NY AM',
    volatilityDriver: '',
    result,
    emotions,
    slides: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

describe('computeEmotionStats', () => {
  it('calculates Cost of Tilt and deduplicates losing trades with multiple tilt tags', () => {
    const trades: Trade[] = [
      makeMockTrade(-200, ['frustrated', 'revenge_trading']), // Tilt loss: $200
      makeMockTrade(-100, ['impulsive']),                      // Tilt loss: $100
      makeMockTrade(500, ['revenge_trading']),                // Tilt win: ignored for cost of tilt
      makeMockTrade(-150, ['tired']),                          // Neutral loss: not tilt
      makeMockTrade(300, ['disciplined', 'focused']),          // Positive win
    ]

    const stats = computeEmotionStats(trades)
    // Cost of Tilt should be 200 + 100 = 300 (not 200 + 200 + 100 = 500)
    expect(stats.costOfTilt).toBe(300)
    expect(stats.tiltTradesCount).toBe(3)
  })

  it('aggregates per-emotion stats correctly', () => {
    const trades: Trade[] = [
      makeMockTrade(200, ['calm']),
      makeMockTrade(100, ['calm']),
      makeMockTrade(-50, ['calm']),
    ]

    const stats = computeEmotionStats(trades)
    const calmRow = stats.rows.find((r) => r.emotionId === 'calm')
    expect(calmRow).toBeDefined()
    expect(calmRow?.tradeCount).toBe(3)
    expect(calmRow?.winCount).toBe(2)
    expect(calmRow?.netPnL).toBe(250)
    expect(calmRow?.winRate).toBeCloseTo(66.67, 1)
  })

  it('identifies top edge and top leak when threshold (N >= 3) is met', () => {
    const trades: Trade[] = [
      makeMockTrade(100, ['disciplined']),
      makeMockTrade(200, ['disciplined']),
      makeMockTrade(150, ['disciplined']),
      makeMockTrade(-200, ['revenge_trading']),
      makeMockTrade(-300, ['revenge_trading']),
      makeMockTrade(-100, ['revenge_trading']),
    ]

    const stats = computeEmotionStats(trades)
    expect(stats.topEdge?.emotionId).toBe('disciplined')
    expect(stats.topLeak?.emotionId).toBe('revenge_trading')
  })

  it('calculates Cost of Tilt and emotion stats for trades tracked only in R (no dollar result)', () => {
    const trades: Trade[] = [
      { ...makeMockTrade(undefined, ['revenge_trading']), rMultiple: -1 },
      { ...makeMockTrade(undefined, ['revenge_trading']), rMultiple: -2 },
      { ...makeMockTrade(undefined, ['revenge_trading']), rMultiple: -0.5 },
      { ...makeMockTrade(undefined, ['calm']), rMultiple: 2 },
      { ...makeMockTrade(undefined, ['calm']), rMultiple: 1.5 },
      { ...makeMockTrade(undefined, ['calm']), rMultiple: 3 },
    ]

    const stats = computeEmotionStats(trades)
    expect(stats.costOfTiltR).toBe(3.5)
    expect(stats.tiltTradesCount).toBe(3)
    expect(stats.topEdge?.emotionId).toBe('calm')
    expect(stats.topEdge?.netR).toBe(6.5)
    expect(stats.topLeak?.emotionId).toBe('revenge_trading')
    expect(stats.topLeak?.netR).toBe(-3.5)
  })
})
