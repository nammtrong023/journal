import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  it('shows Journal navigation and highlights active Stats', () => {
    render(
      <MemoryRouter initialEntries={['/stats']}>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByText('Journal')).toBeVisible()
    expect(screen.queryByText('Stonk Journal')).not.toBeInTheDocument()
    expect(screen.queryByText('Default')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Calendar/i })).toBeVisible()
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeVisible()
    expect(screen.getByRole('link', { name: /Stats/i })).toBeVisible()
    expect(screen.getByRole('link', { name: /Calculate/i })).toBeVisible()
    expect(screen.getByRole('link', { name: /New Trade/i })).toBeVisible()
    expect(screen.getByRole('link', { name: /Stats/i })).toHaveClass('bg-accent-blue/10')
  })

  it('applies translate and opacity classes when collapsed to prevent overlap', () => {
    const { container } = render(
      <MemoryRouter>
        <Sidebar collapsed={true} />
      </MemoryRouter>
    )
    const aside = container.querySelector('aside')
    expect(aside).toHaveClass('-translate-x-full')
    expect(aside).toHaveClass('opacity-0')
    expect(aside).toHaveClass('pointer-events-none')
  })
})
