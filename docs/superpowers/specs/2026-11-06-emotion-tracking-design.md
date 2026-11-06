# Emotion Tracking & Cost of Tilt — Design Spec

## Outcome

Add emotion and trading psychology tracking to the local trading journal. It enables traders to log emotional states during trade entry/exit, measure the financial "Cost of Tilt" (losses directly tied to destructive emotional states), identify which psychological mindsets yield the highest win rates, and filter trade history by emotional tags.

## Scope and Data Rules

### 1. Domain Entities & Taxonomy (`src/domain/emotions.ts`)

```typescript
export type EmotionCategory = 'positive' | 'neutral' | 'tilt'

export interface EmotionTag {
  id: string
  label: string
  emoji: string
  category: EmotionCategory
}
```

#### Default Preset Tags (12 Tags)
| ID | Label | Emoji | Category |
| --- | --- | --- | --- |
| `calm` | Calm | 😌 | `positive` |
| `focused` | Focused | 🎯 | `positive` |
| `disciplined` | Disciplined | 💪 | `positive` |
| `confident` | Confident | 🚀 | `positive` |
| `tired` | Tired | 😴 | `neutral` |
| `uncertain` | Uncertain | 🤔 | `neutral` |
| `anxious` | Anxious | 😰 | `tilt` |
| `fearful` | Fearful | 😨 | `tilt` |
| `greedy` | Greedy | 🤑 | `tilt` |
| `frustrated` | Frustrated | 🥱 | `tilt` |
| `impulsive` | Impulsive | 🎲 | `tilt` |
| `revenge_trading` | Revenge Trading | 🤬 | `tilt` |

### 2. Trade Schema Extension (`src/domain/trade.ts`)

Add optional `emotions` array to `Trade`:
```typescript
export interface Trade {
  // ... existing fields
  emotions?: string[] // array of emotion tag IDs
}
```
If a trade has no emotions logged, `emotions` is `undefined` or `[]`.

### 3. Analytics & Calculation Rules (`src/domain/emotion-stats.ts`)

Completed-trade eligibility matches `minimal-stats`: `result` must be a finite number.

#### A. Per-Emotion Performance
For each emotion tag $e$:
- `tradeCount`: Number of eligible trades where $e \in \text{trade.emotions}$.
- `winCount`: Trades with $e \in \text{trade.emotions}$ and $\text{result} > 0$.
- `lossCount`: Trades with $e \in \text{trade.emotions}$ and $\text{result} < 0$.
- `breakevenCount`: Trades with $e \in \text{trade.emotions}$ and $\text{result} = 0$.
- `winRate`: $\frac{\text{winCount}}{\text{tradeCount}}$ (expressed as percentage; if `tradeCount === 0`, return `0`).
- `netPnL`: Sum of all `result` values for trades tagged with $e$.

#### B. Cost of Tilt (Single KPI)
Measures the total dollar leakage caused by destructive mindsets.
$$\text{Cost of Tilt} = \left| \sum_{t \in T_{\text{tilt}},\, \text{result}_t < 0} \text{result}_t \right|$$
Where $T_{\text{tilt}}$ is the set of eligible trades containing **at least one** emotion tag categorized as `'tilt'`.
- **Deduplication guarantee**: If a single trade is tagged with both `frustrated` and `revenge_trading` and loses \$300, it contributes exactly \$300 to Cost of Tilt (not \$600).
- If no tilt trades have losses, `costOfTilt = 0`.

#### C. Top Edge Emotion & Top Leak Emotion
- **Top Edge**: The emotion tag with the highest positive `netPnL` (minimum 3 trades sample threshold to prevent small-sample distortion).
- **Top Leak**: The emotion tag with the largest negative `netPnL` (minimum 3 trades threshold).

---

## UI and Interaction Specification

### 1. Log Trade / Trade Modal Form
- Section title: `HOW WERE YOU FEELING? (SELECT ALL THAT APPLY)`
- Container: Flex-wrap chip tag buttons matching reference design:
  - Default state: Dark background (`rgba(255, 255, 255, 0.05)`), subtle border (`rgba(255, 255, 255, 0.1)`), light text.
  - Active state: Highlighted border, subtle glow or colored background (e.g. green tint for positive, amber/red tint for tilt).
  - Multi-select: Clicking toggles tag inclusion in `emotions[]`.

### 2. Trading Journal Table
- **Toolbar Filter**: A dropdown `Emotion: All | Calm | Revenge Trading | ...` to filter the table to trades matching the selected emotion.
- **Trade Row**: Display small pill badges for active emotions in the expanded details row.

### 3. Stats / Dashboard View
- **KPI Card**: `Cost of Tilt` prominently displayed with supporting sublabel: `Losses on X tilt trades`.
- **Emotion Breakdown Table**:
  - Columns: `Emotion` | `Trades (N)` | `Win Rate` | `Net P&L`
  - Sorted by Net P&L ascending or descending.

### 4. System Tab Settings
- Emotion Tag Management section:
  - List of active emotion tags.
  - Ability to add a custom emotion tag (Label, Emoji, Category).
  - Ability to toggle or delete custom tags.

---

## Edge Cases & Error Handling

1. **No emotions selected on trade**: Valid. The trade is excluded from emotion aggregations but included in global P&L.
2. **Zero tilt losses**: Cost of Tilt displays as `$0` (or `—`), not an error.
3. **Small sample sizes**: Top Edge / Top Leak requires $N \ge 3$ eligible trades; displays `Insufficient data` if threshold not met.
4. **Deleted custom emotion tags**: Existing trades referencing an orphaned emotion ID retain the label or fall back gracefully to displaying the raw ID.
