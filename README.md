# Trading Journal 📈

A high-signal, dark-mode personal trading journal and analytics dashboard designed for active traders. Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **Dexie (IndexedDB)** for lightning-fast, local-first performance.

![Vercel Deployment Ready](https://img.shields.io/badge/Vercel-Deployment%20Ready-black?style=flat&logo=vercel)
![React 19](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript)
![Vite 6](https://img.shields.io/badge/Vite-6-purple?style=flat&logo=vite)
![Tests Passing](https://img.shields.io/badge/Tests-62%20passing-brightgreen?style=flat)

---

## ⚡ Features

- **Monthly Calendar**: P&L heatmaps, daily win/loss records, and quick day drill-downs.
- **Day Dashboard**: Deep dive into daily trades, timeframe badges, trade details, and visual slide previews.
- **Visual Trade Editor (Lathyrus Template)**:
  - 4-slide fixed recap layout (Overview, Entry, Management, Exit).
  - Drag-and-drop / paste chart image upload.
  - Interactive canvas preview and snapshot rendering.
  - Automatic chart background color detection and custom color palette.
  - Emotional state tracking (Confidence, FOMO, Revenge, Hesitant, Calm, etc.).
- **Performance Analytics**:
  - Net P&L, Win Rate, Profit Factor, Average R expectancy.
  - Interactive Equity Curve chart.
  - Emotion vs. Performance correlation insights.
- **Futures Contract Calculator**:
  - Multi-asset contract specs (NQ, ES, YM, RTY, CL, GC, BTC, etc.).
  - Account risk sizing (USD or % of account).
  - Stop loss & profit target calculations with tick increments.
- **Local-First & Private**:
  - Full client-side persistence with IndexedDB via Dexie.js.
  - Zero external database required — your trading data remains in your browser.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node 20 / 24)
- npm, pnpm, or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/nammtrong023/journal.git
cd journal

# Install dependencies
npm install
```

### Development
```bash
# Start local dev server at http://localhost:5173
npm run dev
```

### Testing
```bash
# Run unit & integration tests
npm test
```

### Production Build
```bash
# Typecheck and bundle with Vite
npm run build

# Preview production build locally
npm run preview
```

---

## 🌐 Deploy to Vercel

### Option 1: Import via Vercel Dashboard (Recommended)
1. Push this repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..." > "Project"**.
3. Select your `journal` repository.
4. Framework Preset will automatically detect **Vite**.
5. Click **Deploy**.

### Option 2: Deploy with Vercel CLI
```bash
npm install -g vercel
vercel
```

The repository includes `vercel.json` preconfigured with:
- Single-page application (SPA) client-side rewrite rules (prevents 404s on page refresh).
- 1-year immutable caching for static asset chunks (`/assets/*`).
- Security response headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).

---

## 📂 Project Structure

```
journal/
├── public/                 # Static assets & favicons
├── src/
│   ├── data/               # Dexie IndexedDB repository & schema
│   ├── domain/             # Business logic (trade calculations, stats, emotions)
│   ├── features/
│   │   ├── calculator/     # Futures position sizing & risk calculator
│   │   ├── calendar/       # Monthly P&L calendar & day slideover
│   │   ├── day-dashboard/  # Daily trade recap & slide cards
│   │   ├── shell/          # Navigation sidebar & top header
│   │   ├── stats/          # Performance metrics & equity curve
│   │   └── trade-template/ # Lathyrus slide editor & canvas generator
│   ├── styles/             # Design tokens & dark theme styles
│   └── test/               # Vitest suite & test setups
├── vercel.json             # Vercel deployment configuration
└── vite.config.ts          # Vite build config with manual chunk splitting
```

---

## 📄 License

Private / Personal Trading Journal.
