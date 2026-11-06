import React, { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  CalendarDays,
  LayoutGrid,
  PieChart,
  Calculator,
  PlusSquare,
} from 'lucide-react'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [privacyMode, setPrivacyMode] = useState(() => {
    try {
      return localStorage.getItem('journal.privacy_mode') === 'true'
    } catch {
      return false
    }
  })

  const handleTogglePrivacyMode = () => {
    setPrivacyMode((prev) => {
      const next = !prev
      try {
        localStorage.setItem('journal.privacy_mode', String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev)
  }

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden text-text-main">
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Persistent desktop left sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        {/* Main page view */}
        <div
          className={`main-content-layout flex flex-1 flex-col min-w-0 ${
            sidebarCollapsed ? 'sidebar-collapsed' : ''
          }`}
        >
          {/* Top Header Bar */}
          <TopHeader
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={handleToggleSidebar}
            privacyMode={privacyMode}
            onTogglePrivacyMode={handleTogglePrivacyMode}
          />

          {/* Main Page Content */}
          <main className="flex-1 pb-16 lg:pb-4 overflow-y-auto overflow-x-hidden min-h-0 min-w-0 flex flex-col">
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation bar */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 bg-bg-panel/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 py-1.5 lg:hidden select-none"
          aria-label="Mobile navigation"
        >
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2.5 rounded text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-accent-blue font-semibold'
                  : 'text-text-muted hover:text-text-strong'
              }`
            }
          >
            <CalendarDays size={18} />
            <span className="mt-0.5">Calendar</span>
          </NavLink>

          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2.5 rounded text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-accent-blue font-semibold'
                  : 'text-text-muted hover:text-text-strong'
              }`
            }
          >
            <LayoutGrid size={18} />
            <span className="mt-0.5">Dashboard</span>
          </NavLink>

          <NavLink
            to="/stats"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2.5 rounded text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-accent-blue font-semibold'
                  : 'text-text-muted hover:text-text-strong'
              }`
            }
          >
            <PieChart size={18} />
            <span className="mt-0.5">Stats</span>
          </NavLink>

          <NavLink
            to="/calculator"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2.5 rounded text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-accent-blue font-semibold'
                  : 'text-text-muted hover:text-text-strong'
              }`
            }
          >
            <Calculator size={18} />
            <span className="mt-0.5">Calculate</span>
          </NavLink>

          <Link
            to="/trades/new"
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded text-[10px] font-semibold text-accent-blue hover:brightness-110 active:scale-95 transition-all"
          >
            <PlusSquare size={18} />
            <span className="mt-0.5">New</span>
          </Link>
        </nav>
      </div>
    </div>
  )
}
