import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TradeEditor } from './TradeEditor'
import { format } from 'date-fns'

describe('TradeEditor', () => {
  let mockRepository: any

  beforeEach(() => {
    mockRepository = {
      create: vi.fn().mockResolvedValue({ id: 't1' }),
      update: vi.fn().mockResolvedValue({ id: 't1' }),
      get: vi.fn().mockResolvedValue(undefined),
      putImage: vi.fn().mockResolvedValue('img1'),
      getImage: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    }
  })

  it('renders four fixed Lathyrus slide editors', () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    render(
      <MemoryRouter>
        <TradeEditor repository={mockRepository} />
      </MemoryRouter>
    )
    expect(screen.getAllByTestId('slide-editor')).toHaveLength(4)
    expect(screen.getByLabelText(/Trade date/i)).toHaveAttribute('max', today)
  })

  it('renders the 3-column grid layout with Trade, Slide, and Preview columns', () => {
    const { container } = render(
      <MemoryRouter>
        <TradeEditor repository={mockRepository} />
      </MemoryRouter>
    )

    expect(container.querySelector('.trade-editor-grid')).toBeInTheDocument()
    expect(container.querySelector('.col-trade')).toBeInTheDocument()
    expect(container.querySelector('.col-slide')).toBeInTheDocument()
    expect(container.querySelector('.col-preview')).toBeInTheDocument()

    // 4 tabs in Slide column
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(4)

    // Main canvas in preview column
    expect(screen.getByTestId('recap-main-canvas')).toBeInTheDocument()
  })

  it('allows switching active slide via tabs', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TradeEditor repository={mockRepository} />
      </MemoryRouter>
    )

    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveClass('active')
    expect(screen.getByText('Slide 1 of 4')).toBeInTheDocument()

    // Switch to tab 2 (Profile)
    await user.click(tabs[1])
    expect(tabs[1]).toHaveClass('active')
    expect(screen.getByText('Slide 2 of 4')).toBeInTheDocument()

    // Switch to tab 4
    await user.click(tabs[3])
    expect(tabs[3]).toHaveClass('active')
    expect(screen.getByText('Slide 4 of 4')).toBeInTheDocument()
  })

  it('does not require a chart image to save', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <TradeEditor repository={mockRepository} />
      </MemoryRouter>
    )

    await user.selectOptions(screen.getByLabelText(/Ticker/i), 'NQ')
    await user.click(screen.getByRole('button', { name: /Save trade/i }))

    await waitFor(() => expect(mockRepository.create).toHaveBeenCalled())
  })

  it('does not display Result ($) or Skip this slide inputs', () => {
    render(
      <MemoryRouter>
        <TradeEditor repository={mockRepository} />
      </MemoryRouter>
    )

    expect(screen.queryByLabelText(/Result \(\$\)/i)).toBeNull()
    expect(screen.queryByText(/Skip this slide/i)).toBeNull()
    expect(screen.getByLabelText(/R Multiple/i)).toBeInTheDocument()
  })

  it('allows selecting emotions and persists them on save', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/trades/new?date=2026-11-06']}>
        <TradeEditor repository={mockRepository} />
      </MemoryRouter>
    )

    const calmBtn = await screen.findByRole('button', { name: /Calm/i })
    await user.click(calmBtn)
    expect(calmBtn).toHaveAttribute('aria-pressed', 'true')

    const tickerInput = screen.getByLabelText(/Ticker/i)
    await user.selectOptions(tickerInput, 'NQ')

    const saveBtn = screen.getByRole('button', { name: /Save trade/i })
    await user.click(saveBtn)

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: 'NQ',
        emotions: ['calm'],
      })
    )
  })

  it('allows selecting a chart background color on active slide and persists it on save', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/trades/new?date=2026-11-06']}>
        <TradeEditor repository={mockRepository} />
      </MemoryRouter>
    )

    // Click white theme preset button on active slide
    const whitePreset = screen.getByRole('button', { name: /Select Light \(White\)/i })
    await user.click(whitePreset)

    const tickerInput = screen.getByLabelText(/Ticker/i)
    await user.selectOptions(tickerInput, 'ES')

    const saveBtn = screen.getByRole('button', { name: /Save trade/i })
    await user.click(saveBtn)

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: 'ES',
        slides: expect.arrayContaining([
          expect.objectContaining({
            key: 'context',
            backgroundColor: '#ffffff',
          }),
        ]),
      })
    )
  })
})
