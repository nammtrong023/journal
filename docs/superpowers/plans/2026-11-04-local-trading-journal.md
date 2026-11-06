# Local Trading Journal MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only personal trade journal with a Stonk Journal-faithful calendar shell, Lathyrus five-slide trade recaps, a day dashboard, and a standalone futures calculator.

**Architecture:** Create a new Vite + React + TypeScript single-page app at the workspace root. React Router owns `calendar`, `dashboard`, and `calculator` routes; a small Dexie repository owns all IndexedDB access and the UI receives data through focused hooks. The journal template is a fixed versioned schema; image blobs live separately from trade records.

**Tech Stack:** Vite, React 19, TypeScript, React Router, Dexie + fake-indexeddb, date-fns, Lucide React, Vitest, Testing Library, CSS custom properties.

## Global Constraints

- Use the existing files only as references: `stonkjournal_scraped/`, `index.html`, `futures_calculator.html`, and selective calendar patterns in `deltalytix-main/`; do not embed, fork, or ship their bundled source.
- Local-only means no authentication, HTTP API, server, cloud sync, Supabase, analytics, import/export, accounts, settings page, tags, notes, setup manager, rules, or AI coach.
- Use IndexedDB. Do not persist chart images as base64 or in localStorage.
- `tradeDate` is local `YYYY-MM-DD`, defaults to local today, and may not be in the future. Validate in form code and the repository.
- Keep five fixed Lathyrus slides and include `templateVersion: 1` in each trade. Do not build template configuration UI.
- Dashboard shows one row per trade, never groups duplicate tickers.
- Calculator has no journal writes or reads.
- Use this palette: main `#20222D`, panel `#2A2D39`, muted `#1A1C24`, border `#2D313D`, blue `#4FA5FF`, green `#52CA96`, red `#EB4B68`, muted text `#8A92A6`, strong text `#FFFFFF`.
- Use the real user-visible UI for browser verification. Do not claim a completed task without fresh command output and screenshot inspection.
- The current workspace has no `.git`; do not initialize or commit unless the user provides a target repository.

## Planned File Structure

| Path | Responsibility |
| --- | --- |
| `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html` | React/Vite project shell (replace the current static prototype entry point only after preserving it as `references/lathyrus-recap-builder.html`). |
| `src/main.tsx`, `src/App.tsx` | Bootstrap, router, route composition. |
| `src/styles/tokens.css`, `src/styles/app.css` | Stonk-derived palette, shell, responsive layout, component styling. |
| `src/domain/trade.ts`, `src/domain/calculator.ts` | Versioned domain types, date/risk calculation helpers. |
| `src/data/db.ts`, `src/data/trade-repository.ts` | Dexie schema, migrations, Blob storage, date validation, CRUD. |
| `src/features/shell/*` | Sidebar and reusable app chrome. |
| `src/features/trade-template/*` | Fixed five-slide editor, image input, card previews, delete flow. |
| `src/features/calendar/*` | Month grid, selected-day slideover, date navigation. |
| `src/features/day-dashboard/*` | Day-scoped list of separate horizontal recap rows. |
| `src/features/calculator/*` | Existing calculator behavior restyled into the shared shell. |
| `src/test/*`, `src/**/*.test.ts(x)` | Unit, repository, and component tests. |

---

### Task 1: Bootstrap the standalone application and Stonk-style shell

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `src/main.tsx`, `src/App.tsx`
- Create: `src/styles/tokens.css`, `src/styles/app.css`, `src/features/shell/AppShell.tsx`, `src/features/shell/Sidebar.tsx`
- Create: `src/test/setup.ts`, `src/features/shell/Sidebar.test.tsx`
- Move: `index.html` → `references/lathyrus-recap-builder.html`
- Modify: new root `index.html`

**Interfaces:**
- Produces `AppShell({ children }: { children: React.ReactNode })` and route paths `/calendar`, `/dashboard`, `/calculator`, `/trades/new`, `/trades/:tradeId`.
- Later tasks render only inside `AppShell` and use `<Link to="/calendar">` rather than duplicating navigation.

- [ ] **Step 1: Preserve static references, then scaffold dependencies.**

  Run:

  ```bash
  mkdir -p references
  mv index.html references/lathyrus-recap-builder.html
  npm create vite@latest . -- --template react-ts
  npm install react-router-dom dexie date-fns lucide-react
  npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom fake-indexeddb
  ```

  Add this `test` section to `package.json`:

  ```json
  {
    "scripts": {
      "dev": "vite",
      "build": "tsc -b && vite build",
      "test": "vitest run",
      "test:watch": "vitest"
    }
  }
  ```

- [ ] **Step 2: Write the failing sidebar route test.**

  ```tsx
  // src/features/shell/Sidebar.test.tsx
  import { MemoryRouter } from 'react-router-dom'
  import { render, screen } from '@testing-library/react'
  import { Sidebar } from './Sidebar'

  it('shows only MVP destinations and New Trade', () => {
    render(<MemoryRouter><Sidebar /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Calendar' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Calculator' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'New Trade' })).toBeVisible()
    expect(screen.queryByText('Stats')).not.toBeInTheDocument()
  })
  ```

- [ ] **Step 3: Run the test and observe the expected initial failure.**

  Run: `npm test -- Sidebar.test.tsx`

  Expected: FAIL because `Sidebar` does not exist.

- [ ] **Step 4: Implement routes, shell, and exact design tokens.**

  ```tsx
  // src/features/shell/Sidebar.tsx
  import { Calculator, CalendarDays, LayoutDashboard, Plus } from 'lucide-react'
  import { Link, NavLink } from 'react-router-dom'

  const items = [
    ['/calendar', 'Calendar', CalendarDays],
    ['/dashboard', 'Dashboard', LayoutDashboard],
    ['/calculator', 'Calculator', Calculator],
  ] as const

  export function Sidebar() {
    return <aside className="sidebar" aria-label="Primary navigation">
      <div className="brand">Journal</div>
      <nav>{items.map(([to, label, Icon]) => <NavLink key={to} to={to} className="nav-item"><Icon size={18}/>{label}</NavLink>)}</nav>
      <Link className="new-trade" to="/trades/new"><Plus size={18}/>New Trade</Link>
    </aside>
  }
  ```

  ```css
  /* src/styles/tokens.css */
  :root { --bg-main:#20222D; --bg-panel:#2A2D39; --bg-muted:#1A1C24; --border:#2D313D; --blue:#4FA5FF; --green:#52CA96; --red:#EB4B68; --text-muted:#8A92A6; --text-strong:#FFF; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color:var(--text-muted); background:var(--bg-main); }
  ```

  `App.tsx` must redirect `/` to `/calendar`, wrap every route in `AppShell`, and leave feature-page route components as minimal placeholders until their tasks.

- [ ] **Step 5: Run checks.**

  Run: `npm test -- Sidebar.test.tsx && npm run build`

  Expected: tests pass and Vite build exits 0.

---

### Task 2: Implement the versioned IndexedDB trade repository

**Files:**
- Create: `src/domain/trade.ts`, `src/data/db.ts`, `src/data/trade-repository.ts`
- Create: `src/data/trade-repository.test.ts`

**Interfaces:**
- Produces `TradeRepository` with `create`, `update`, `get`, `listByDate`, `delete`, `putImage`, and `getImage`.
- `create(input: NewTrade): Promise<Trade>` and `update(id: string, input: EditableTrade): Promise<Trade>` reject future dates with `TradeDateError`.

- [ ] **Step 1: Write failing repository tests using fake IndexedDB.**

  ```ts
  import 'fake-indexeddb/auto'
  import { TradeRepository, TradeDateError } from './trade-repository'

  it('rejects a future trade date', async () => {
    const repo = new TradeRepository('future-date-test')
    await expect(repo.create({ tradeDate: '2999-01-01', ticker: 'MNQ', slides: [] }))
      .rejects.toBeInstanceOf(TradeDateError)
  })

  it('moves a trade when its tradeDate changes', async () => {
    const repo = new TradeRepository('move-test')
    const trade = await repo.create({ tradeDate: '2026-11-03', ticker: 'NQ', slides: [] })
    await repo.update(trade.id, { ...trade, tradeDate: '2026-11-04' })
    expect(await repo.listByDate('2026-11-03')).toHaveLength(0)
    expect(await repo.listByDate('2026-11-04')).toHaveLength(1)
  })
  ```

- [ ] **Step 2: Run tests to verify they fail.**

  Run: `npm test -- trade-repository.test.ts`

  Expected: FAIL because repository module is missing.

- [ ] **Step 3: Define the stable domain types and implement the repository.**

  ```ts
  export const TEMPLATE_VERSION = 1 as const
  export type SlideKey = 'context'|'profile'|'keyLevel'|'entry'|'execution'
  export interface Slide { key: SlideKey; value: string|string[]; timeframe: string; subtitle: string; imageId?: string; fit: 'contain'|'cover'; skip: boolean }
  export interface Trade { id:string; tradeDate:string; templateVersion:typeof TEMPLATE_VERSION; ticker:string; side:'Long'|'Short'|''; session:string; volatilityDriver:string; result?:number; rMultiple?:number; slides:Slide[]; createdAt:string; updatedAt:string }
  ```

  Store trade records in Dexie `trades` with `id, tradeDate, createdAt`; store `{ id, tradeId, slideKey, blob }` in `slideImages` with `id, tradeId`. `delete(id)` must delete both its trade and every matching image in one transaction. Compare date strings only after `isValid(parseISO(...))` and `date <= format(new Date(), 'yyyy-MM-dd')`.

- [ ] **Step 4: Run repository tests.**

  Run: `npm test -- trade-repository.test.ts`

  Expected: PASS.

---

### Task 3: Build the fixed Lathyrus editor and image lifecycle

**Files:**
- Create: `src/features/trade-template/template-definition.ts`, `TradeEditor.tsx`, `SlideEditor.tsx`, `ChartImageInput.tsx`, `TradeEditor.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes `TradeRepository`, `Trade`, and `Slide` from Task 2.
- Produces `makeDefaultSlides(): Slide[]` and `TradeEditor({ tradeId?: string }): JSX.Element`.

- [ ] **Step 1: Write failing template tests.**

  ```tsx
  it('renders five fixed Lathyrus slide editors', () => {
    render(<TradeEditor repository={memoryRepository} />)
    expect(screen.getAllByTestId('slide-editor')).toHaveLength(5)
    expect(screen.getByLabelText('Trade date')).toHaveAttribute('max', '2026-11-04')
  })

  it('does not require a chart image to save', async () => {
    const user = userEvent.setup()
    render(<TradeEditor repository={memoryRepository} />)
    await user.click(screen.getByRole('button', { name: 'Save trade' }))
    await waitFor(() => expect(memoryRepository.create).toHaveBeenCalled())
  })
  ```

- [ ] **Step 2: Run tests and observe failure.**

  Run: `npm test -- TradeEditor.test.tsx`

  Expected: FAIL because editor module is missing.

- [ ] **Step 3: Implement fixed definition and editor behavior.**

  `template-definition.ts` must produce these cards in this exact order: Market context (`Reversal`, `Continuation`); Market profile (`Asia Reversal`, `Classic London Protraction`, `Delayed Protraction`, `Judas Swing`); Key Level & CiC (text); Entry technique (`CISD`, `I-CISD`, `Fair Value Gap`, `Inversion Fair Value Gap`); Execution (R multiple). Default timeframes: Daily, 4H, 30m, 3m, 3m.

  The editor must include: date input with `max={today}`, ticker, Long/Short, session, volatility driver, optional numeric result, all five slide controls, per-slide optional file input, skip toggle, Cancel, Save, and an edit-only Delete confirmation dialog. On image selection, call `repository.putImage(tradeId, slideKey, file)` and store only returned `imageId` in the trade. On image failure, retain form values and display an `aria-live` error. On save success navigate to `/calendar`; on `TradeDateError`, show inline validation and remain on the editor.

- [ ] **Step 4: Run component tests.**

  Run: `npm test -- TradeEditor.test.tsx`

  Expected: PASS.

---

### Task 4: Implement calendar month grid and selected-day slideover

**Files:**
- Create: `src/features/calendar/CalendarPage.tsx`, `MonthGrid.tsx`, `DaySlideover.tsx`, `calendar-model.ts`, `CalendarPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes `repository.listByDate(date)` and `Trade` from Task 2.
- Produces `calendarDays(month: Date): string[]` and calendar links to `/dashboard?date=YYYY-MM-DD` and `/trades/new?date=YYYY-MM-DD`.

- [ ] **Step 1: Write failing calendar tests.**

  ```tsx
  it('opens the selected date drawer and lists duplicate ticker trades separately', async () => {
    repository.listByDate.mockResolvedValue([{...nqA}, {...nqB}])
    render(<CalendarPage repository={repository} />)
    await userEvent.click(screen.getByRole('button', { name: /November 4, 2026/i }))
    expect(await screen.findByRole('dialog', { name: /November 4/i })).toBeVisible()
    expect(screen.getAllByText('NQ')).toHaveLength(2)
  })
  ```

- [ ] **Step 2: Run it.**

  Run: `npm test -- CalendarPage.test.tsx`

  Expected: FAIL because the calendar page is missing.

- [ ] **Step 3: Implement month interactions and drawer.**

  Use `date-fns` to render a Sunday-first 6-week grid. Header has prior/next controls, a selectable `MMMM yyyy` label, and `Today`. Cells are buttons labelled with their full date; display compact count and aggregate result only if records exist. The drawer uses `role="dialog"`, focuses its close button, shows selected date, `N trade(s)`, each trade as a separate clickable summary, `Go to Dashboard for this day`, and `New Trade` for an empty date. The New Trade link carries the selected local date. Visually match the reference slideover and palette.

- [ ] **Step 4: Run the calendar test.**

  Run: `npm test -- CalendarPage.test.tsx`

  Expected: PASS.

---

### Task 5: Implement the day dashboard and recap-row renderer

**Files:**
- Create: `src/features/day-dashboard/DayDashboardPage.tsx`, `TradeRecapRow.tsx`, `SlideCard.tsx`, `DayDashboardPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes `date` search parameter and `repository.listByDate(date)`.
- Produces `TradeRecapRow({ trade }: { trade: Trade })`; card/link target is `/trades/:tradeId`.

- [ ] **Step 1: Write failing dashboard tests.**

  ```tsx
  it('renders each trade as a separate row rather than grouping by ticker', async () => {
    repository.listByDate.mockResolvedValue([{...nqA}, {...nqB}])
    renderAt('/dashboard?date=2026-11-04', <DayDashboardPage repository={repository} />)
    expect(await screen.findAllByTestId('trade-recap-row')).toHaveLength(2)
  })

  it('uses an empty-state New Trade link for a day without records', async () => {
    repository.listByDate.mockResolvedValue([])
    renderAt('/dashboard?date=2026-11-04', <DayDashboardPage repository={repository} />)
    expect(await screen.findByRole('link', { name: 'New Trade' })).toHaveAttribute('href', '/trades/new?date=2026-11-04')
  })
  ```

- [ ] **Step 2: Run it.**

  Run: `npm test -- DayDashboardPage.test.tsx`

  Expected: FAIL because dashboard feature is missing.

- [ ] **Step 3: Implement dashboard behavior.**

  Resolve `date` from query string, defaulting to local today. Render a date heading, back-to-calendar link, and records ordered by `createdAt` ascending. A row shows ticker and optional colored result, then every non-skipped slide in a horizontal scroll strip. Chart images must use `repository.getImage(imageId)` and object URLs that are revoked on cleanup. Clicking a row/card navigates to its editor. Use a clear New Trade empty state and do not show aggregate stats.

- [ ] **Step 4: Run dashboard tests.**

  Run: `npm test -- DayDashboardPage.test.tsx`

  Expected: PASS.

---

### Task 6: Port calculator logic as an isolated page

**Files:**
- Create: `src/domain/calculator.ts`, `src/domain/calculator.test.ts`, `src/features/calculator/CalculatorPage.tsx`, `CalculatorPage.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces `calculatePosition(input: PositionInput): PositionResult` and `CONTRACTS` for MNQ, MES, MYM, M2K, MGC, SIL, MCL.
- `CalculatorPage` must not import `TradeRepository`.

- [ ] **Step 1: Write failing arithmetic and isolation tests.**

  ```ts
  it('rounds MNQ contracts down to stay within risk', () => {
    expect(calculatePosition({ contract:'MNQ', account:50000, stop:40, stopMode:'ticks', risk:200, riskMode:'usd' }).contracts).toBe(2)
  })
  ```

  ```tsx
  it('does not create a journal record while calculating', async () => {
    render(<CalculatorPage />)
    await userEvent.type(screen.getByLabelText('Stop Loss'), '40')
    expect(mockTradeRepository.create).not.toHaveBeenCalled()
  })
  ```

- [ ] **Step 2: Run tests.**

  Run: `npm test -- calculator`

  Expected: FAIL because calculator modules are missing.

- [ ] **Step 3: Implement calculator code and page.**

  Port the contract specification values and formulas from `futures_calculator.html` into pure `calculator.ts`: normalize stop to points/ticks; convert risk USD/%; calculate `floor(riskAmount / dollarRiskPerContract)`; calculate actual risk and 1R/2R/3R targets. Page controls: contract selector/presets, account, stop mode/value, risk mode/value, result cards, risk-level color, and Compare tab. Persist calculator-only form preferences in a namespaced key `journal.calculator.v1` in localStorage. Use the shared dark shell/palette and never call journal code.

- [ ] **Step 4: Run tests.**

  Run: `npm test -- calculator`

  Expected: PASS.

---

### Task 7: Wire lifecycle integration and regression coverage

**Files:**
- Create: `src/test/journal-flow.test.tsx`
- Modify: `src/data/trade-repository.ts`, `src/features/trade-template/TradeEditor.tsx`, `src/features/calendar/CalendarPage.tsx`, `src/features/day-dashboard/DayDashboardPage.tsx`

**Interfaces:**
- Consumes every feature interface above.
- Produces a verified create → calendar → drawer → dashboard → edit/move → delete lifecycle.

- [ ] **Step 1: Write the end-to-end component flow test.**

  ```tsx
  it('creates a past trade, exposes it in its day views, moves it, then removes it with its images', async () => {
    await createTradeThroughEditor({ date: '2026-11-03', ticker: 'NQ', image: new File(['chart'], 'chart.png', { type: 'image/png' }) })
    await openCalendarDay('2026-11-03')
    expect(screen.getByText('NQ')).toBeVisible()
    await userEvent.click(screen.getByRole('link', { name: 'Go to Dashboard for this day' }))
    expect(await screen.findAllByTestId('trade-recap-row')).toHaveLength(1)
    await moveTradeThroughEditor('2026-11-04')
    expect(await repository.listByDate('2026-11-03')).toHaveLength(0)
    await deleteTradeThroughEditor()
    expect(await repository.listByDate('2026-11-04')).toHaveLength(0)
    expect(await repository.countImages()).toBe(0)
  })
  ```

  Define `createTradeThroughEditor`, `openCalendarDay`, `moveTradeThroughEditor`, and `deleteTradeThroughEditor` in this test file as Testing Library helpers that use rendered controls and `MemoryRouter`; do not mock repository methods being asserted.

- [ ] **Step 2: Run it to verify failure before integration fixes.**

  Run: `npm test -- journal-flow.test.tsx`

  Expected: FAIL at the first unconnected route or persistence behavior.

- [ ] **Step 3: Make only integration changes required for the flow.**

  Ensure query date prefill reaches `TradeEditor`; save awaits image writes before trade write; edit navigation preserves date context; deletion awaits blob cleanup; calendar/dashboard refetch after mutations. Do not add features beyond the spec.

- [ ] **Step 4: Run focused regressions.**

  Run: `npm test -- journal-flow.test.tsx && npm test -- trade-repository.test.ts CalendarPage.test.tsx DayDashboardPage.test.tsx TradeEditor.test.tsx calculator`

  Expected: all pass.

---

### Task 8: Full verification and visual acceptance

**Files:**
- Modify only when a verification failure demonstrates a defect.

**Interfaces:**
- Consumes final built application and every test suite.
- Produces fresh evidence that required flows work in the actual browser surface.

- [ ] **Step 1: Run all static checks and tests.**

  Run: `npm test && npm run build`

  Expected: both exit 0.

- [ ] **Step 2: Run the application and inspect routes in a browser.**

  Run: `npm run dev -- --host 127.0.0.1`

  Inspect `/calendar`, `/dashboard?date=2026-11-04`, `/calculator`, `/trades/new`. Capture screenshots at desktop width and verify: exact palette tokens, active sidebar state, compact calendar layout, right slideover, separate same-ticker rows, horizontal recap strip, and calculator isolation.

- [ ] **Step 3: Execute manual acceptance from the design spec.**

  Verify a past trade with an optional image appears only on its assigned date; calendar drawer navigates to its day dashboard; editing moves it; future date save is blocked; and calculator use leaves the journal untouched.

- [ ] **Step 4: Report evidence and hand back.**

  Include commands, exit codes, screenshot paths, and any intentionally deferred scope. Do not describe a feature as complete without the fresh evidence from Steps 1–3.

## Plan Self-Review

- **Spec coverage:** Tasks 1–8 cover shell/palette, local storage, fixed template, image blobs, calendar/drawer, day dashboard, independent calculator, invalid/future dates, deletes, empty states, tests, and browser verification. Excluded features are prevented by Global Constraints.
- **Placeholder scan:** No unresolved marker, vague validation step, or implicit test instruction remains. Task 7 contains explicit user-visible actions and assertions.
- **Type consistency:** `Trade`, `Slide`, `TradeRepository`, `TradeEditor`, and calculator interfaces are defined before tasks that consume them. Date routing consistently uses `YYYY-MM-DD`.
