import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TopHeader } from './TopHeader'

describe('TopHeader', () => {
  it('does not display account balance or Default pill', () => {
    render(
      <MemoryRouter>
        <TopHeader
          sidebarCollapsed={false}
          onToggleSidebar={vi.fn()}
          privacyMode={false}
          onTogglePrivacyMode={vi.fn()}
        />
      </MemoryRouter>
    )

    expect(screen.queryByText('Default')).not.toBeInTheDocument()
    expect(screen.queryByText('Cash')).not.toBeInTheDocument()
    expect(screen.queryByText('Active')).not.toBeInTheDocument()
  })

  it('shows Journal logo and name when sidebar is collapsed', () => {
    render(
      <MemoryRouter>
        <TopHeader
          sidebarCollapsed={true}
          onToggleSidebar={vi.fn()}
          privacyMode={false}
          onTogglePrivacyMode={vi.fn()}
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: 'Journal' })).toBeVisible()
    expect(screen.queryByText('Stonk Journal')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Expand sidebar/i })).toBeVisible()
  })
})
