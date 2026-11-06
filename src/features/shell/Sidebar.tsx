import {
  CalendarDays,
  LayoutGrid,
  PieChart,
  Calculator,
  PlusSquare,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { StonkLogo } from './TopHeader'

export function Sidebar({ collapsed = false }: { collapsed?: boolean; onToggleCollapse?: () => void }) {
  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-30 flex flex-col bg-bg-main border-r border-border transition-all duration-200 select-none overflow-hidden ${
        collapsed ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'
      } hidden lg:flex`}
      style={{ width: 'var(--sidebar-width, 250px)' }}
      aria-label="Primary navigation"
    >
      <div className="shrink-0 flex flex-col h-full" style={{ width: 'var(--sidebar-width, 250px)' }}>
        {/* Brand Header */}
        <div className="h-14 px-6 shrink-0 flex items-center border-b border-border">
          <div className="flex items-center gap-3 text-text-strong">
            <StonkLogo className="w-5 h-6 text-text-strong" />
            <span className="text-base font-bold text-text-strong whitespace-nowrap tracking-tight">
              Journal
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col py-4">
        {/* Navigation */}
        <nav className="flex flex-col space-y-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-6 py-3 text-xs font-normal transition-colors ${
                isActive
                  ? 'text-text-strong bg-accent-blue/10 border-r-[3px] border-accent-blue font-semibold'
                  : 'text-text-muted hover:text-text-strong hover:bg-white/[0.04]'
              }`
            }
          >
            <LayoutGrid size={16} className="shrink-0" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/stats"
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-6 py-3 text-xs font-normal transition-colors ${
                isActive
                  ? 'text-text-strong bg-accent-blue/10 border-r-[3px] border-accent-blue font-semibold'
                  : 'text-text-muted hover:text-text-strong hover:bg-white/[0.04]'
              }`
            }
          >
            <PieChart size={16} className="shrink-0" />
            <span>Stats</span>
          </NavLink>

          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-6 py-3 text-xs font-normal transition-colors ${
                isActive
                  ? 'text-text-strong bg-accent-blue/10 border-r-[3px] border-accent-blue font-semibold'
                  : 'text-text-muted hover:text-text-strong hover:bg-white/[0.04]'
              }`
            }
          >
            <CalendarDays size={16} className="shrink-0" />
            <span>Calendar</span>
          </NavLink>

          <NavLink
            to="/calculator"
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-6 py-3 text-xs font-normal transition-colors ${
                isActive
                  ? 'text-text-strong bg-accent-blue/10 border-r-[3px] border-accent-blue font-semibold'
                  : 'text-text-muted hover:text-text-strong hover:bg-white/[0.04]'
              }`
            }
          >
            <Calculator size={16} className="shrink-0" />
            <span>Calculate</span>
          </NavLink>
        </nav>

        {/* Separator */}
        <div className="my-3 px-6" role="separator">
          <div className="w-full border-t border-border/60" />
        </div>

        {/* Action buttons */}
        <div className="space-y-1">
          <Link
            to="/trades/new"
            className="flex items-center gap-3.5 px-6 py-3 text-xs font-medium transition-colors cursor-pointer text-accent-blue hover:bg-white/[0.04]"
          >
            <PlusSquare size={16} className="shrink-0 text-accent-blue" />
            <span>New Trade</span>
          </Link>
        </div>
      </div>
    </div>
  </aside>
)
}
