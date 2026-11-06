import type { EquityPoint } from '../../domain/stats'

interface EquityCurveProps {
  points: EquityPoint[]
  maxDrawdown: number | null
}

export function EquityCurve({ points, maxDrawdown }: EquityCurveProps) {
  if (!points.length) {
    return (
      <div className="stats-empty-copy flex flex-col items-center justify-center min-h-[220px] p-6 text-center text-text-muted">
        <p className="text-xs sm:text-sm font-medium">
          Log a result on a trade to see your equity curve.
        </p>
      </div>
    )
  }

  const values = points.map((point) => point.cumulativePnl)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const span = max - min || 1
  const zeroY = 100 - ((0 - min) / span) * 100

  const polylineCoords = points.map((point, index) => {
    const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100
    const y = 100 - ((point.cumulativePnl - min) / span) * 100
    return { x, y }
  })

  const polyline = polylineCoords.map((c) => `${c.x},${c.y}`).join(' ')

  // Form area fill polygon
  const firstX = polylineCoords[0].x
  const lastX = polylineCoords[polylineCoords.length - 1].x
  const polygonPoints = `${firstX},${zeroY} ${polyline} ${lastX},${zeroY}`

  const end = values[values.length - 1] ?? 0
  const drawdown = maxDrawdown ?? 0
  const endLabel = `${end < 0 ? '-$' : '$'}${Math.abs(end).toFixed(2)}`

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-3 text-xs select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 rounded-full bg-accent-blue" />
            <span className="text-text-muted text-[11px] font-medium">Cumulative P&amp;L</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-px border-t border-dashed border-border" />
            <span className="text-text-muted text-[11px] font-medium">Zero Baseline</span>
          </div>
        </div>
      </div>

      <div className="w-full h-[240px] sm:h-[270px] bg-[#161822] border border-border/80 rounded-lg p-3 relative overflow-hidden flex flex-col justify-center">
        <svg
          className="stats-equity-curve w-full h-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Equity curve. Start $0.00, end ${endLabel}, maximum drawdown $${drawdown.toFixed(2)}.`}
        >
          <defs>
            <linearGradient id="equity-area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.25" />
              <stop offset="85%" stopColor="var(--accent-blue)" stopOpacity="0.02" />
              <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Zero Baseline */}
          <line
            className="stats-curve-baseline"
            x1="0"
            x2="100"
            y1={zeroY}
            y2={zeroY}
            stroke="var(--border)"
            strokeDasharray="3 3"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />

          {/* Area Fill */}
          <polygon
            points={polygonPoints}
            fill="url(#equity-area-gradient)"
          />

          {/* Curve Polyline */}
          <polyline
            points={polyline}
            fill="none"
            stroke="var(--accent-blue)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <p className="sr-only">Start $0.00, end {endLabel}, maximum drawdown ${drawdown.toFixed(2)}.</p>
    </div>
  )
}
