import { Trade } from './trade'
import { DEFAULT_EMOTIONS, EmotionTag } from './emotions'

export interface EmotionStatRow {
  emotionId: string
  label: string
  emoji: string
  category: 'positive' | 'neutral' | 'tilt'
  tradeCount: number
  winCount: number
  lossCount: number
  breakevenCount: number
  winRate: number
  netPnL: number
  netR: number
}

export interface EmotionStatsSummary {
  costOfTilt: number
  costOfTiltR: number
  tiltTradesCount: number
  rows: EmotionStatRow[]
  topEdge: EmotionStatRow | null
  topLeak: EmotionStatRow | null
}

const MIN_SAMPLE_SIZE = 3

export function computeEmotionStats(
  trades: Trade[],
  allEmotions: EmotionTag[] = DEFAULT_EMOTIONS
): EmotionStatsSummary {
  const closedTrades = trades.filter(
    (t) =>
      (typeof t.result === 'number' && Number.isFinite(t.result)) ||
      (typeof t.rMultiple === 'number' && Number.isFinite(t.rMultiple))
  )

  const tiltEmotionIds = new Set(
    allEmotions.filter((e) => e.category === 'tilt').map((e) => e.id)
  )

  let costOfTilt = 0
  let costOfTiltR = 0
  let tiltTradesCount = 0

  for (const trade of closedTrades) {
    if (!trade.emotions || trade.emotions.length === 0) continue
    const hasTilt = trade.emotions.some((id) => tiltEmotionIds.has(id))
    if (hasTilt) {
      tiltTradesCount++
      if (typeof trade.result === 'number' && trade.result < 0) {
        costOfTilt += Math.abs(trade.result)
      }
      if (typeof trade.rMultiple === 'number' && trade.rMultiple < 0) {
        costOfTiltR += Math.abs(trade.rMultiple)
      }
    }
  }

  costOfTiltR = Math.round(costOfTiltR * 100) / 100

  const rows: EmotionStatRow[] = allEmotions
    .map((emotion) => {
      const taggedTrades = closedTrades.filter((t) => t.emotions?.includes(emotion.id))
      const tradeCount = taggedTrades.length
      if (tradeCount === 0) {
        return {
          emotionId: emotion.id,
          label: emotion.label,
          emoji: emotion.emoji,
          category: emotion.category,
          tradeCount: 0,
          winCount: 0,
          lossCount: 0,
          breakevenCount: 0,
          winRate: 0,
          netPnL: 0,
          netR: 0,
        }
      }

      let winCount = 0
      let lossCount = 0
      let breakevenCount = 0
      let netPnL = 0
      let netR = 0

      for (const t of taggedTrades) {
        const res = typeof t.result === 'number' && Number.isFinite(t.result) ? t.result : 0
        const r = typeof t.rMultiple === 'number' && Number.isFinite(t.rMultiple) ? t.rMultiple : 0
        netPnL += res
        netR += r

        const metricVal = typeof t.rMultiple === 'number' && Number.isFinite(t.rMultiple) ? t.rMultiple : res
        if (metricVal > 0) winCount++
        else if (metricVal < 0) lossCount++
        else breakevenCount++
      }

      const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0
      netR = Math.round(netR * 100) / 100

      return {
        emotionId: emotion.id,
        label: emotion.label,
        emoji: emotion.emoji,
        category: emotion.category,
        tradeCount,
        winCount,
        lossCount,
        breakevenCount,
        winRate,
        netPnL,
        netR,
      }
    })
    .filter((row) => row.tradeCount > 0)
    .sort((a, b) => {
      if (b.netR !== a.netR) return b.netR - a.netR
      return b.netPnL - a.netPnL
    })

  const qualifiedRows = rows.filter((r) => r.tradeCount >= MIN_SAMPLE_SIZE)
  const topEdge =
    qualifiedRows.length > 0 && (qualifiedRows[0].netR > 0 || qualifiedRows[0].netPnL > 0)
      ? qualifiedRows[0]
      : null
  const topLeak =
    qualifiedRows.length > 0 &&
    (qualifiedRows[qualifiedRows.length - 1].netR < 0 || qualifiedRows[qualifiedRows.length - 1].netPnL < 0)
      ? qualifiedRows[qualifiedRows.length - 1]
      : null

  return {
    costOfTilt,
    costOfTiltR,
    tiltTradesCount,
    rows,
    topEdge,
    topLeak,
  }
}
