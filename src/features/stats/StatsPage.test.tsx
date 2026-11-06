import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Trade } from '../../domain/trade'
import { StatsPage } from './StatsPage'

const makeTrade = (id: string, result: number, rMultiple: number, ticker = 'MNQ'): Trade => ({
  id,
  tradeDate: '2026-11-04',
  templateVersion: 1,
  ticker,
  side: 'Long',
  session: 'New York AM',
  volatilityDriver: '',
  result,
  rMultiple,
  slides: [],
  createdAt: `2026-11-04T09:0${id}:00.000Z`,
  updatedAt: '2026-11-04T10:00:00.000Z',
})

describe('StatsPage', () => {
  it('renders a low-noise snapshot with N, curve summary, and no process-tracking controls', async () => {
    render(<StatsPage repository={{ listAll: vi.fn().mockResolvedValue([
      makeTrade('1', 100, 1), makeTrade('2', -50, -0.5), makeTrade('3', 75, 0.75),
    ]) }} />)

    expect(screen.getByText('Loading stats…')).toBeVisible()
    expect(await screen.findByText('Net P&L')).toBeVisible()
    expect(screen.getAllByText('N closed trades: 3')).toHaveLength(6)
    expect(screen.getByText('Expectancy')).toBeVisible()
    expect(screen.getByRole('img', { name: /Equity curve/i })).toBeVisible()
    expect(screen.queryByText(/rule compliance|planned risk|daily target/i)).not.toBeInTheDocument()
  })

  it('recalculates a scoped snapshot when the 30D control is selected', async () => {
    const user = userEvent.setup()
    render(<StatsPage repository={{ listAll: vi.fn().mockResolvedValue([
      { ...makeTrade('1', 500, 5), id: 'old', tradeDate: '2026-01-01' },
      makeTrade('2', 25, 0.25),
    ]) }} />)

    await screen.findByText('$525.00')
    await user.click(screen.getByRole('button', { name: '30D' }))
    expect(await screen.findByText('$25.00')).toBeVisible()
  })

  it('shows the group threshold note and retries a failed repository read', async () => {
    const retry = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([
        makeTrade('1', 10, 1), makeTrade('2', 10, 1),
        makeTrade('3', 10, 1), makeTrade('4', 10, 1),
      ])
    const user = userEvent.setup()
    render(<StatsPage repository={{ listAll: retry }} />)

    expect(await screen.findByText('Could not load stats.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findAllByText('Appears after 5 logged trades in one group.')).toHaveLength(2)
    expect(retry).toHaveBeenCalledTimes(2)
  })

  it('renders Cost of Tilt card and emotion summary when tilt trades exist', async () => {
    render(
      <StatsPage
        repository={{
          listAll: vi.fn().mockResolvedValue([
            { ...makeTrade('1', -250, -1), emotions: ['revenge_trading'] },
            { ...makeTrade('2', 400, 2), emotions: ['disciplined'] },
          ]),
        }}
      />
    )

    expect(await screen.findByText(/Cost of Tilt/i)).toBeInTheDocument()
    expect(screen.getByText('-$250')).toBeInTheDocument()
    expect(screen.getByText('Revenge Trading')).toBeInTheDocument()
  })

  it('renders Cost of Tilt in R when tilt trades have only R-multiples', async () => {
    render(
      <StatsPage
        repository={{
          listAll: vi.fn().mockResolvedValue([
            { ...makeTrade('1', undefined as any, -2.5), emotions: ['revenge_trading'] },
            { ...makeTrade('2', undefined as any, 3), emotions: ['disciplined'] },
          ]),
        }}
      />
    )

    expect(await screen.findByText(/Cost of Tilt/i)).toBeInTheDocument()
    expect(screen.getByText('-2.5R')).toBeInTheDocument()
  })
})
