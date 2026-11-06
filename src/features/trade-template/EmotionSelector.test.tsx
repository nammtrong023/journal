import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmotionSelector } from './EmotionSelector'

describe('EmotionSelector', () => {
  it('renders title and emotion chips', () => {
    render(<EmotionSelector selectedIds={[]} onChange={vi.fn()} />)
    expect(screen.getByText(/HOW WERE YOU FEELING\?/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Calm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Revenge Trading/i })).toBeInTheDocument()
  })

  it('toggles selection when chips are clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<EmotionSelector selectedIds={['calm']} onChange={onChange} />)

    const calmBtn = screen.getByRole('button', { name: /Calm/i })
    expect(calmBtn).toHaveAttribute('aria-pressed', 'true')

    const tiredBtn = screen.getByRole('button', { name: /Tired/i })
    expect(tiredBtn).toHaveAttribute('aria-pressed', 'false')

    await user.click(tiredBtn)
    expect(onChange).toHaveBeenCalledWith(['calm', 'tired'])

    await user.click(calmBtn)
    expect(onChange).toHaveBeenCalledWith([])
  })
})
