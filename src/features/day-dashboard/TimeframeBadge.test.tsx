import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimeframeBadge, getTimeframeTier } from './TimeframeBadge'

describe('TimeframeBadge', () => {
  it('correctly categorizes timeframes into HTF, MTF, and LTF tiers', () => {
    // HTF
    expect(getTimeframeTier('Daily')).toBe('htf')
    expect(getTimeframeTier('D')).toBe('htf')
    expect(getTimeframeTier('Weekly')).toBe('htf')
    expect(getTimeframeTier('W')).toBe('htf')
    expect(getTimeframeTier('1D')).toBe('htf')
    expect(getTimeframeTier('1M')).toBe('htf')
    expect(getTimeframeTier('Monthly')).toBe('htf')

    // MTF
    expect(getTimeframeTier('H4')).toBe('mtf')
    expect(getTimeframeTier('4H')).toBe('mtf')
    expect(getTimeframeTier('h1')).toBe('mtf')
    expect(getTimeframeTier('1H')).toBe('mtf')
    expect(getTimeframeTier('30m')).toBe('mtf')
    expect(getTimeframeTier('m30')).toBe('mtf')

    // LTF
    expect(getTimeframeTier('15m')).toBe('ltf')
    expect(getTimeframeTier('5m')).toBe('ltf')
    expect(getTimeframeTier('3m')).toBe('ltf')
    expect(getTimeframeTier('1m')).toBe('ltf')
    expect(getTimeframeTier('30s')).toBe('ltf')

    // Default
    expect(getTimeframeTier('CustomTick')).toBe('default')
  })

  it('renders nothing if timeframe is empty', () => {
    const { container } = render(<TimeframeBadge timeframe="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders badge with correct tier data attribute and text', () => {
    render(<TimeframeBadge timeframe="Daily" />)
    const badge = screen.getByTestId('timeframe-badge')
    expect(badge).toHaveTextContent('Daily')
    expect(badge).toHaveAttribute('data-tier', 'htf')
    expect(badge.className).toContain('!text-white')
    expect(badge.className).toContain('border-indigo-400')
  })

  it('renders MTF badge with sky color', () => {
    render(<TimeframeBadge timeframe="H4" />)
    const badge = screen.getByTestId('timeframe-badge')
    expect(badge).toHaveAttribute('data-tier', 'mtf')
    expect(badge.className).toContain('border-sky-400')
  })

  it('renders LTF badge with amber color', () => {
    render(<TimeframeBadge timeframe="3m" />)
    const badge = screen.getByTestId('timeframe-badge')
    expect(badge).toHaveAttribute('data-tier', 'ltf')
    expect(badge.className).toContain('border-amber-400')
  })
})
