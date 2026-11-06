export type TimeframeTier = 'htf' | 'mtf' | 'ltf' | 'default'

export function getTimeframeTier(tf: string): TimeframeTier {
  const raw = tf.trim()
  if (!raw) return 'default'
  const lower = raw.toLowerCase()

  // HTF: Monthly, Weekly, Daily, etc.
  if (
    /^(monthly|month|weekly|week|daily|day)$/i.test(lower) ||
    /^(1w|w|1d|d)$/i.test(lower) ||
    /^(1M|M|MN)$/.test(raw)
  ) {
    return 'htf'
  }

  // MTF: 4h, 2h, 1h, 30m, 60m, 8h, 12h
  if (/^(4h|h4|2h|h2|1h|h1|60m|m60|30m|m30|8h|h8|12h|h12)$/i.test(lower)) {
    return 'mtf'
  }

  // LTF: 15m, 10m, 5m, 3m, 2m, 1m, seconds, or small minutes
  if (
    /^(15m|m15|10m|m10|5m|m5|3m|m3|2m|m2|1m|m1|\d+s)$/i.test(lower) ||
    /^[1-5]$/.test(lower)
  ) {
    return 'ltf'
  }

  return 'default'
}

const TIER_STYLES: Record<TimeframeTier, { bg: string; text: string; border: string }> = {
  htf: {
    bg: 'bg-indigo-500/25',
    text: 'text-white',
    border: 'border-indigo-400/50',
  },
  mtf: {
    bg: 'bg-sky-500/25',
    text: 'text-white',
    border: 'border-sky-400/50',
  },
  ltf: {
    bg: 'bg-amber-500/25',
    text: 'text-white',
    border: 'border-amber-400/50',
  },
  default: {
    bg: 'bg-white/15',
    text: 'text-white',
    border: 'border-white/30',
  },
}

export interface TimeframeBadgeProps {
  timeframe?: string
  className?: string
}

export function TimeframeBadge({ timeframe, className = '' }: TimeframeBadgeProps) {
  if (!timeframe) return null
  const tier = getTimeframeTier(timeframe)
  const style = TIER_STYLES[tier]

  return (
    <span
      data-testid="timeframe-badge"
      data-tier={tier}
      className={`slide-card-tf font-mono font-bold text-[10px] tracking-wide px-2 py-0.5 rounded border tabular-nums uppercase shadow-xs select-none transition-colors !text-white ${style.bg} ${style.border} ${className}`}
    >
      {timeframe}
    </span>
  )
}
