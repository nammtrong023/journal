import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { X, ArrowRight, Plus, Edit2 } from 'lucide-react'
import { Trade } from '../../domain/trade'

interface DaySlideoverProps {
  date: string
  trades: Trade[]
  onClose: () => void
}

export function DaySlideover({ date, trades, onClose }: DaySlideoverProps) {
  const navigate = useNavigate()
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const dateObj = parseISO(date)
  const fullDateLabel = format(dateObj, 'MMMM d, yyyy')

  useEffect(() => {
    closeBtnRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const tradesWithR = trades.filter(
    (t) => t.rMultiple !== undefined && Number.isFinite(t.rMultiple)
  )
  const totalDayR =
    tradesWithR.length > 0
      ? Math.round(tradesWithR.reduce((sum, t) => sum + (t.rMultiple || 0), 0) * 100) / 100
      : undefined

  const isDayPositive = totalDayR !== undefined && totalDayR > 0
  const isDayNegative = totalDayR !== undefined && totalDayR < 0

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex justify-end transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-bg-main border-l border-border flex flex-col shadow-2xl overflow-hidden transition-transform animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-label={fullDateLabel}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-panel shrink-0 select-none">
          <div>
            <h3 className="text-base font-bold text-text-strong tracking-tight">
              {fullDateLabel}
            </h3>
            <span className="text-xs text-text-muted mt-0.5 block">
              {trades.length === 0
                ? 'No trades recorded'
                : `${trades.length} ${trades.length === 1 ? 'trade' : 'trades'} recorded`}
            </span>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            className="w-8 h-8 rounded-md flex items-center justify-center text-text-muted hover:text-text-strong hover:bg-white/[0.05] transition-colors cursor-pointer"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Day Aggregate RR Bar if trades exist */}
          {totalDayR !== undefined ? (
            <div className="p-3.5 rounded-lg border border-border bg-bg-panel flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Day Net RR</span>
              <span
                className="text-base font-bold tabular-nums"
                style={{
                  color: isDayPositive
                    ? 'var(--color-accent-green)'
                    : isDayNegative
                    ? 'var(--color-accent-red)'
                    : 'var(--color-text-muted)',
                }}
              >
                {isDayPositive ? `+${totalDayR}R` : `${totalDayR}R`}
              </span>
            </div>
          ) : trades.length > 0 ? (
            <div className="p-3.5 rounded-lg border border-border bg-bg-panel flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Trades Logged</span>
              <span className="text-base font-bold text-text-strong">
                {trades.length}
              </span>
            </div>
          ) : null}

          {trades.length > 0 ? (
            <div className="space-y-2.5">
              {trades.map((trade) => {
                const hasR = trade.rMultiple !== undefined && Number.isFinite(trade.rMultiple)
                const isTradePositive = hasR
                  ? (trade.rMultiple || 0) > 0
                  : (trade.result || 0) > 0
                const isTradeNegative = hasR
                  ? (trade.rMultiple || 0) < 0
                  : (trade.result || 0) < 0

                return (
                  <div
                    key={trade.id}
                    onClick={() => {
                      onClose()
                      navigate(`/dashboard?date=${trade.tradeDate || date}`)
                    }}
                    role="button"
                    aria-label={`View ${trade.ticker} in dashboard`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onClose()
                        navigate(`/dashboard?date=${trade.tradeDate || date}`)
                      }
                    }}
                    className="block p-4 rounded-lg border border-border bg-bg-panel hover:border-accent-blue/50 hover:bg-white/[0.02] transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-text-strong tracking-tight group-hover:text-accent-blue transition-colors">
                          {trade.ticker}
                        </span>
                        {trade.side && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              trade.side === 'Long'
                                ? 'bg-accent-green/15 text-accent-green'
                                : 'bg-accent-red/15 text-accent-red'
                            }`}
                          >
                            {trade.side}
                          </span>
                        )}
                        {trade.session && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/[0.05] text-text-muted">
                            {trade.session}
                          </span>
                        )}
                      </div>

                      {hasR ? (
                        <span
                          className="text-sm font-bold tabular-nums"
                          style={{
                            color: isTradePositive
                              ? 'var(--color-accent-green)'
                              : isTradeNegative
                              ? 'var(--color-accent-red)'
                              : 'var(--color-text-muted)',
                          }}
                        >
                          {(trade.rMultiple || 0) > 0
                            ? `+${trade.rMultiple}R`
                            : `${trade.rMultiple}R`}
                        </span>
                      ) : trade.result !== undefined ? (
                        <span
                          className="text-sm font-bold tabular-nums"
                          style={{
                            color: isTradePositive
                              ? 'var(--color-accent-green)'
                              : isTradeNegative
                              ? 'var(--color-accent-red)'
                              : 'var(--color-text-muted)',
                          }}
                        >
                          {trade.result >= 0
                            ? `+$${trade.result.toFixed(2)}`
                            : `-$${Math.abs(trade.result).toFixed(2)}`}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                      <span className="text-[11px] text-text-muted/80">View in dashboard</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onClose()
                          navigate(`/trades/${trade.id}`)
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-blue hover:text-white px-2 py-0.5 rounded hover:bg-accent-blue/20 transition-all cursor-pointer"
                        title="Edit trade"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 px-4 rounded-lg border border-dashed border-border bg-bg-panel/40">
              <p className="text-sm font-medium text-text-muted mb-1">
                No trades logged for this date.
              </p>
              <p className="text-xs text-text-muted/70 mb-4">
                Record your setups, context, and execution recaps.
              </p>
              <Link
                to={`/trades/new?date=${date}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue/90 transition-colors shadow-sm"
              >
                <Plus size={14} />
                <span>Log Trade</span>
              </Link>
            </div>
          )}
        </div>

        {/* Drawer Actions */}
        <div className="p-4 border-t border-border bg-bg-panel space-y-2 shrink-0">
          <Link
            to={`/dashboard?date=${date}`}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-border text-xs font-medium text-text-strong transition-colors"
          >
            <span>Go to Dashboard for this day</span>
            <ArrowRight size={14} />
          </Link>

          <Link
            to={`/trades/new?date=${date}`}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-lg bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue/90 transition-colors shadow-sm"
          >
            <Plus size={14} />
            <span>New Trade</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
