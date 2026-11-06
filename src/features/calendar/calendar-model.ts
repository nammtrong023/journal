import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  format,
  isSameMonth,
  isSameDay,
  parseISO,
} from 'date-fns'
import { Trade } from '../../domain/trade'

export interface DaySummary {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  trades: Trade[]
  totalPnl?: number
  totalR?: number
}

export function calendarDays(monthDate: Date): string[] {
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday first

  // 35 days (5 weeks) if it covers the entire month, otherwise 42 days (6 weeks)
  const days35End = addDays(startDate, 34)
  const totalDays = days35End >= monthEnd ? 35 : 42

  const days: string[] = []
  let curr = startDate
  for (let i = 0; i < totalDays; i++) {
    days.push(format(curr, 'yyyy-MM-dd'))
    curr = addDays(curr, 1)
  }

  return days
}

export function buildDaySummaries(
  days: string[],
  activeMonth: Date,
  trades: Trade[]
): DaySummary[] {
  const tradesByDate = new Map<string, Trade[]>()
  for (const trade of trades) {
    const list = tradesByDate.get(trade.tradeDate) || []
    list.push(trade)
    tradesByDate.set(trade.tradeDate, list)
  }

  const today = new Date()

  return days.map((dateStr) => {
    const dateObj = parseISO(dateStr)
    const dayTrades = tradesByDate.get(dateStr) || []

    let totalPnl: number | undefined
    const tradesWithResult = dayTrades.filter((t) => t.result !== undefined)
    if (tradesWithResult.length > 0) {
      totalPnl = tradesWithResult.reduce((sum, t) => sum + (t.result || 0), 0)
    }

    let totalR: number | undefined
    const tradesWithR = dayTrades.filter(
      (t) => t.rMultiple !== undefined && Number.isFinite(t.rMultiple)
    )
    if (tradesWithR.length > 0) {
      const sumR = tradesWithR.reduce((sum, t) => sum + (t.rMultiple || 0), 0)
      totalR = Math.round(sumR * 100) / 100
    }

    return {
      date: dateStr,
      isCurrentMonth: isSameMonth(dateObj, activeMonth),
      isToday: isSameDay(dateObj, today),
      trades: dayTrades,
      totalPnl,
      totalR,
    }
  })
}
