# Local Trading Journal MVP — Design

## Outcome

Build a deliberately small, personal trading-journal prototype. The calendar is the home screen; users create a journaled trade, save it to a valid trade date, review that date in a side panel, and browse its individual trade recaps in a day dashboard. A futures position-sizing calculator is a separate page.

The app is local-only. It has no authentication, backend, cloud sync, import/export, analytics, accounts, rules, AI coach, or customizable templates in this phase.

## Reference material and boundaries

Use the existing files as references, not as an application to be embedded or forked wholesale:

- `stonkjournal_scraped/`: visual source of truth for the app shell, calendar, side drawer, palette, spacing, sidebar behavior, and active states.
- `index.html` (Lathyrus Recap Builder): source of truth for the fixed trade-recap template and its five slides.
- `futures_calculator.html`: source of truth for calculator behavior and supported futures contracts.
- `deltalytix-main/`: selective reference only for calendar interaction patterns; do not inherit trading platform features or infrastructure.

The new app will reproduce the Stonk Journal visual language closely. The Lathyrus template supplies recap content and chart-card format, not a competing overall design system.

## Visual system

Apply the scraped dark palette throughout the app:

| Token | Value |
| --- | --- |
| Main background | `#20222D` |
| Panel/card | `#2A2D39` |
| Muted surface | `#1A1C24` |
| Border | `#2D313D` |
| Primary blue | `#4FA5FF` |
| Positive | `#52CA96` |
| Negative | `#EB4B68` |
| Muted text | `#8A92A6` |
| Strong text | `#FFFFFF` |

Maintain the reference's compact dark sidebar, blue active indicator, low-contrast borders, compact type, and right-side slideover. Trade-recap chart cards retain their readable light chart treatment inside the dark dashboard shell.

## Navigation and pages

The persistent sidebar contains only:

1. **Calendar** — app landing page and primary workspace.
2. **Dashboard** — day dashboard; defaults to today when reached directly.
3. **Calculator** — a standalone futures position-sizing page.
4. **New Trade** — persistent CTA that opens the journal template.

The application should not expose the scraped reference's Stats, AI Coach, Import, accounts, settings, setup, note, rules, tag, migration, support, or notification features.

## Journal flow

1. User selects **New Trade** from the sidebar or an empty date state.
2. The fixed Lathyrus trade template opens with a trade date defaulting to the current local date.
3. The date picker permits today and past dates only; future dates are disabled and rejected on save.
4. User completes any subset of the trade metadata and the five slide entries, uploads optional chart images, and saves.
5. The saved trade appears in the calendar cell for `tradeDate`.
6. Selecting a calendar cell opens a right-side slideover styled after the Stonk Journal reference. It shows the selected date, number of trades, optional aggregate result, individual trade summaries, and **Go to Dashboard for this day**.
7. That action opens the dashboard scoped to the selected date.
8. The day dashboard renders one horizontal recap row per trade, even when multiple trades share a ticker. Each row shows ticker, optional result, and the five recap slide/chart cards.
9. Selecting a row or a slide card reopens that trade's template for viewing and editing. Saving retains its identifier and updates every affected view. Changing `tradeDate` moves the trade to the new calendar day.

## Fixed Lathyrus template

Keep the original five slides without a configuration UI in this phase:

1. **Market context** — Reversal or Continuation.
2. **Market profile** — existing Lathyrus options.
3. **Key Level & CiC** — free text.
4. **Entry technique** — existing multi-select options.
5. **Execution** — R multiple.

The template also preserves its existing trade metadata: ticker, Long/Short position, session, volatility driver, handle/footer values where applicable, and per-slide timeframe, chart image, fit behavior, subtitle, and skip state. Every slide image is optional; a skipped slide is omitted from dashboard output.

Template customization is explicitly deferred. The persisted record must carry a `templateVersion` so a later custom-template feature can migrate existing journals safely.

## Persistence model

Use IndexedDB rather than `localStorage`; local chart images would quickly exceed localStorage's practical quota. Store image files as Blobs.

### Stores

- `trades`: one versioned record per journaled trade.
- `slideImages`: Blob records keyed by image id and associated trade/slide key.
- `appSettings`: minimal local UI settings and a schema/version marker.

### Trade record

Required:

- `id`
- `tradeDate` in local date-only format
- `templateVersion`
- `createdAt`, `updatedAt`
- five fixed slide records

Optional:

- `ticker`, `side`, `session`, `volatilityDriver`
- `result` and `rMultiple`
- slide values, timeframe, subtitle, image reference, image fit, and `skip`

Date validation happens in both UI and persistence service: `tradeDate` must not be after today's local date. The app treats the local date as authoritative; no timezone conversion is needed for this personal prototype.

## Calendar behavior

- Render a conventional monthly grid with previous/next-month navigation and a Today action.
- Calendar cells display the date and a compact trade indicator/count. They may show an optional aggregate result when data exists.
- Empty cells remain selectable and their slideover presents a **New Trade** CTA.
- The date-cell slideover lists each trade separately; it does not group duplicate tickers.
- Dashboard direct navigation uses today; calendar-originated navigation preserves the selected date in the route/state.

## Day dashboard behavior

- Scope to one local calendar day.
- Show a clear day heading and a back-to-calendar affordance.
- Empty day: clear empty state and **New Trade** CTA.
- Non-empty day: one recap row per trade in stable creation-time order. Do not group records by ticker.
- A recap row uses a horizontal, scrollable card strip if viewport width cannot fit all visible slides.

## Calculator

The calculator is a separate route and has no journal side effects. Preserve the existing calculator's:

- supported micro-futures contracts;
- account balance, stop distance (ticks/points), and risk (USD/percent) controls;
- contract-count, actual-risk, risk-level, and 1R/2R/3R calculations;
- contract comparison tab; and
- local calculator settings.

Restyle it to the shared Stonk Journal shell/palette. Do not auto-fill it from a trade or save calculator output into a journal record.

## Error handling and destructive actions

- Invalid, missing, or future trade dates must show an inline message and prevent save.
- Image read failures must preserve other edited fields and surface an actionable message.
- IndexedDB unavailable/full errors must not report a successful save; retain unsaved form state in memory for retry.
- Delete is available only while editing an existing trade, requires confirmation, deletes its related image blobs, and returns to the date context.

## Testing and acceptance checks

Automated checks should cover:

- future-date prevention, including persistence-layer validation;
- create/edit/move/delete trade lifecycle;
- image record cleanup after deletion;
- calendar count and selected-day filtering;
- duplicate tickers rendering as separate dashboard rows;
- empty states;
- calculator arithmetic for supported contracts and risk modes; and
- palette/navigation states for the three public routes.

Manual acceptance:

1. Create a past-dated trade with optional chart images and confirm it appears only on that calendar date.
2. Open its day drawer, then the dashboard, and edit a slide.
3. Move the trade to another past date and confirm both day views update.
4. Confirm a future date cannot be selected or saved.
5. Verify calculator input does not create, edit, or otherwise affect journal records.

## Deferred work

- configurable/custom templates;
- setup/note/tag features;
- P&L analytics and aggregate statistics;
- server persistence, authentication, backup/sync, and multi-device access;
- import/export;
- AI Coach; and
- every other platform feature present in the reference repositories.
