import 'fake-indexeddb/auto'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { DayDashboardPage } from './DayDashboardPage'
import { Trade } from '../../domain/trade'

describe('DayDashboardPage', () => {
  const nqA: Trade = {
    id: 't-1',
    tradeDate: '2026-11-04',
    templateVersion: 1,
    ticker: 'NQ',
    side: 'Long',
    session: 'NY AM',
    result: 250,
    rMultiple: 2,
    slides: [
      { key: 'context', value: 'Continuation', timeframe: 'Daily', subtitle: 'HTF', fit: 'contain', skip: false }
    ],
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
    slides: [
      { key: 'context', value: 'Reversal', timeframe: 'Daily', subtitle: 'HTF', fit: 'contain', skip: false }
    ],
    createdAt: '2026-11-04T14:00:00Z',
    updatedAt: '2026-11-04T14:00:00Z',
  }

  const renderAt = (url: string, repo: any) => {
    return render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/dashboard" element={<DayDashboardPage repository={repo} />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('renders each trade as a separate row rather than grouping by ticker', async () => {
    const mockRepo: any = {
      listByDate: vi.fn().mockResolvedValue([{ ...nqA }, { ...nqB }]),
      getImage: vi.fn().mockResolvedValue(undefined),
    }

    renderAt('/dashboard?date=2026-11-04', mockRepo)
    expect(await screen.findAllByTestId('trade-recap-row')).toHaveLength(2)
  })

  it('uses an empty-state New Trade link for a day without records', async () => {
    const mockRepo: any = {
      listByDate: vi.fn().mockResolvedValue([]),
      getImage: vi.fn().mockResolvedValue(undefined),
    }

    renderAt('/dashboard?date=2026-11-04', mockRepo)
    const link = await screen.findByRole('link', { name: /New Trade/i })
    expect(link).toHaveAttribute('href', '/trades/new?date=2026-11-04')
  })

  it('opens full-screen zoom preview with original image when clicking slide image', async () => {
    // Mock URL.createObjectURL / revokeObjectURL for node/jsdom
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/fake-img')
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn()
    }

    const fakeBlob = new Blob(['fake image content'], { type: 'image/png' })
    const tradeWithImage: Trade = {
      ...nqA,
      slides: [
        {
          key: 'context',
          value: 'Continuation',
          timeframe: 'Daily',
          subtitle: 'HTF',
          fit: 'contain',
          skip: false,
          imageId: 'img-1',
        },
      ],
    }

    const mockRepo: any = {
      listByDate: vi.fn().mockResolvedValue([tradeWithImage]),
      getImage: vi.fn().mockImplementation((id: string) => {
        if (id === 'img-1') return Promise.resolve(fakeBlob)
        return Promise.resolve(undefined)
      }),
    }

    renderAt('/dashboard?date=2026-11-04', mockRepo)

    const chartImg = await screen.findByAltText('context chart')
    expect(chartImg).toBeInTheDocument()

    // Click on chart image to zoom
    await userEvent.click(chartImg)

    // Modal dialog appears with close button and original image
    const dialog = await screen.findByRole('dialog', { name: /original image zoom preview/i })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close zoom preview/i })).toBeInTheDocument()

    // Clicking close button dismisses dialog
    await userEvent.click(screen.getByRole('button', { name: /close zoom preview/i }))
    expect(screen.queryByRole('dialog', { name: /original image zoom preview/i })).not.toBeInTheDocument()
  })

  it('filters trades when an emotion is selected in the filter dropdown', async () => {
    const user = userEvent.setup()
    const mockRepo: any = {
      listByDate: vi.fn().mockResolvedValue([
        { ...nqA, id: 't1', ticker: 'NQ', emotions: ['calm'] },
        { ...nqB, id: 't2', ticker: 'ES', emotions: ['revenge_trading'] },
      ]),
      getImage: vi.fn().mockResolvedValue(undefined),
    }

    renderAt('/dashboard?date=2026-11-04', mockRepo)

    expect(await screen.findByText('NQ')).toBeInTheDocument()
    expect(screen.getByText('ES')).toBeInTheDocument()

    const filterSelect = screen.getByLabelText(/Filter by Emotion/i)
    await user.selectOptions(filterSelect, 'revenge_trading')

    expect(screen.queryByText('NQ')).not.toBeInTheDocument()
    expect(screen.getByText('ES')).toBeInTheDocument()
  })

  it('renders slide cards with custom background colors and semantic timeframe badges', async () => {
    const tradeWithColors: Trade = {
      ...nqA,
      slides: [
        {
          key: 'context',
          value: 'Continuation',
          timeframe: 'Daily',
          subtitle: 'HTF',
          fit: 'contain',
          backgroundColor: '#ffffff',
          skip: false,
        },
      ],
    }
    const mockRepo: any = {
      listByDate: vi.fn().mockResolvedValue([tradeWithColors]),
      getImage: vi.fn().mockResolvedValue(undefined),
    }

    renderAt('/dashboard?date=2026-11-04', mockRepo)

    const badge = await screen.findByTestId('timeframe-badge')
    expect(badge).toHaveTextContent('Daily')
    expect(badge).toHaveAttribute('data-tier', 'htf')

    const slideBody = document.querySelector('.slide-card-body') as HTMLElement
    expect(slideBody).toBeInTheDocument()
    expect(slideBody.style.backgroundColor).toBe('rgb(255, 255, 255)')
  })
})
