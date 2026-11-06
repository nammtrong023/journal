import { format, parseISO } from 'date-fns'
import { DaySummary } from './calendar-model'

interface MonthGridProps {
  daySummaries: DaySummary[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export function MonthGrid({ daySummaries, selectedDate, onSelectDate }: MonthGridProps) {
  // Chunk daySummaries into weeks of 7
  const weeks: DaySummary[][] = []
  for (let i = 0; i < daySummaries.length; i += 7) {
    weeks.push(daySummaries.slice(i, i + 7))
  }

  return (
    <div className="rounded-lg overflow-hidden flex flex-col flex-1 h-full min-h-[580px]">
      {/* Weekday Column Headers */}
      <div className="flex bg-bg-main sm:gap-2 pb-1.5 select-none shrink-0">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="flex-1 min-w-0 text-center text-[11px] font-semibold text-text-muted uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
        <div className="hidden sm:block w-20 shrink-0 text-center text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          WEEK
        </div>
      </div>

      {/* Week Rows */}
      <div className="flex flex-col flex-1 sm:gap-2 h-[calc(100%-24px)]">
        {weeks.map((week, weekIdx) => {
          let weekR: number | undefined
          let weekTradeCount = 0
          const daysWithR = week.filter((d) => d.totalR !== undefined)
          if (daysWithR.length > 0) {
            const sumR = daysWithR.reduce((sum, d) => sum + (d.totalR || 0), 0)
            weekR = Math.round(sumR * 100) / 100
          }
          for (const d of week) {
            weekTradeCount += d.trades.length
          }

          const weekHasData = weekR !== undefined
          const isPositiveWeek = weekR !== undefined && weekR > 0
          const isNegativeWeek = weekR !== undefined && weekR < 0

          return (
            <div key={weekIdx} className="flex flex-1 min-h-[92px] sm:gap-2">
              {week.map((summary) => {
                const dateObj = parseISO(summary.date)
                const dayNumber = format(dateObj, 'd')
                const fullDateLabel = format(dateObj, 'MMMM d, yyyy')
                const isSelected = selectedDate === summary.date
                const hasTrades = summary.trades.length > 0
                const hasR = summary.totalR !== undefined
                const rVal = summary.totalR
                const isPositive = rVal !== undefined && rVal > 0
                const isNegative = rVal !== undefined && rVal < 0

                let cellBg = 'var(--bg-panel)'
                let cellBorder = '1px solid var(--border)'

                if (!summary.isCurrentMonth) {
                  cellBg = 'var(--bg-muted)'
                  cellBorder = '1px solid var(--border-subtle)'
                } else if (hasR && isPositive) {
                  cellBg = 'rgba(74, 222, 128, 0.08)'
                  cellBorder = '1px solid rgba(74, 222, 128, 0.25)'
                } else if (hasR && isNegative) {
                  cellBg = 'rgba(248, 113, 113, 0.08)'
                  cellBorder = '1px solid rgba(248, 113, 113, 0.25)'
                }

                return (
                  <button
                    key={summary.date}
                    type="button"
                    aria-label={fullDateLabel}
                    onClick={() => onSelectDate(summary.date)}
                    className={`flex-1 min-w-0 h-full p-2.5 transition-all cursor-pointer overflow-hidden sm:rounded-lg text-left flex flex-col justify-between select-none ${
                      !summary.isCurrentMonth ? 'opacity-40' : 'hover:border-text-muted/50'
                    } ${
                      isSelected
                        ? 'ring-2 ring-accent-blue border-accent-blue z-10'
                        : ''
                    }`}
                    style={{
                      backgroundColor: cellBg,
                      border: isSelected
                        ? '1px solid var(--accent-blue)'
                        : cellBorder,
                    }}
                  >
                    <div className="flex items-center justify-between w-full shrink-0">
                      <span
                        className={`text-xs font-mono font-medium flex items-center gap-1.5 ${
                          summary.isToday
                            ? 'text-accent-blue font-bold'
                            : !summary.isCurrentMonth
                            ? 'text-text-muted/60'
                            : 'text-text-muted'
                        }`}
                      >
                        <span>{dayNumber}</span>
                        {summary.isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent-blue inline-block" />
                        )}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center w-full -mt-2">
                      {hasR && rVal !== undefined ? (
                        <>
                          <div
                            className="text-base sm:text-lg font-bold font-mono tracking-tight truncate tabular-nums leading-tight"
                            style={{
                              color: isPositive
                                ? 'var(--accent-green)'
                                : isNegative
                                ? 'var(--accent-red)'
                                : 'var(--text-muted)',
                            }}
                          >
                            {isPositive ? `+${rVal}R` : `${rVal}R`}
                          </div>
                          <span className="text-[10px] sm:text-[11px] text-text-muted font-medium leading-none mt-1">
                            {summary.trades.length}{' '}
                            {summary.trades.length === 1 ? 'trade' : 'trades'}
                          </span>
                        </>
                      ) : hasTrades ? (
                        <div className="text-[11px] text-accent-blue font-medium">
                          {summary.trades.length}{' '}
                          {summary.trades.length === 1 ? 'trade' : 'trades'}
                        </div>
                      ) : null}
                    </div>
                  </button>
                )
              })}

              {/* Week Column Summary Cell */}
              <div
                className="hidden sm:flex w-20 shrink-0 h-full p-2.5 overflow-hidden sm:rounded-lg flex-col items-center justify-center transition-all select-none"
                style={{
                  backgroundColor: weekHasData
                    ? isPositiveWeek
                      ? 'rgba(74, 222, 128, 0.06)'
                      : isNegativeWeek
                      ? 'rgba(248, 113, 113, 0.06)'
                      : 'var(--bg-panel)'
                    : 'var(--bg-panel)',
                  border: weekHasData
                    ? isPositiveWeek
                      ? '1px solid rgba(74, 222, 128, 0.2)'
                      : isNegativeWeek
                      ? '1px solid rgba(248, 113, 113, 0.2)'
                      : '1px solid var(--border)'
                    : '1px solid var(--border)',
                }}
              >
                {weekHasData && weekR !== undefined ? (
                  <div className="flex flex-col items-center justify-center">
                    <div
                      className="text-xs sm:text-sm font-bold font-mono truncate w-full text-center tabular-nums leading-tight"
                      style={{
                        color: isPositiveWeek
                          ? 'var(--accent-green)'
                          : isNegativeWeek
                          ? 'var(--accent-red)'
                          : 'var(--text-muted)',
                      }}
                    >
                      {isPositiveWeek ? `+${weekR}R` : `${weekR}R`}
                    </div>
                    {weekTradeCount > 0 && (
                      <span className="text-[10px] text-text-muted font-medium leading-none mt-1">
                        {weekTradeCount} {weekTradeCount === 1 ? 'trade' : 'trades'}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] text-text-muted/60 font-medium font-mono">—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
