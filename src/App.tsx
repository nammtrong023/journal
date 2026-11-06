import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from './features/shell/AppShell'

const CalendarPage = lazy(() => import('./features/calendar/CalendarPage').then(m => ({ default: m.CalendarPage })))
const DayDashboardPage = lazy(() => import('./features/day-dashboard/DayDashboardPage').then(m => ({ default: m.DayDashboardPage })))
const StatsPage = lazy(() => import('./features/stats/StatsPage').then(m => ({ default: m.StatsPage })))
const CalculatorPage = lazy(() => import('./features/calculator/CalculatorPage').then(m => ({ default: m.CalculatorPage })))
const TradeEditor = lazy(() => import('./features/trade-template/TradeEditor').then(m => ({ default: m.TradeEditor })))

function PageFallback() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  )
}

export function App() {
  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/calendar" replace />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/dashboard" element={<DayDashboardPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/trades/new" element={<TradeEditor />} />
          <Route path="/trades/:tradeId" element={<TradeEditor />} />
          <Route path="*" element={<Navigate to="/calendar" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}

export default App
