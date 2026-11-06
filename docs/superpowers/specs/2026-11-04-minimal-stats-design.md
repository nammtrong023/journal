# Minimal Stats — Design

## Outcome

Add a `/stats` page reached from the existing **Stats** item in the desktop sidebar. It is a quick, low-noise review surface for trades already logged in the local journal. It must never require extra journaling fields or process/rule tracking.

The page answers only two questions:

1. Is the logged trading record positive and within an acceptable drawdown?
2. Which existing ticker or session has the best observed edge?

## Scope and data rules

Use only existing `Trade` fields:

- `result` for dollar P&L and drawdown;
- `rMultiple` for R-based expectancy;
- `ticker` and `session` for breakdowns; and
- `tradeDate`, then `createdAt`, for chronological calculations.

No new fields, schema migrations, rule definitions, compliance flags, planned risk, trade duration, targets, position sizing, or account settings are part of this feature.

Completed-trade eligibility is deliberately metric-specific:

| Metric | Include a trade when |
| --- | --- |
| Dollar P&L, win rate, profit factor, max drawdown, equity curve | `result` is a finite number |
| Expectancy R | `rMultiple` is a finite number |
| Ticker/session table row | the row's relevant metric has at least one eligible trade |

Every summary and breakdown displays its sample count (`N`). A ticker/session row qualifies only after its group has at least **five trades with a finite `result`**; R-only records cannot create a leaderboard. This avoids presenting thin samples as an edge.

## Page design

The route fills the existing main content area and preserves the compact dark Stonk Journal visual system. It is intentionally a review page, not another dashboard of tiny widgets.

### Header and date range

Header copy: **Stats** with supporting copy: `A compact review of logged outcomes.`

Provide a compact, segmented date-range control:

- `30D`
- `90D`
- `All`

`All` is the default. The selected range filters by `tradeDate`, inclusive of the local current date. It affects every metric and breakdown on the page. This is not an account-level performance report.

### Six summary metrics

Display one responsive two-column (small) / three-column (large) summary section, without nested cards or decorative scores:

1. **Net P&L** — sum of eligible `result`; sublabel: `N closed trades`.
2. **Expectancy** — average eligible `rMultiple`, formatted `+0.42R`; sublabel: `N trades with R`.
3. **Profit Factor** — gross positive result divided by absolute gross negative result; show `—` if there are no losses, rather than an infinite value.
4. **Win Rate** — share of eligible result trades with `result > 0`; break-even (`0`) results stay in the denominator but not in either outcome group.
5. **Max Drawdown** — largest peak-to-trough decline in cumulative eligible dollar P&L over chronological trade order; show a positive currency magnitude.
6. **Largest Loss** — most-negative eligible dollar result as a positive currency magnitude; show `—` if there are no losses.

Net P&L, Expectancy, and Max Drawdown are visually primary. Profit Factor, Win Rate, and Largest Loss are quieter supporting figures. Green/red conveys positive/negative results only; labels and signs must retain meaning without colour.

Each dollar-result metric carries `N closed trades`; Expectancy carries its independent `N trades with R`. This makes the sample behind every displayed number explicit.

### Equity curve

Show one lightweight SVG or CSS-rendered chronological equity curve below the summaries. Each point is cumulative dollar P&L after an eligible trade, ordered by `tradeDate` then `createdAt`. Its header displays `Equity curve` and the same eligible trade count.

The empty state reads: `Log a result on a trade to see your equity curve.` The curve must have an accessible text summary of start value, end value, and max drawdown; it is not the sole carrier of information.

### Edge breakdowns

Render two small tables, first **By ticker**, then **By session**. Each qualifying row includes:

- name (use `Unspecified` for missing ticker/session);
- N closed-result trades;
- Net P&L;
- Expectancy R (`—` if no R values);
- Win rate (`—` if no dollar result values).

Sort rows by Net P&L descending, then alphabetically. When no group reaches five eligible trades, show a single quiet note: `Appears after 5 logged trades in one group.` This note replaces the table; it does not show a misleading partial leaderboard.

## Calculations and boundary behavior

Create pure, exported domain functions rather than calculating inside React components. The primary selector receives `Trade[]` and an optional range, returns a `StatsSnapshot` that contains all six metrics, curve points, and grouped breakdowns.

- Treat `0` as a valid result/R, never as missing.
- Exclude `undefined`, `NaN`, and non-finite values independently for `result` and `rMultiple`.
- Return `null` for metrics that lack the inputs required to calculate them.
- Calculate currency and R values using full precision; only format at the UI boundary.
- Do not call a payoff ratio `Profit Factor`.
- Do not calculate Sharpe, ROIC, rolling win rate, score/gamification, daily target, rule compliance, or position sizing in this feature.

## States and failures

- While reading IndexedDB: page-level `Loading stats…` state.
- Repository read failure: concise error with a `Retry` control that retries `listAll()`; do not show fabricated zeroes.
- No eligible dollar-result trades: summary shows `—` where appropriate, empty curve state, and no group tables.
- Trades with dollar result but no R remain fully represented in dollar metrics and curve; expectancy uses only R-eligible entries and states its N.
- Missing ticker/session is grouped as `Unspecified`; it is not silently discarded.

## Architecture

### Files

| Path | Responsibility |
| --- | --- |
| `src/domain/stats.ts` | Pure eligibility, range, aggregation, drawdown, curve, and breakdown functions plus public types. |
| `src/domain/stats.test.ts` | Deterministic unit coverage for calculations and edge cases. |
| `src/features/stats/StatsPage.tsx` | Fetch state, range selection, formatted rendering, accessible page structure. |
| `src/features/stats/EquityCurve.tsx` | Responsive, dependency-free curve visual and text alternative. |
| `src/features/stats/StatsPage.test.tsx` | Integration coverage using a mock repository. |
| `src/App.tsx` | Route `/stats` to `StatsPage`. |
| `src/styles/app.css` | Responsive stats page styling in the established token system. |
| `src/features/shell/Sidebar.test.tsx` | Confirms the Stats destination remains available. |

`StatsPage` accepts an optional `repository?: Pick<TradeRepository, 'listAll'>` prop for isolated component tests. Production defaults to `defaultRepository`.

## Verification and acceptance

Automated coverage must prove:

- range filtering is inclusive and uses local `tradeDate` strings;
- Net P&L, win rate, profit factor, expectancy R, largest loss, drawdown and equity sequence use the definitions above;
- zero values are included and missing/non-finite values are excluded only from the metrics they cannot support;
- breakdown tables need five eligible group trades and include `Unspecified` values;
- `/stats` route renders its loading, empty, normal and retry states; and
- Stats is reachable through the sidebar.

Manual acceptance:

1. Log a mix of trades with and without result/R; confirm each metric's N reflects the applicable data.
2. Confirm a five-trade ticker/session group appears and a four-trade group does not.
3. Switch 30D, 90D and All; confirm every number, curve and table changes together.
4. Inspect desktop and narrow layout: labels remain readable, the table can scroll horizontally inside its wrapper, and no page-level horizontal scroll appears.

## Explicitly deferred

- process tracking, rule compliance, planned risk, and R reconstruction;
- accounts, fees, broker imports, live positions and tax/reporting views;
- Sharpe, ROIC, rolling stats, daily targets, scores, badges and AI analysis;
- drill-down filters, export and custom date ranges.
