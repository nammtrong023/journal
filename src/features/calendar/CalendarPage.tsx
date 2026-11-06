import { useState, useEffect, useCallback } from 'react'
import { format, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { Trade } from '../../domain/trade'
import { TradeRepository, defaultRepository } from '../../data/trade-repository'
import { calendarDays, buildDaySummaries } from './calendar-model'
import { MonthGrid } from './MonthGrid'
import { DaySlideover } from './DaySlideover'

interface CalendarPageProps {
  repository?: TradeRepository
  initialMonth?: Date
}

export function CalendarPage({
  repository = defaultRepository,
  initialMonth = new Date(),
}: CalendarPageProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth)
  const [trades, setTrades] = useState<Trade[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDayTrades, setSelectedDayTrades] = useState<Trade[]>([])

  const loadAllTrades = useCallback(async () => {
    try {
      const all = await repository.listAll()
      setTrades(all)
    } catch (err) {
      console.error('Failed to load trades:', err)
    }
  }, [repository])

  useEffect(() => {
    loadAllTrades()
    const handleTradesChanged = () => {
      loadAllTrades()
    }
    window.addEventListener('trades-changed', handleTradesChanged)
    return () => {
      window.removeEventListener('trades-changed', handleTradesChanged)
    }
  }, [loadAllTrades])

  const handleDateSelect = async (date: string) => {
    setSelectedDate(date)
    try {
      const dayTrades = await repository.listByDate(date)
      setSelectedDayTrades(dayTrades)
    } catch (err) {
      console.error('Failed to load day trades:', err)
      setSelectedDayTrades([])
    }
  }

  const handleCloseSlideover = () => {
    setSelectedDate(null)
    setSelectedDayTrades([])
  }

  const days = calendarDays(currentMonth)
  const daySummaries = buildDaySummaries(days, currentMonth, trades)

  // Month-level statistics matching RR / Performance reference
  const monthTrades = trades.filter((t) => {
    try {
      const d = parseISO(t.tradeDate)
      return isSameMonth(d, currentMonth)
    } catch {
      return false
    }
  })

  const tradesWithR = monthTrades.filter(
    (t) => t.rMultiple !== undefined && Number.isFinite(t.rMultiple)
  )
  const wins = monthTrades.filter((t) =>
    t.rMultiple !== undefined ? t.rMultiple > 0 : (t.result || 0) > 0
  ).length
  const losses = monthTrades.filter((t) =>
    t.rMultiple !== undefined ? t.rMultiple < 0 : (t.result || 0) < 0
  ).length
  const winRateStr =
    wins + losses > 0 ? `${((wins / (wins + losses)) * 100).toFixed(0)}%` : '—'

  const grossWinR = tradesWithR
    .filter((t) => (t.rMultiple || 0) > 0)
    .reduce((sum, t) => sum + (t.rMultiple || 0), 0)
  const grossLossR = Math.abs(
    tradesWithR
      .filter((t) => (t.rMultiple || 0) < 0)
      .reduce((sum, t) => sum + (t.rMultiple || 0), 0)
  )

  const profitFactorStr =
    grossLossR > 0
      ? (grossWinR / grossLossR).toFixed(2)
      : grossWinR > 0
      ? '∞'
      : '—'

  const monthTotalR = tradesWithR.reduce((sum, t) => sum + (t.rMultiple || 0), 0)
  const roundedMonthTotalR = Math.round(monthTotalR * 100) / 100
  const isMonthPositive = roundedMonthTotalR > 0
  const isMonthNegative = roundedMonthTotalR < 0
  const monthRFormatted =
    tradesWithR.length > 0
      ? isMonthPositive
        ? `+${roundedMonthTotalR}R`
        : `${roundedMonthTotalR}R`
      : '0R'
  const rColor = isMonthPositive
    ? 'var(--accent-green)'
    : isMonthNegative
    ? 'var(--accent-red)'
    : 'var(--text-muted)'

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 lg:px-8 space-y-4 h-full min-h-0 min-w-0">
      {/* Calendar Toolbar & KPI Row */}
      <div className="flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1 bg-bg-panel border border-border rounded-md p-0.5">
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/[0.05] transition-colors cursor-pointer text-text-muted hover:text-text-strong"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              className="text-sm font-semibold text-text-strong min-w-[130px] sm:min-w-[160px] text-center inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded hover:bg-white/[0.05] transition-colors cursor-pointer select-none"
              aria-label={`${format(currentMonth, 'MMMM yyyy')} — click to pick a different month`}
            >
              <span>{format(currentMonth, 'MMMM yyyy')}</span>
              <ChevronDown size={14} className="text-text-muted shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="flex items-center justify-center w-7 h-7 rounded hover:bg-white/[0.05] transition-colors cursor-pointer text-text-muted hover:text-text-strong"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1.5 text-xs font-medium rounded text-text-muted hover:text-text-strong transition-colors bg-bg-panel border border-border cursor-pointer select-none hover:bg-white/[0.04]"
          >
            Today
          </button>
        </div>

        {/* Right side stats summary bar */}
        <div className="flex items-center gap-3 sm:gap-5 text-sm select-none">
          <div className="hidden sm:flex items-center gap-4 tabular-nums text-xs">
            <div className="flex items-baseline gap-1.5">
              <span className="text-text-muted">Trades</span>
              <span className="font-semibold text-text-strong font-mono">
                {monthTrades.length}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-text-muted">Win rate</span>
              <span className="font-semibold text-text-strong font-mono">{winRateStr}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-text-muted">Record</span>
              <span className="font-semibold font-mono">
                <span className="text-accent-green">{wins}W</span>
                <span className="text-text-muted mx-0.5">·</span>
                <span className="text-accent-red">{losses}L</span>
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-text-muted">Profit factor</span>
              <span className="font-semibold text-text-strong font-mono">
                {profitFactorStr}
              </span>
            </div>
          </div>

          <div className="flex items-baseline px-2.5 py-1 rounded bg-bg-panel border border-border">
            <span className="text-text-muted mr-2 hidden sm:inline text-xs font-medium">
              Month RR:
            </span>
            <span
              className="font-bold text-sm font-mono tabular-nums"
              style={{ color: rColor }}
            >
              {monthRFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* Main Month Grid with 7 days + Week column */}
      <MonthGrid
        daySummaries={daySummaries}
        selectedDate={selectedDate}
        onSelectDate={handleDateSelect}
      />

      {/* Day Slideover Drawer */}
      {selectedDate && (
        <DaySlideover
          date={selectedDate}
          trades={selectedDayTrades}
          onClose={handleCloseSlideover}
        />
      )}
    </div>
  )
}
