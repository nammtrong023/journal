import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { TradeRepository } from '../data/trade-repository'
import { CalendarPage } from '../features/calendar/CalendarPage'
import { DayDashboardPage } from '../features/day-dashboard/DayDashboardPage'
import { TradeEditor } from '../features/trade-template/TradeEditor'

describe('Journal Lifecycle Flow', () => {
  let repository: TradeRepository
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    repository = new TradeRepository(`lifecycle-test-${Date.now()}`)
  })

  function renderApp(initialPath = '/calendar') {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/calendar" element={<CalendarPage repository={repository} initialMonth={new Date(2026, 10, 1)} />} />
          <Route path="/dashboard" element={<DayDashboardPage repository={repository} />} />
          <Route path="/trades/new" element={<TradeEditor repository={repository} />} />
          <Route path="/trades/:tradeId" element={<TradeEditor repository={repository} />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('creates a past trade, exposes it in its day views, moves it, then removes it with its images', async () => {
    // 1. Create trade through editor
    const { unmount } = renderApp('/trades/new?date=2026-11-03')

    const dateInput = screen.getByLabelText(/Trade date/i)
    const tickerInput = screen.getByLabelText(/Ticker/i)
    const fileInputs = document.querySelectorAll('input[type="file"]')

    await user.clear(dateInput)
    await user.type(dateInput, '2026-11-03')
    await user.selectOptions(tickerInput, 'NQ')

    const testFile = new File(['chart-bytes'], 'chart.png', { type: 'image/png' })
    if (fileInputs.length > 0) {
      await user.upload(fileInputs[0] as HTMLElement, testFile)
    }

    await user.click(screen.getByRole('button', { name: /Save trade/i }))

    await waitFor(async () => {
      const created = await repository.listByDate('2026-11-03')
      expect(created).toHaveLength(1)
    })
    const tradesNov3 = await repository.listByDate('2026-11-03')
    const tradeId = tradesNov3[0].id
    unmount()

    // 2. Open Calendar day
    const calendarView = renderApp('/calendar')
    const dayBtn = await screen.findByRole('button', { name: /November 3, 2026/i })
    await user.click(dayBtn)

    expect(await screen.findByRole('dialog', { name: /November 3, 2026/i })).toBeVisible()
    expect(screen.getByText('NQ')).toBeVisible()

    // 3. Navigate to Dashboard for this day
    const dashLink = screen.getByRole('link', { name: /Go to Dashboard for this day/i })
    expect(dashLink).toHaveAttribute('href', '/dashboard?date=2026-11-03')
    calendarView.unmount()

    // 4. Inspect Day Dashboard
    const dashboardView = renderApp('/dashboard?date=2026-11-03')
    const rows = await screen.findAllByTestId('trade-recap-row')
    expect(rows).toHaveLength(1)
    dashboardView.unmount()

    // 5. Move trade to 2026-11-04 through editor
    const editView = renderApp(`/trades/${tradeId}`)
    const editDateInput = await screen.findByLabelText(/Trade date/i)
    await user.clear(editDateInput)
    await user.type(editDateInput, '2026-11-04')
    await user.click(screen.getByRole('button', { name: /Save trade/i }))

    await waitFor(async () => {
      const nov3 = await repository.listByDate('2026-11-03')
      expect(nov3).toHaveLength(0)
    })
    expect(await repository.listByDate('2026-11-04')).toHaveLength(1)
    editView.unmount()

    // 6. Delete trade through editor
    const deleteView = renderApp(`/trades/${tradeId}`)
    const deleteBtn = await screen.findByRole('button', { name: /Delete trade/i })
    await user.click(deleteBtn)

    const confirmBtn = await screen.findByRole('button', { name: /Confirm Delete/i })
    await user.click(confirmBtn)

    await waitFor(async () => {
      const nov4 = await repository.listByDate('2026-11-04')
      expect(nov4).toHaveLength(0)
    })
    expect(await repository.countImages()).toBe(0)
    deleteView.unmount()
  })
})
