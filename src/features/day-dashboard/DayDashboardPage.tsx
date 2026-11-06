import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { format, parseISO, isValid, addDays, subDays } from 'date-fns'
import {
  ArrowLeft,
  Plus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react'
import { Trade } from '../../domain/trade'
import { TradeRepository, defaultRepository } from '../../data/trade-repository'
import { DEFAULT_EMOTIONS } from '../../domain/emotions'
import { TradeRecapRow } from './TradeRecapRow'

interface DayDashboardPageProps {
  repository?: TradeRepository
}

export function DayDashboardPage({ repository = defaultRepository }: DayDashboardPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const dateParam = searchParams.get('date') || todayStr

  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedEmotionFilter, setSelectedEmotionFilter] = useState<string>('all')

  useEffect(() => {
    let isCancelled = false
    setLoading(true)

    repository.listByDate(dateParam).then((result) => {
      if (!isCancelled) {
        setTrades(result)
        setLoading(false)
      }
    })

    // Silent refresh when background sync pulls newer remote trades
    const refresh = () => {
      repository.listByDate(dateParam).then((result) => {
        if (!isCancelled) setTrades(result)
      }).catch(() => {})
    }
    window.addEventListener('trades-changed', refresh)

    return () => {
      isCancelled = true
      window.removeEventListener('trades-changed', refresh)
    }
  }, [dateParam, repository])

  const parsedDate = parseISO(dateParam)
  const isDateValid = isValid(parsedDate)
  const currentDateObj = isDateValid ? parsedDate : new Date()

  const formattedDate = isDateValid
    ? format(parsedDate, 'MMMM d, yyyy')
    : dateParam

  const formattedWeekday = isDateValid ? format(parsedDate, 'EEEE') : ''

  // Navigate to previous or next day
  const handlePrevDay = () => {
    const prev = subDays(currentDateObj, 1)
    setSearchParams({ date: format(prev, 'yyyy-MM-dd') })
  }

  const handleNextDay = () => {
    const next = addDays(currentDateObj, 1)
    setSearchParams({ date: format(next, 'yyyy-MM-dd') })
  }

  const handleToday = () => {
    setSearchParams({ date: todayStr })
  }

  // Calculate day summary metrics
  const closedTrades = trades.filter(
    (t) =>
      (typeof t.result === 'number' && Number.isFinite(t.result)) ||
      (typeof t.rMultiple === 'number' && Number.isFinite(t.rMultiple))
  )
  const hasDollarPnl = trades.some((t) => typeof t.result === 'number' && Number.isFinite(t.result))
  const totalPnl = trades.reduce((sum, t) => sum + (t.result || 0), 0)
  const isPnlPositive = totalPnl >= 0
  const wins = closedTrades.filter((t) =>
    typeof t.rMultiple === 'number' && Number.isFinite(t.rMultiple)
      ? t.rMultiple > 0
      : (t.result || 0) > 0
  ).length
  const losses = closedTrades.filter((t) =>
    typeof t.rMultiple === 'number' && Number.isFinite(t.rMultiple)
      ? t.rMultiple < 0
      : (t.result || 0) < 0
  ).length
  const winRate =
    wins + losses > 0 ? `${((wins / (wins + losses)) * 100).toFixed(0)}%` : '—'
  const totalR = trades
    .filter((t) => typeof t.rMultiple === 'number' && Number.isFinite(t.rMultiple))
    .reduce((sum, t) => sum + (t.rMultiple || 0), 0)

  const displayedTrades = trades.filter((trade) =>
    selectedEmotionFilter === 'all' ? true : trade.emotions?.includes(selectedEmotionFilter)
  )

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 lg:px-8 space-y-5 h-full min-h-0 min-w-0 max-w-[1440px] mx-auto w-full">
      {/* Top Navigation & Toolbar Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/calendar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-text-muted hover:text-text-strong hover:bg-white/[0.04] border border-border transition-colors select-none"
            title="Return to Calendar view"
          >
            <ArrowLeft size={14} />
            <span>Calendar</span>
          </Link>

          {/* Date Selector Navigation */}
          <div className="flex items-center gap-1 bg-bg-panel border border-border rounded-md p-0.5 select-none">
            <button
              type="button"
              onClick={handlePrevDay}
              className="flex items-center justify-center w-7 h-7 rounded text-text-muted hover:text-text-strong hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Previous day"
            >
              <ChevronLeft size={15} />
            </button>

            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-medium rounded text-text-muted hover:text-text-strong hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              Today
            </button>

            <button
              type="button"
              onClick={handleNextDay}
              className="flex items-center justify-center w-7 h-7 rounded text-text-muted hover:text-text-strong hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Next day"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {trades.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="emotion-filter" className="text-xs text-text-muted">
                Filter by Emotion:
              </label>
              <select
                id="emotion-filter"
                aria-label="Filter by Emotion"
                value={selectedEmotionFilter}
                onChange={(e) => setSelectedEmotionFilter(e.target.value)}
                className="bg-bg-panel border border-border rounded px-2 py-1 text-xs text-text-strong"
              >
                <option value="all">All Emotions</option>
                {DEFAULT_EMOTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.emoji} {item.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action Button */}
          <Link
            to={`/trades/new?date=${dateParam}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-accent-blue text-white hover:brightness-110 active:scale-[0.98] transition-all shadow-sm select-none"
          >
            <Plus size={15} />
            <span>New Trade</span>
          </Link>
        </div>
      </div>

      {/* Main Day Header Card with KPIs */}
      <div className="bg-bg-panel border border-border rounded-lg p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue shrink-0">
            <CalendarDays size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-text-strong tracking-tight">
                {formattedDate}
              </h1>
              {formattedWeekday && (
                <span className="text-xs px-2 py-0.5 rounded bg-bg-muted text-text-muted border border-border/60 font-medium">
                  {formattedWeekday}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {trades.length} {trades.length === 1 ? 'trade' : 'trades'} logged for this session
            </p>
          </div>
        </div>

        {/* Day Summary Metrics */}
        {trades.length > 0 && (
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-border/50 text-xs tabular-nums select-none">
            {hasDollarPnl && (
              <>
                <div className="flex flex-col">
                  <span className="text-text-muted text-[11px] uppercase tracking-wider font-medium">
                    Day P&L
                  </span>
                  <span
                    className={`text-base sm:text-lg font-bold ${
                      isPnlPositive ? 'text-accent-green' : 'text-accent-red'
                    }`}
                  >
                    {totalPnl !== 0
                      ? totalPnl > 0
                        ? `+$${totalPnl.toFixed(2)}`
                        : `-$${Math.abs(totalPnl).toFixed(2)}`
                      : '$0.00'}
                  </span>
                </div>
                <div className="h-7 w-px bg-border/60 hidden sm:block" />
              </>
            )}

            <div className="flex flex-col">
              <span className="text-text-muted text-[11px] uppercase tracking-wider font-medium">
                Day Net RR
              </span>
              <span
                className={`text-base sm:text-lg font-bold font-mono ${
                  totalR > 0
                    ? 'text-accent-green'
                    : totalR < 0
                    ? 'text-accent-red'
                    : 'text-text-strong'
                }`}
              >
                {totalR > 0 ? `+${totalR.toFixed(2)}R` : `${totalR.toFixed(2)}R`}
              </span>
            </div>

            <div className="h-7 w-px bg-border/60 hidden sm:block" />

            <div className="flex flex-col">
              <span className="text-text-muted text-[11px] uppercase tracking-wider font-medium">
                Win Rate
              </span>
              <span className="text-sm sm:text-base font-semibold text-text-strong">
                {winRate}{' '}
                <span className="text-xs font-normal text-text-muted">
                  ({wins}W · {losses}L)
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] bg-bg-panel border border-border rounded-lg text-text-muted gap-3">
          <div className="w-6 h-6 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          <span className="text-xs">Loading day recaps...</span>
        </div>
      ) : trades.length > 0 ? (
        displayedTrades.length > 0 ? (
          <div className="flex flex-col space-y-4 pb-6">
            {displayedTrades.map((trade) => (
              <TradeRecapRow
                key={trade.id}
                trade={trade}
                repository={repository}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] bg-bg-panel border border-border rounded-lg text-text-muted">
            <p className="text-xs">No trades match the selected emotion filter.</p>
          </div>
        )
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[360px] bg-bg-panel border border-border border-dashed rounded-lg p-8 text-center select-none">
          <div className="w-14 h-14 rounded-2xl bg-bg-muted border border-border flex items-center justify-center text-text-muted mb-4 shadow-inner">
            <Layers size={24} className="text-text-muted/70" />
          </div>
          <h3 className="text-base font-semibold text-text-strong mb-1">
            No trades recorded for this day
          </h3>
          <p className="text-xs text-text-muted max-w-[360px] mb-6 leading-relaxed">
            Record execution slides, entry/exit screenshots, R-multiples, and notes to analyze your performance.
          </p>
          <Link
            to={`/trades/new?date=${dateParam}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-accent-blue text-white hover:brightness-110 active:scale-[0.98] transition-all shadow-sm"
          >
            <Plus size={16} />
            <span>New Trade</span>
          </Link>
        </div>
      )}
    </div>
  )
}
