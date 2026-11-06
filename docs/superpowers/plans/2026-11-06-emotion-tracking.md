# Emotion Tracking & Cost of Tilt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement emotion logging in trade creation, display emotion badges on trade cards, add emotion filtering to the day dashboard, and calculate the Cost of Tilt and emotion performance metrics on the Stats page.

**Architecture:** Pure domain taxonomy in `src/domain/emotions.ts` and stats computation in `src/domain/emotion-stats.ts`. Extend the existing Dexie/Trade schema with an optional `emotions: string[]` field. UI components reuse existing dark Stonk Journal styles and render pill tags for multi-select.

**Tech Stack:** React 19, TypeScript 5.7, Lucide React, Vitest, Testing Library, Dexie DB.

## Global Constraints

- Never break existing trade data or calculator tests.
- Deduplicate Cost of Tilt calculations when a single losing trade contains multiple tilt tags.
- Minimum 3 trades threshold ($N \ge 3$) for Top Edge and Top Leak emotion callouts.
- All primary actions retain accessible contrast and work without color dependence.

---

### Task 1: Domain Definition & Emotion Taxonomy

**Files:**
- Create: `src/domain/emotions.ts`
- Modify: `src/domain/trade.ts`
- Test: `src/domain/emotions.test.ts`

**Interfaces:**
- Consumes: `Trade` from `src/domain/trade.ts`
- Produces: `EmotionCategory`, `EmotionTag`, `DEFAULT_EMOTIONS`, `getEmotionById`

- [x] **Step 1: Write the failing test**

Create `src/domain/emotions.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { DEFAULT_EMOTIONS, getEmotionById } from './emotions'

describe('emotions taxonomy', () => {
  it('contains all 12 preset emotions with valid categories', () => {
    expect(DEFAULT_EMOTIONS).toHaveLength(12)
    const calm = getEmotionById('calm')
    expect(calm).toBeDefined()
    expect(calm?.category).toBe('positive')
    expect(calm?.emoji).toBe('😌')

    const revenge = getEmotionById('revenge_trading')
    expect(revenge).toBeDefined()
    expect(revenge?.category).toBe('tilt')
    expect(revenge?.emoji).toBe('🤬')
  })

  it('returns undefined for unknown emotion id', () => {
    expect(getEmotionById('non_existent')).toBeUndefined()
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test src/domain/emotions.test.ts`
Expected: FAIL (Cannot find module `./emotions`)

- [x] **Step 3: Write minimal implementation**

Create `src/domain/emotions.ts`:
```typescript
export type EmotionCategory = 'positive' | 'neutral' | 'tilt'

export interface EmotionTag {
  id: string
  label: string
  emoji: string
  category: EmotionCategory
}

export const DEFAULT_EMOTIONS: EmotionTag[] = [
  { id: 'calm', label: 'Calm', emoji: '😌', category: 'positive' },
  { id: 'focused', label: 'Focused', emoji: '🎯', category: 'positive' },
  { id: 'disciplined', label: 'Disciplined', emoji: '💪', category: 'positive' },
  { id: 'confident', label: 'Confident', emoji: '🚀', category: 'positive' },
  { id: 'tired', label: 'Tired', emoji: '😴', category: 'neutral' },
  { id: 'uncertain', label: 'Uncertain', emoji: '🤔', category: 'neutral' },
  { id: 'anxious', label: 'Anxious', emoji: '😰', category: 'tilt' },
  { id: 'fearful', label: 'Fearful', emoji: '😨', category: 'tilt' },
  { id: 'greedy', label: 'Greedy', emoji: '🤑', category: 'tilt' },
  { id: 'frustrated', label: 'Frustrated', emoji: '🥱', category: 'tilt' },
  { id: 'impulsive', label: 'Impulsive', emoji: '🎲', category: 'tilt' },
  { id: 'revenge_trading', label: 'Revenge Trading', emoji: '🤬', category: 'tilt' },
]

export function getEmotionById(id: string): EmotionTag | undefined {
  return DEFAULT_EMOTIONS.find((e) => e.id === id)
}
```

Modify `src/domain/trade.ts` to add `emotions?: string[]` to `Trade`, `NewTrade`:
```typescript
export interface Trade {
  id: string
  tradeDate: string
  templateVersion: typeof TEMPLATE_VERSION
  ticker: string
  side: 'Long' | 'Short' | ''
  session: string
  volatilityDriver: string
  result?: number
  rMultiple?: number
  emotions?: string[]
  slides: Slide[]
  createdAt: string
  updatedAt: string
}

export type NewTrade = {
  id?: string
  tradeDate: string
  templateVersion?: typeof TEMPLATE_VERSION
  ticker: string
  side?: 'Long' | 'Short' | ''
  session?: string
  volatilityDriver?: string
  result?: number
  rMultiple?: number
  emotions?: string[]
  slides: Slide[]
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test src/domain/emotions.test.ts`
Expected: PASS

- [x] **Step 5: Checkpoint**

Ensure TypeScript compiles cleanly: `npx tsc -b`

---

### Task 2: Pure Domain Analytics & Cost of Tilt

**Files:**
- Create: `src/domain/emotion-stats.ts`
- Test: `src/domain/emotion-stats.test.ts`

**Interfaces:**
- Consumes: `Trade`, `EmotionTag`, `DEFAULT_EMOTIONS`
- Produces: `EmotionStatRow`, `EmotionStatsSummary`, `computeEmotionStats`

- [x] **Step 1: Write the failing test**

Create `src/domain/emotion-stats.test.ts`:
```typescript
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
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test src/domain/emotion-stats.test.ts`
Expected: FAIL (Cannot find module `./emotion-stats`)

- [x] **Step 3: Write minimal implementation**

Create `src/domain/emotion-stats.ts`:
```typescript
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
}

export interface EmotionStatsSummary {
  costOfTilt: number
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
  const closedTrades = trades.filter((t) => typeof t.result === 'number' && Number.isFinite(t.result))

  const tiltEmotionIds = new Set(
    allEmotions.filter((e) => e.category === 'tilt').map((e) => e.id)
  )

  let costOfTilt = 0
  let tiltTradesCount = 0

  for (const trade of closedTrades) {
    if (!trade.emotions || trade.emotions.length === 0) continue
    const hasTilt = trade.emotions.some((id) => tiltEmotionIds.has(id))
    if (hasTilt) {
      tiltTradesCount++
      if ((trade.result ?? 0) < 0) {
        costOfTilt += Math.abs(trade.result ?? 0)
      }
    }
  }

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
        }
      }

      let winCount = 0
      let lossCount = 0
      let breakevenCount = 0
      let netPnL = 0

      for (const t of taggedTrades) {
        const res = t.result ?? 0
        netPnL += res
        if (res > 0) winCount++
        else if (res < 0) lossCount++
        else breakevenCount++
      }

      const winRate = tradeCount > 0 ? (winCount / tradeCount) * 100 : 0

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
      }
    })
    .filter((row) => row.tradeCount > 0)
    .sort((a, b) => b.netPnL - a.netPnL)

  const qualifiedRows = rows.filter((r) => r.tradeCount >= MIN_SAMPLE_SIZE)
  const topEdge = qualifiedRows.length > 0 && qualifiedRows[0].netPnL > 0 ? qualifiedRows[0] : null
  const topLeak =
    qualifiedRows.length > 0 && qualifiedRows[qualifiedRows.length - 1].netPnL < 0
      ? qualifiedRows[qualifiedRows.length - 1]
      : null

  return {
    costOfTilt,
    tiltTradesCount,
    rows,
    topEdge,
    topLeak,
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test src/domain/emotion-stats.test.ts`
Expected: PASS

- [x] **Step 5: Checkpoint**

Run `npm test` to verify all domain tests pass.

---

### Task 3: Emotion Selector UI Component

**Files:**
- Create: `src/features/trade-template/EmotionSelector.tsx`
- Test: `src/features/trade-template/EmotionSelector.test.tsx`

**Interfaces:**
- Consumes: `DEFAULT_EMOTIONS`, `EmotionTag` from `src/domain/emotions`
- Produces: `EmotionSelector` component with multi-select toggle

- [x] **Step 1: Write the failing test**

Create `src/features/trade-template/EmotionSelector.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmotionSelector } from './EmotionSelector'

describe('EmotionSelector', () => {
  it('renders title and emotion chips', () => {
    render(<EmotionSelector selectedIds={[]} onChange={vi.fn()} />)
    expect(screen.getByText(/HOW WERE YOU FEELING\?/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Calm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Revenge Trading/i })).toBeInTheDocument()
  })

  it('toggles selection when chips are clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<EmotionSelector selectedIds={['calm']} onChange={onChange} />)

    const calmBtn = screen.getByRole('button', { name: /Calm/i })
    expect(calmBtn).toHaveAttribute('aria-pressed', 'true')

    const tiredBtn = screen.getByRole('button', { name: /Tired/i })
    expect(tiredBtn).toHaveAttribute('aria-pressed', 'false')

    await user.click(tiredBtn)
    expect(onChange).toHaveBeenCalledWith(['calm', 'tired'])

    await user.click(calmBtn)
    expect(onChange).toHaveBeenCalledWith([])
  })
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test src/features/trade-template/EmotionSelector.test.tsx`
Expected: FAIL (Cannot find module `./EmotionSelector`)

- [x] **Step 3: Write minimal implementation**

Create `src/features/trade-template/EmotionSelector.tsx`:
```typescript
import { DEFAULT_EMOTIONS, EmotionTag } from '../../domain/emotions'

interface EmotionSelectorProps {
  selectedIds?: string[]
  onChange: (ids: string[]) => void
  emotions?: EmotionTag[]
}

export function EmotionSelector({
  selectedIds = [],
  onChange,
  emotions = DEFAULT_EMOTIONS,
}: EmotionSelectorProps) {
  const toggleEmotion = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div className="emotion-selector mb-4">
      <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
        HOW WERE YOU FEELING? (SELECT ALL THAT APPLY)
      </label>
      <div className="flex flex-wrap gap-2">
        {emotions.map((item) => {
          const isSelected = selectedIds.includes(item.id)
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggleEmotion(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-white/15 text-text-strong border-white/40 shadow-sm'
                  : 'bg-white/[0.03] text-text-muted border-white/10 hover:bg-white/[0.08] hover:text-text-normal'
              }`}
            >
              <span>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test src/features/trade-template/EmotionSelector.test.tsx`
Expected: PASS

- [x] **Step 5: Checkpoint**

Verify tests pass.

---

### Task 4: Integrate Emotion Selector into TradeEditor

**Files:**
- Modify: `src/features/trade-template/TradeEditor.tsx`
- Modify: `src/features/trade-template/TradeEditor.test.tsx`

**Interfaces:**
- Consumes: `EmotionSelector`
- Produces: `emotions` field saved to and loaded from `Trade` in repository

- [x] **Step 1: Write the failing test**

In `src/features/trade-template/TradeEditor.test.tsx`, add a test case verifying that emotions are saved when creating or updating a trade:
```typescript
it('allows selecting emotions and persists them on save', async () => {
  const mockRepo = makeMockRepo()
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/trades/new?date=2026-11-06']}>
      <TradeEditor repository={mockRepo} />
    </MemoryRouter>
  )

  const calmBtn = await screen.findByRole('button', { name: /Calm/i })
  await user.click(calmBtn)
  expect(calmBtn).toHaveAttribute('aria-pressed', 'true')

  const tickerInput = screen.getByLabelText(/Ticker/i)
  await user.type(tickerInput, 'NQ')

  const saveBtn = screen.getByRole('button', { name: /Save Trade/i })
  await user.click(saveBtn)

  expect(mockRepo.create).toHaveBeenCalledWith(
    expect.objectContaining({
      ticker: 'NQ',
      emotions: ['calm'],
    })
  )
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test src/features/trade-template/TradeEditor.test.tsx`
Expected: FAIL (emotions not passed or button not found)

- [x] **Step 3: Update TradeEditor implementation**

In `src/features/trade-template/TradeEditor.tsx`:
1. Import `EmotionSelector`:
```typescript
import { EmotionSelector } from './EmotionSelector'
```
2. Add state for `emotions`:
```typescript
const [emotions, setEmotions] = useState<string[]>([])
```
3. Load `emotions` in `useEffect` when editing:
```typescript
if (trade.emotions) {
  setEmotions(trade.emotions)
}
```
4. Pass `emotions` to `repository.update` and `repository.create`:
```typescript
emotions,
```
5. Render `<EmotionSelector selectedIds={emotions} onChange={setEmotions} />` in the form before or after the outcome fields.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test src/features/trade-template/TradeEditor.test.tsx`
Expected: PASS

- [x] **Step 5: Checkpoint**

Run full test suite: `npm test`

---

### Task 5: Display Emotion Badges in Trade Recap & List Filtering

**Files:**
- Modify: `src/features/day-dashboard/TradeRecapRow.tsx`
- Modify: `src/features/day-dashboard/DayDashboardPage.tsx`
- Test: `src/features/day-dashboard/DayDashboardPage.test.tsx`

**Interfaces:**
- Consumes: `getEmotionById`, `DEFAULT_EMOTIONS`
- Produces: Emotion chips in `TradeRecapRow` and dropdown filter in `DayDashboardPage`

- [x] **Step 1: Write the failing test**

In `src/features/day-dashboard/DayDashboardPage.test.tsx`, add a test for filtering trades by emotion:
```typescript
it('filters trades when an emotion is selected in the filter dropdown', async () => {
  const user = userEvent.setup()
  const mockRepo = makeMockRepoWithTrades([
    { id: 't1', ticker: 'NQ', emotions: ['calm'], result: 200, ...baseTrade },
    { id: 't2', ticker: 'ES', emotions: ['revenge_trading'], result: -300, ...baseTrade },
  ])
  render(
    <MemoryRouter initialEntries={['/dashboard/2026-11-06']}>
      <DayDashboardPage repository={mockRepo} />
    </MemoryRouter>
  )

  expect(screen.getByText('NQ')).toBeInTheDocument()
  expect(screen.getByText('ES')).toBeInTheDocument()

  const filterSelect = screen.getByLabelText(/Filter by Emotion/i)
  await user.selectOptions(filterSelect, 'revenge_trading')

  expect(screen.queryByText('NQ')).not.toBeInTheDocument()
  expect(screen.getByText('ES')).toBeInTheDocument()
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test src/features/day-dashboard/DayDashboardPage.test.tsx`
Expected: FAIL (Cannot find select with label "Filter by Emotion")

- [x] **Step 3: Implement Emotion badges & Filter**

1. In `TradeRecapRow.tsx`:
   Render small emotion badges next to ticker / outcome:
```typescript
{trade.emotions && trade.emotions.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {trade.emotions.map((id) => {
      const e = getEmotionById(id)
      if (!e) return null
      return (
        <span
          key={id}
          className={`text-[10px] px-2 py-0.5 rounded-full border ${
            e.category === 'tilt'
              ? 'bg-accent-red/10 border-accent-red/30 text-accent-red'
              : 'bg-white/5 border-white/10 text-text-muted'
          }`}
        >
          {e.emoji} {e.label}
        </span>
      )
    })}
  </div>
)}
```
2. In `DayDashboardPage.tsx`:
   Add a state `selectedEmotionFilter: string` ('all' by default).
   Filter displayed trades by `selectedEmotionFilter === 'all' || trade.emotions?.includes(selectedEmotionFilter)`.
   Add select dropdown:
```typescript
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
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test src/features/day-dashboard/DayDashboardPage.test.tsx`
Expected: PASS

- [x] **Step 5: Checkpoint**

Run full test suite: `npm test`

---

### Task 6: Cost of Tilt & Emotion Breakdown on Stats Page

**Files:**
- Modify: `src/features/stats/StatsPage.tsx`
- Test: `src/features/stats/StatsPage.test.tsx`

**Interfaces:**
- Consumes: `computeEmotionStats` from `src/domain/emotion-stats`
- Produces: Cost of Tilt KPI card and Emotion performance summary table on Stats page

- [x] **Step 1: Write the failing test**

In `src/features/stats/StatsPage.test.tsx`, add a test verifying Cost of Tilt and emotion breakdown rendering:
```typescript
it('renders Cost of Tilt card and emotion summary when tilt trades exist', async () => {
  const mockRepo = makeMockRepoWithTrades([
    { id: '1', result: -250, emotions: ['revenge_trading'], ...baseTrade },
    { id: '2', result: 400, emotions: ['disciplined'], ...baseTrade },
  ])
  render(
    <MemoryRouter initialEntries={['/stats']}>
      <StatsPage repository={mockRepo} />
    </MemoryRouter>
  )

  expect(await screen.findByText(/Cost of Tilt/i)).toBeInTheDocument()
  expect(screen.getByText('$250')).toBeInTheDocument()
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test src/features/stats/StatsPage.test.tsx`
Expected: FAIL (Cannot find "Cost of Tilt")

- [x] **Step 3: Implement Emotion section on StatsPage**

In `src/features/stats/StatsPage.tsx`:
1. Call `computeEmotionStats(trades)` on the filtered trades.
2. Render Cost of Tilt card in the KPI grid:
```typescript
<section
  className="stats-card bg-bg-panel border border-border rounded-lg p-4 flex flex-col justify-between shadow-sm"
  aria-label="Cost of Tilt"
>
  <div className="flex items-center justify-between text-text-muted mb-2">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted m-0">
      Cost of Tilt
    </p>
    <AlertOctagon className="w-4 h-4 text-accent-red/80" />
  </div>
  <div className="my-1">
    <strong className="block text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums text-accent-red">
      {emotionStats.costOfTilt > 0 ? `-$${emotionStats.costOfTilt.toLocaleString()}` : '$0'}
    </strong>
  </div>
  <small className="text-[11px] text-text-muted/80 mt-1 font-mono block">
    Losses across {emotionStats.tiltTradesCount} tilt trades
  </small>
</section>
```
3. Render Emotion Performance Breakdown table below the existing breakdowns:
Columns: `Emotion`, `Trades`, `Win Rate`, `Net P&L`.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test src/features/stats/StatsPage.test.tsx`
Expected: PASS

- [x] **Step 5: Run full test suite & build check**

Run:
```bash
npm test
npm run build
```
Expected: All tests pass, build completes with 0 errors.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-11-06-emotion-tracking.md`.

Two execution options:
1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach would you like to proceed with?
