# Chart Card Background Matching & Timeframe Badge Highlight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate jarring letterboxing on chart screenshots by adding seamless background color matching (auto-detected on upload + trade/slide level palette) and highlight timeframe badges with semantic, high-contrast tiering (HTF/MTF/LTF).

**Architecture:** 
1. Extend `Slide` in domain model with `backgroundColor?: string`.
2. Add lightweight client-side edge color auto-detector using HTML Canvas to sample screenshot border pixels on paste/upload.
3. Add a Trade-level color palette toolbar and per-slide override controls in `TradeEditor`.
4. Render `SlideCard` and zoom modal with dynamic `backgroundColor` so charts seamlessly blend edge-to-edge.
5. Create a dedicated `TimeframeBadge` component with high-contrast, WCAG AA compliant semantic color categorizing (HTF = Indigo, MTF = Sky/Cyan, LTF = Amber).

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Vitest, Testing Library.

---

## Global Constraints

- **Design Language**: Follow `PRODUCT.md` ("Focused, calm, and precise. Dark and data-forward, with emphasis on signal over ceremony").
- **Contrast**: Maintain WCAG AA (≥4.5:1 text-to-badge background contrast).
- **Data Persistence**: Backwards compatible — existing trades without `backgroundColor` fallback to default dark `#12131a`.
- **Zero Friction**: Auto-detection must run asynchronously on image selection without blocking UI thread.

---

## Task 1: Domain Model Extension for Slide Background Color

**Files:**
- Modify: `src/domain/trade.ts`
- Tests: Existing tests in `src/domain/`

- [ ] **Step 1: Update Slide interface in `src/domain/trade.ts`**
  Add `backgroundColor?: string` to `Slide`:
  ```typescript
  export interface Slide {
    key: SlideKey
    value: string | string[]
    timeframe: string
    subtitle: string
    imageId?: string
    fit: 'contain' | 'cover'
    backgroundColor?: string
    skip: boolean
  }
  ```

- [ ] **Step 2: Run domain tests to ensure compatibility**
  Run: `npm test src/domain`
  Expected: All domain tests pass.

- [ ] **Step 3: Commit domain model changes**
  Run: `git commit -am "feat(domain): add backgroundColor field to Slide"`

---

## Task 2: Chart Border Color Auto-Detector

**Files:**
- Create: `src/features/trade-template/image-color-detector.ts`
- Create: `src/features/trade-template/image-color-detector.test.ts`

- [ ] **Step 1: Write unit test for image color detector**
  Create `src/features/trade-template/image-color-detector.test.ts` testing:
  - Extraction from a mock white canvas image returns `#ffffff`.
  - Extraction from a mock dark canvas image returns dark hex.
  - Fallback handling when image fails or is empty.

- [ ] **Step 2: Implement `detectChartBackgroundColor` in `src/features/trade-template/image-color-detector.ts`**
  - Draw image to a small offscreen canvas (or sample 4 corners + 4 edge midpoints: (2, 2), (w-2, 2), (2, h-2), (w-2, h-2)).
  - Convert RGB values to hex.
  - If corner pixels have low delta (homogeneous border), return the dominant hex color.
  - If alpha is 0 or variance is high, return `null`.

- [ ] **Step 3: Run color detector tests**
  Run: `npx vitest run src/features/trade-template/image-color-detector.test.ts`
  Expected: Passes.

- [ ] **Step 4: Commit color detector utility**
  Run: `git commit -am "feat(trade-template): implement chart edge color auto-detector"`

---

## Task 3: Semantic Timeframe Badge Component

**Files:**
- Create: `src/features/day-dashboard/TimeframeBadge.tsx`
- Create: `src/features/day-dashboard/TimeframeBadge.test.tsx`
- Modify: `src/features/day-dashboard/SlideCard.tsx`

- [ ] **Step 1: Write unit test for TimeframeBadge**
  Create `src/features/day-dashboard/TimeframeBadge.test.tsx`:
  - HTF inputs ("Daily", "D", "Weekly", "W", "Monthly") get Indigo styling.
  - MTF inputs ("H4", "4H", "H1", "1H", "30m", "m30") get Sky/Cyan styling.
  - LTF inputs ("15m", "5m", "3m", "1m", "3M") get Amber/Gold styling.
  - Custom/unrecognized values render cleanly with high-contrast slate badge.

- [ ] **Step 2: Implement `TimeframeBadge`**
  In `src/features/day-dashboard/TimeframeBadge.tsx`:
  - Normalize input string (lowercase, trim).
  - Categorize into `htf`, `mtf`, `ltf`, or `default`.
  - Apply Tailwind classes:
    - `htf`: `bg-indigo-500/15 text-indigo-300 border-indigo-500/30`
    - `mtf`: `bg-sky-500/15 text-sky-300 border-sky-500/30`
    - `ltf`: `bg-amber-500/15 text-amber-300 border-amber-500/30`
    - `default`: `bg-white/10 text-text-strong border-white/20`
  - Font styling: `font-mono font-bold text-[10px] tracking-wide px-2 py-0.5 rounded border shadow-xs tabular-nums uppercase`.

- [ ] **Step 3: Integrate TimeframeBadge into `SlideCard.tsx`**
  Replace existing muted span in `SlideCard.tsx` with `<TimeframeBadge timeframe={slide.timeframe} />`.

- [ ] **Step 4: Run tests**
  Run: `npx vitest run src/features/day-dashboard/`
  Expected: All tests pass.

- [ ] **Step 5: Commit TimeframeBadge component**
  Run: `git commit -am "feat(ui): add semantic high-contrast TimeframeBadge"`

---

## Task 4: Dynamic SlideCard Background & Zoom Modal Integration

**Files:**
- Modify: `src/features/day-dashboard/SlideCard.tsx`
- Tests: `src/features/day-dashboard/DayDashboardPage.test.tsx`

- [ ] **Step 1: Update `SlideCard.tsx` image container styling**
  - Read `slide.backgroundColor`.
  - Set `slide-card-body` inline style: `style={{ backgroundColor: slide.backgroundColor || '#12131a' }}`.
  - In the zoom modal portal: apply `style={{ backgroundColor: slide.backgroundColor || '#12131a' }}` to the preview box so inspection is also seamless.

- [ ] **Step 2: Update tests in `DayDashboardPage.test.tsx`**
  Verify SlideCard renders custom background color when specified.

- [ ] **Step 3: Run dashboard tests**
  Run: `npx vitest run src/features/day-dashboard/DayDashboardPage.test.tsx`
  Expected: Passes.

- [ ] **Step 4: Commit SlideCard background styling**
  Run: `git commit -am "feat(day-dashboard): render slide card with matching background color"`

---

## Task 5: Trade Editor Color Palette & Auto-Detection Integration

**Files:**
- Create: `src/features/trade-template/ChartColorPalette.tsx`
- Modify: `src/features/trade-template/SlideEditor.tsx`
- Modify: `src/features/trade-template/TradeEditor.tsx`
- Modify: `src/features/trade-template/SlideCanvasPreview.tsx`
- Modify: `src/features/trade-template/TradeEditor.test.tsx`

- [ ] **Step 1: Implement `ChartColorPalette.tsx`**
  - Preset options:
    - `#ffffff` (White - TV Light)
    - `#f8f9fa` (Warm Off-White)
    - `#131722` (TV Dark)
    - `#12131a` (Slate Black - App Default)
  - Color input / EyeDropper trigger for custom hex.
  - Props: `currentColor?: string`, `onChange: (color: string) => void`, `size?: 'sm' | 'md'`.

- [ ] **Step 2: Connect Auto-Detection in `SlideEditor.tsx`**
  - When `onImageFileSelected(file)` is called, asynchronously invoke `detectChartBackgroundColor(file)`.
  - If a valid hex color is detected and `slide.backgroundColor` has not been manually changed, call `onChange({ ...slide, backgroundColor: detectedColor })`.
  - In `SlideEditor.tsx` controls row, add a per-slide palette selector so the user can easily see and override the current slide's background color.

- [ ] **Step 3: Add Trade-level Palette Bar in `TradeEditor.tsx`**
  - Place a compact palette bar right above the slide tabs (`01 CONTEXT`, `02 PROFILE`...).
  - When user selects a trade-level preset, batch update all slides' `backgroundColor`.

- [ ] **Step 4: Update `SlideCanvasPreview.tsx`**
  - In `SlideCanvasPreview.tsx`, apply `slide.backgroundColor || '#12131a'` to the preview box so the live preview immediately reflects the chosen color.

- [ ] **Step 5: Run TradeEditor tests**
  Run: `npx vitest run src/features/trade-template/`
  Expected: All trade-template tests pass.

- [ ] **Step 6: Commit TradeEditor palette and auto-picker**
  Run: `git commit -am "feat(trade-template): add trade and slide color palette with auto-detection"`

---

## Task 6: Full Verification & Build Quality Check

**Files:**
- All touched files

- [ ] **Step 1: Run complete test suite**
  Run: `npm test`
  Expected: 15/15 test suites pass with 100% green tests.

- [ ] **Step 2: Run production build check**
  Run: `npm run build`
  Expected: Vite builds successfully with zero TypeScript or asset errors.

- [ ] **Step 3: Verification review against UI/UX rules**
  - Contrast check: Badge text on badge background ≥ 4.5:1.
  - Border blending: Letterboxing seamlessly filled with no jarring borders.
  - Performance: Canvas pixel sampling is lightweight (< 15ms).
