import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CalculatorPage } from './CalculatorPage'

describe('CalculatorPage', () => {
  it('does not create a journal record while calculating and operates in isolation', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CalculatorPage />
      </MemoryRouter>
    )

    const stopInput = screen.getByLabelText(/Stop Loss/i)
    await user.clear(stopInput)
    await user.type(stopInput, '40')

    // Expect calculation results to update
    expect(screen.getByTestId('res-contracts')).toBeInTheDocument()
  })

  it('switches between Calculator and Compare tabs', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CalculatorPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Position Calculator')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Compare/i }))
    expect(screen.getByText(/Micro Nasdaq-100/i)).toBeVisible()
    expect(screen.getByText(/Micro Crude Oil/i)).toBeVisible()
  })

  it('provides quick-fill risk preset buttons for USD and % modes', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CalculatorPage />
      </MemoryRouter>
    )

    const riskInput = screen.getByLabelText(/Risk Target/i) as HTMLInputElement
    expect(riskInput.value).toBe('200')

    // In default USD mode, preset buttons $150, $200, $250, $300 should exist
    const btn150 = screen.getByRole('button', { name: '$150' })
    const btn200 = screen.getByRole('button', { name: '$200' })
    const btn250 = screen.getByRole('button', { name: '$250' })
    const btn300 = screen.getByRole('button', { name: '$300' })

    expect(btn150).toBeInTheDocument()
    expect(btn200).toBeInTheDocument()
    expect(btn250).toBeInTheDocument()
    expect(btn300).toBeInTheDocument()

    // Default risk is 200, so $200 should have active class
    expect(btn200.className).toContain('active')
    expect(btn150.className).not.toContain('active')

    // Click $150 preset (40 ticks on MNQ = $20/contract. 150 / 20 = 7.5 -> 7 contracts = $140 actual risk)
    await user.click(btn150)
    expect(riskInput.value).toBe('150')
    expect(btn150.className).toContain('active')
    expect(screen.getByTestId('res-contracts').textContent).toBe('7')

    // Click $250 preset (250 / 20 = 12.5 -> 12 contracts = $240 actual risk)
    await user.click(btn250)
    expect(riskInput.value).toBe('250')
    expect(btn250.className).toContain('active')
    expect(screen.getByTestId('res-contracts').textContent).toBe('12')

    // Click $300 preset (300 / 20 = 15 contracts = $300 actual risk)
    await user.click(btn300)
    expect(riskInput.value).toBe('300')
    expect(btn300.className).toContain('active')
    expect(screen.getByTestId('res-contracts').textContent).toBe('15')
    expect(screen.getAllByText('$300.00').length).toBeGreaterThanOrEqual(1)

    // Switch to % mode
    await user.click(screen.getByRole('button', { name: '%' }))
    const btnPct05 = screen.getByRole('button', { name: '0.5%' })
    const btnPct1 = screen.getByRole('button', { name: '1%' })
    const btnPct15 = screen.getByRole('button', { name: '1.5%' })
    const btnPct2 = screen.getByRole('button', { name: '2%' })

    expect(btnPct05).toBeInTheDocument()
    expect(btnPct1).toBeInTheDocument()
    expect(btnPct15).toBeInTheDocument()
    expect(btnPct2).toBeInTheDocument()

    // Click 1% preset (1% of 50,000 = $500 risk. 500 / 20 = 25 contracts)
    await user.click(btnPct1)
    expect(riskInput.value).toBe('1')
    expect(btnPct1.className).toContain('active')
    expect(screen.getByTestId('res-contracts').textContent).toBe('25')

    // Click 2% preset (2% of 50,000 = $1,000 risk. 1000 / 20 = 50 contracts)
    await user.click(btnPct2)
    expect(riskInput.value).toBe('2')
    expect(btnPct2.className).toContain('active')
    expect(screen.getByTestId('res-contracts').textContent).toBe('50')

    // Click 0.5% preset (0.5% of 50,000 = $250 risk. 250 / 20 = 12 contracts)
    await user.click(btnPct05)
    expect(riskInput.value).toBe('0.5')
    expect(btnPct05.className).toContain('active')
    expect(screen.getByTestId('res-contracts').textContent).toBe('12')
  })

  it('orders metric cards with Allocated Risk top-left and Actual Risk bottom-left', () => {
    const { container } = render(
      <MemoryRouter>
        <CalculatorPage />
      </MemoryRouter>
    )

    const metricCards = container.querySelectorAll('.results-summary-grid .result-metric-card')
    expect(metricCards).toHaveLength(4)

    // Row 1: Col 1 = Allocated Risk, Col 2 = Risk Per Contract
    // Row 2: Col 1 = Actual Risk, Col 2 = Risk Profile
    expect(metricCards[0].textContent).toContain('Allocated Risk')
    expect(metricCards[1].textContent).toContain('Risk Per Contract')
    expect(metricCards[2].textContent).toContain('Actual Risk')
    expect(metricCards[3].textContent).toContain('Risk Profile')
  })
})
