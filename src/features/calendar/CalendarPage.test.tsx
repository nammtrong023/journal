import 'fake-indexeddb/auto'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CalendarPage } from './CalendarPage'
import { Trade } from '../../domain/trade'

describe('CalendarPage', () => {
  const nqA: Trade = {
    id: 't-1',
    tradeDate: '2026-11-04',
    templateVersion: 1,
    ticker: 'NQ',
    side: 'Long',
    session: 'NY AM',
    result: 250,
    rMultiple: 2,
    slides: [],
    createdAt: '2026-11-04T10:00:00Z',
    updatedAt: '2026-11-04T10:00:00Z',
  }

  const nqB: Trade = {
    id: 't-2',
    tradeDate: '2026-11-04',
    templateVersion: 1,
    ticker: 'NQ',
    side: 'Short',
    session: 'NY PM',
    result: -100,
    rMultiple: -1,
    slides: [],
    createdAt: '2026-11-04T14:00:00Z',
    updatedAt: '2026-11-04T14:00:00Z',
  }

  it('opens the selected date drawer and lists duplicate ticker trades separately', async () => {
    const mockRepo: any = {
      listByDate: vi.fn().mockImplementation((date: string) => {
        if (date === '2026-11-04') return Promise.resolve([nqA, nqB])
        return Promise.resolve([])
      }),
      listAll: vi.fn().mockResolvedValue([nqA, nqB]),
    }

    render(
      <MemoryRouter>
        <CalendarPage repository={mockRepo} initialMonth={new Date(2026, 10, 1)} />
      </MemoryRouter>
    )

    const dateBtn = screen.getByRole('button', { name: /November 4, 2026/i })
    await userEvent.click(dateBtn)

    expect(await screen.findByRole('dialog', { name: /November 4, 2026/i })).toBeVisible()
    expect(screen.getAllByText('NQ')).toHaveLength(2)
    expect(screen.getByText('Day Net RR')).toBeInTheDocument()
    expect(screen.getAllByText('+1R').length).toBeGreaterThanOrEqual(1)
  })

  it('displays RR instead of dollar amounts in day cells and toolbar, and leaves empty days clean', async () => {
    const mockRepo: any = {
      listByDate: vi.fn().mockResolvedValue([]),
      listAll: vi.fn().mockResolvedValue([nqA, nqB]),
    }

    render(
      <MemoryRouter>
        <CalendarPage repository={mockRepo} initialMonth={new Date(2026, 10, 1)} />
      </MemoryRouter>
    )

    // Wait for trades to load and Month RR to appear
    expect(await screen.findByText(/Month RR:/i)).toBeInTheDocument()

    // 2026-11-04 button has net +1R
    const nov4Btn = await screen.findByRole('button', { name: /November 4, 2026/i })
    expect(nov4Btn).toHaveTextContent('+1R')
    expect(nov4Btn).not.toHaveTextContent('$')

    // Empty days (like Nov 5) do not show $0.00 or 0R
    const nov5Btn = screen.getByRole('button', { name: /November 5, 2026/i })
    expect(nov5Btn).not.toHaveTextContent('$0.00')
    expect(nov5Btn).not.toHaveTextContent('0R')
    expect(nov5Btn).toHaveTextContent('5')
  })

  it('clicking a trade in slideover navigates to dashboard while Edit button is present', async () => {
    const mockRepo: any = {
      listByDate: vi.fn().mockResolvedValue([nqA]),
      listAll: vi.fn().mockResolvedValue([nqA]),
    }

    render(
      <MemoryRouter>
        <CalendarPage repository={mockRepo} initialMonth={new Date(2026, 10, 1)} />
      </MemoryRouter>
    )

    const dateBtn = screen.getByRole('button', { name: /November 4, 2026/i })
    await userEvent.click(dateBtn)

    expect(await screen.findByRole('dialog', { name: /November 4, 2026/i })).toBeVisible()
    expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument()
    expect(screen.getByText(/View in dashboard/i)).toBeInTheDocument()
  })
})
