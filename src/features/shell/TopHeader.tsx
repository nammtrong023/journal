import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  PanelLeft,
  Filter,
  Search,
  Moon,
  Eye,
  EyeOff,
  Bell,
  ChevronDown,
  Check,
  Sliders,
  TrendingUp,
  Cloud,
} from 'lucide-react'
import type { TradeRepository } from '../../data/trade-repository'
import { isSupabaseConfigured } from '../../data/supabase'
import { CloudSyncModal } from './CloudSyncModal'

export function StonkLogo({ className = 'w-5 h-6' }: { className?: string }) {
  return (
    <svg
      className={`shrink-0 ${className}`}
      viewBox="0 0 162.3 187.39"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M132.83 29.781l29.46 17.038.01 34.691-29.47-17.291z"
        fill="var(--accent-blue)"
      />
      <path
        d="M162.3 98.59l-29.68-17.08v42.82l-80.5 46.29 29.06 16.77 81.13-46.87z"
        fill="currentColor"
      />
      <path
        d="M7.59 144.929l29.43 16.981 80.42-46.02V30.68L29.27 82.14V64.43l81.29-47.451L81.13 0 0 46.87l.02 85.26 88.73-51.04v17.29z"
        fill="currentColor"
      />
    </svg>
  )
}

interface TopHeaderProps {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  privacyMode: boolean
  onTogglePrivacyMode: () => void
  repository?: TradeRepository
}

export function TopHeader({
  sidebarCollapsed,
  onToggleSidebar,
  privacyMode,
  onTogglePrivacyMode,
}: TopHeaderProps) {
  const [activeFilter, setActiveFilter] = useState('All Trades')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [cloudModalOpen, setCloudModalOpen] = useState(false)
  const [activeViewTab, setActiveViewTab] = useState<'widgets' | 'table' | 'accounts'>('widgets')
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(() => isSupabaseConfigured())

  useEffect(() => {
    const handleConfigChange = () => setIsSupabaseConnected(isSupabaseConfigured())
    window.addEventListener('storage', handleConfigChange)
    window.addEventListener('supabase-config-changed', handleConfigChange)
    return () => {
      window.removeEventListener('storage', handleConfigChange)
      window.removeEventListener('supabase-config-changed', handleConfigChange)
    }
  }, [])

  const filterMenuRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setFilterMenuOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filterOptions = [
    'All Trades',
    'Winning Trades (> $0)',
    'Losses (< $0)',
    'New York AM',
    'High R Multiples (≥ 2R)',
  ]

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-bg-main/95 backdrop-blur-md px-4 lg:px-6 h-14 select-none shrink-0 transition-all duration-200">
      {/* Left side: Brand Logo (when sidebar collapsed or on mobile), Sidebar toggle */}
      <div className="flex items-center gap-3 lg:gap-4 min-w-0">
        {/* Brand logo when sidebar is collapsed or on mobile */}
        <Link
          to="/calendar"
          className={`items-center gap-2 text-text-strong hover:opacity-90 transition-opacity ${
            sidebarCollapsed ? 'flex' : 'flex lg:hidden'
          }`}
          aria-label="Journal"
        >
          <StonkLogo className="w-5 h-6 text-text-strong" />
          <span className="text-base font-bold text-text-strong whitespace-nowrap tracking-tight">
            Journal
          </span>
        </Link>

        {/* Sidebar Collapse / Expand Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-strong hover:bg-white/[0.06] border border-transparent hover:border-border transition-colors cursor-pointer shrink-0"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft size={18} />
        </button>
      </div>

      {/* Middle: Segmented View Switcher (Widgets / Table / Accounts) */}
      <div className="hidden xl:flex items-center p-0.5 bg-bg-panel border border-border rounded-lg text-xs font-medium select-none">
        <button
          type="button"
          onClick={() => setActiveViewTab('widgets')}
          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
            activeViewTab === 'widgets'
              ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30 font-semibold shadow-xs'
              : 'text-text-muted hover:text-text-strong hover:bg-white/[0.04]'
          }`}
        >
          Widgets
        </button>
        <button
          type="button"
          onClick={() => setActiveViewTab('table')}
          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
            activeViewTab === 'table'
              ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30 font-semibold shadow-xs'
              : 'text-text-muted hover:text-text-strong hover:bg-white/[0.04]'
          }`}
        >
          Table
        </button>
        <button
          type="button"
          onClick={() => setActiveViewTab('accounts')}
          className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
            activeViewTab === 'accounts'
              ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30 font-semibold shadow-xs'
              : 'text-text-muted hover:text-text-strong hover:bg-white/[0.04]'
          }`}
        >
          Accounts
        </button>
      </div>

      {/* Right side: Saved Filters, Omnibar Search, Utility Toggles, Profile Avatar */}
      <div className="flex items-center gap-2 lg:gap-3.5">
        {/* Saved Filters Dropdown */}
        <div className="relative hidden lg:block" ref={filterMenuRef}>
          <button
            type="button"
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md text-text-muted hover:text-text-strong hover:bg-white/[0.04] border border-border transition-colors cursor-pointer select-none"
            aria-expanded={filterMenuOpen}
          >
            <Filter size={13} className="text-text-muted shrink-0" />
            <span className="truncate max-w-[120px]">{activeFilter}</span>
            <ChevronDown size={13} className="text-text-muted shrink-0" />
          </button>

          {filterMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-bg-panel border border-border rounded-lg shadow-xl py-1 z-50 text-xs">
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted border-b border-border/60">
                Filter Presets
              </div>
              {filterOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setActiveFilter(opt)
                    setFilterMenuOpen(false)
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-text-main hover:text-text-strong hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  <span>{opt}</span>
                  {activeFilter === opt && <Check size={13} className="text-accent-blue" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Omnibar Search and Filter Input */}
        <div className="hidden lg:flex items-center rounded-full px-3.5 py-1.5 w-[200px] xl:w-[260px] border border-border bg-bg-muted/70 focus-within:border-accent-blue/50 focus-within:bg-bg-input focus-within:ring-1 focus-within:ring-accent-blue/20 transition-all select-none">
          <Search size={14} className="mr-2 text-text-muted shrink-0" />
          <input
            type="text"
            placeholder="Search and Filter..."
            className="bg-transparent text-xs text-text-main placeholder:text-text-muted outline-none w-full"
            autoComplete="off"
            spellCheck="false"
          />
          <kbd className="ml-auto text-[10px] font-mono text-text-muted/80 bg-bg-panel border border-border/70 rounded px-1.5 py-0.5 shrink-0 select-none">
            ⌘K
          </kbd>
        </div>

        {/* Privacy Eye Toggle (Hides/Shows Dollar Balances) */}
        <button
          type="button"
          onClick={onTogglePrivacyMode}
          className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer ${
            privacyMode
              ? 'text-accent-blue bg-accent-blue/10 border border-accent-blue/30'
              : 'text-text-muted hover:text-text-strong hover:bg-white/[0.05]'
          }`}
          title={privacyMode ? 'Privacy mode ON (click to reveal)' : 'Privacy mode OFF (click to hide)'}
          aria-label={privacyMode ? 'Reveal numbers' : 'Hide numbers'}
        >
          {privacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>

        {/* Cloud Sync (Supabase) */}
        <button
          type="button"
          onClick={() => setCloudModalOpen(true)}
          className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer ${
            isSupabaseConnected
              ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
              : 'text-text-muted hover:text-text-strong hover:bg-white/[0.05]'
          }`}
          title={isSupabaseConnected ? 'Cloud Sync Active (Supabase)' : 'Cloud Sync (Configure Supabase)'}
          aria-label="Cloud Sync"
        >
          <Cloud size={16} />
        </button>

        {/* Theme Icon */}
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-strong hover:bg-white/[0.05] transition-colors cursor-pointer"
          title="Dark mode active"
          aria-label="Theme"
        >
          <Moon size={16} />
        </button>

        {/* Notifications Bell */}
        <button
          type="button"
          className="relative flex items-center justify-center w-8 h-8 rounded-md text-text-muted hover:text-text-strong hover:bg-white/[0.05] transition-colors cursor-pointer"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent-blue ring-2 ring-bg-main" />
        </button>

        {/* User Account Avatar & Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-8 h-8 rounded-full bg-bg-muted border border-border hover:border-accent-blue/50 flex items-center justify-center text-text-strong text-xs font-semibold font-mono tracking-tight transition-colors cursor-pointer select-none"
            aria-label="User account"
            aria-expanded={userMenuOpen}
          >
            NT
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-bg-panel border border-border rounded-xl shadow-2xl py-2 z-50 text-xs">
              <div className="px-3.5 py-2 border-b border-border/60">
                <p className="font-bold text-text-strong text-xs m-0">Nam Tran</p>
                <p className="text-[11px] text-text-muted m-0 mt-0.5 font-mono">nam@journal.com</p>
              </div>

              <div className="py-1">
                <Link
                  to="/stats"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-text-main hover:text-text-strong hover:bg-white/[0.05] transition-colors"
                >
                  <TrendingUp size={14} className="text-accent-blue" />
                  <span>Performance Stats</span>
                </Link>
                <Link
                  to="/calculator"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-text-main hover:text-text-strong hover:bg-white/[0.05] transition-colors"
                >
                  <Sliders size={14} className="text-accent-green" />
                  <span>Futures Calculator</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false)
                    setCloudModalOpen(true)
                  }}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-text-main hover:text-text-strong hover:bg-white/[0.05] transition-colors w-full text-left cursor-pointer"
                >
                  <Cloud size={14} className={isSupabaseConnected ? 'text-emerald-400' : 'text-accent-blue'} />
                  <span>Cloud Database & Sync</span>
                </button>
              </div>

              <div className="border-t border-border/60 pt-1">
                <div className="px-3.5 py-1.5 text-[10px] text-text-muted/80 flex items-center justify-between font-mono">
                  <span>Version</span>
                  <span>v2.4.0</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <CloudSyncModal isOpen={cloudModalOpen} onClose={() => setCloudModalOpen(false)} />
    </header>
  )
}
