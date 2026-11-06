import { useState, useEffect } from 'react'
import {
  calculatePosition,
  CONTRACTS,
  ContractSymbol,
} from '../../domain/calculator'
import {
  Calculator,
  Table2,
  ShieldAlert,
  Target,
  Search,
  Zap,
  Sliders,
} from 'lucide-react'

const STORAGE_KEY = 'journal.calculator.v1'

const RISK_PRESETS_USD = [150, 200, 250, 300]
const RISK_PRESETS_PCT = [0.5, 1, 1.5, 2]

interface SavedState {
  contract: ContractSymbol
  account: number
  stop: number
  stopMode: 'ticks' | 'pts'
  risk: number
  riskMode: 'usd' | 'pct'
}

const DEFAULT_STATE: SavedState = {
  contract: 'MNQ',
  account: 50000,
  stop: 40,
  stopMode: 'ticks',
  risk: 200,
  riskMode: 'usd',
}

export function CalculatorPage() {
  const [activeTab, setActiveTab] = useState<'calc' | 'compare'>('calc')
  const [compareSearch, setCompareSearch] = useState<string>('')

  const [form, setForm] = useState<SavedState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return { ...DEFAULT_STATE, ...JSON.parse(saved) }
      }
    } catch {
      // fallback
    }
    return DEFAULT_STATE
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
    } catch {
      // storage unavailable
    }
  }, [form])

  const result = calculatePosition(form)
  const currentSpec = CONTRACTS[form.contract] || CONTRACTS.MNQ

  const handleContractChange = (c: ContractSymbol) => {
    setForm((prev) => ({ ...prev, contract: c }))
  }

  const handleStopModeToggle = (mode: 'ticks' | 'pts') => {
    if (mode === form.stopMode) return
    let newStop = form.stop
    if (mode === 'ticks') {
      newStop = Math.round(form.stop / currentSpec.tickSize)
    } else {
      newStop = parseFloat((form.stop * currentSpec.tickSize).toFixed(4))
    }
    setForm((prev) => ({ ...prev, stopMode: mode, stop: newStop }))
  }

  const handleRiskModeToggle = (mode: 'usd' | 'pct') => {
    if (mode === form.riskMode) return
    let newRisk = form.risk
    if (mode === 'usd') {
      newRisk = Math.round(((form.account * form.risk) / 100) * 100) / 100
    } else {
      newRisk = form.account > 0 ? Math.round((form.risk / form.account) * 1000) / 10 : 1
    }
    setForm((prev) => ({ ...prev, riskMode: mode, risk: newRisk }))
  }

  const filteredContracts = Object.values(CONTRACTS).filter((spec) => {
    const q = compareSearch.toLowerCase()
    return (
      spec.symbol.toLowerCase().includes(q) ||
      spec.fullName.toLowerCase().includes(q) ||
      spec.group.toLowerCase().includes(q)
    )
  })

  return (
    <div className="calculator-page flex-1 flex flex-col p-4 lg:p-6 lg:px-8 space-y-5 max-w-[1440px] mx-auto w-full">
      {/* Header with Title and Tabs */}
      <div className="calculator-header flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-border/60">
        <div className="calc-header-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center text-accent-blue shrink-0">
            <Calculator size={20} className="calc-icon" />
          </div>
          <div>
            <h1 className="calc-title text-xl sm:text-2xl font-bold text-text-strong tracking-tight m-0">
              Futures Calculator
            </h1>
            <p className="text-xs text-text-muted mt-0.5 m-0">
              Calculate exact position sizing and risk allocations for micro futures contracts.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="calc-tabs inline-flex p-1 bg-bg-panel border border-border rounded-lg gap-1 select-none">
          <button
            type="button"
            className={`calc-tab-btn inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'calc'
                ? 'active bg-accent-blue text-white shadow-sm'
                : 'text-text-muted hover:text-text-strong hover:bg-white/[0.05]'
            }`}
            onClick={() => setActiveTab('calc')}
          >
            <Sliders size={14} />
            <span>Position Calculator</span>
          </button>
          <button
            type="button"
            className={`calc-tab-btn inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'compare'
                ? 'active bg-accent-blue text-white shadow-sm'
                : 'text-text-muted hover:text-text-strong hover:bg-white/[0.05]'
            }`}
            onClick={() => setActiveTab('compare')}
          >
            <Table2 size={14} />
            <span>Compare</span>
          </button>
        </div>
      </div>

      {activeTab === 'calc' ? (
        <div className="calculator-grid grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Inputs Section (Left Column) */}
          <div className="calculator-inputs-card lg:col-span-5 bg-bg-panel border border-border rounded-lg p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="card-heading text-sm font-bold text-text-strong uppercase tracking-wider flex items-center gap-2 m-0">
                <Sliders size={15} className="text-accent-blue" />
                <span>Trade Parameters</span>
              </h3>
              <span className="text-[11px] font-mono text-text-muted px-2 py-0.5 rounded bg-bg-muted border border-border">
                {currentSpec.symbol}
              </span>
            </div>

            {/* Contract Selection */}
            <div className="input-group flex flex-col gap-1.5">
              <label htmlFor="calc-contract" className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Contract
              </label>
              <select
                id="calc-contract"
                value={form.contract}
                onChange={(e) => handleContractChange(e.target.value as ContractSymbol)}
                className="w-full bg-bg-muted border border-border rounded-md px-3 py-2 text-xs text-text-strong font-medium focus:border-accent-blue focus:outline-none transition-colors"
              >
                <optgroup label="Indices">
                  <option value="MNQ">MNQ - Micro Nasdaq-100</option>
                  <option value="MES">MES - Micro S&amp;P 500</option>
                  <option value="MYM">MYM - Micro Dow</option>
                  <option value="M2K">M2K - Micro Russell 2000</option>
                </optgroup>
                <optgroup label="Metals">
                  <option value="MGC">MGC - Micro Gold</option>
                  <option value="SIL">SIL - Micro Silver</option>
                </optgroup>
                <optgroup label="Energy">
                  <option value="MCL">MCL - Micro Crude Oil</option>
                </optgroup>
              </select>

              {/* Preset Chips: 7 boxes strictly on 1 row */}
              <div className="contract-preset-grid select-none" role="group" aria-label="Contract presets">
                {(['MNQ', 'MES', 'MYM', 'M2K', 'MGC', 'SIL', 'MCL'] as ContractSymbol[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`preset-pill font-mono font-bold rounded-md border transition-all cursor-pointer ${
                      form.contract === c
                        ? 'active bg-accent-blue/15 text-accent-blue border-accent-blue/50 shadow-xs'
                        : 'bg-bg-muted text-text-muted border-border hover:bg-bg-panel hover:text-text-strong hover:border-text-muted/50'
                    }`}
                    onClick={() => handleContractChange(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Balance */}
            <div className="input-group flex flex-col gap-1.5">
              <label htmlFor="calc-account" className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Account Balance ($)
              </label>
              <input
                id="calc-account"
                type="number"
                step="500"
                value={form.account || ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, account: parseFloat(e.target.value) || 0 }))
                }
                className="w-full bg-bg-muted border border-border rounded-md px-3 py-2 text-xs text-text-strong font-mono focus:border-accent-blue focus:outline-none transition-colors"
              />
            </div>

            {/* Stop Loss */}
            <div className="input-group flex flex-col gap-1.5">
              <div className="input-label-row flex items-center justify-between select-none">
                <label htmlFor="pos-stoploss" className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Stop Loss
                </label>
                <div className="mode-toggle inline-flex p-0.5 bg-bg-muted border border-border rounded-md">
                  <button
                    type="button"
                    className={`toggle-btn px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                      form.stopMode === 'ticks'
                        ? 'active bg-accent-blue text-white'
                        : 'text-text-muted hover:text-text-strong'
                    }`}
                    onClick={() => handleStopModeToggle('ticks')}
                  >
                    ticks
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                      form.stopMode === 'pts'
                        ? 'active bg-accent-blue text-white'
                        : 'text-text-muted hover:text-text-strong'
                    }`}
                    onClick={() => handleStopModeToggle('pts')}
                  >
                    pts
                  </button>
                </div>
              </div>
              <input
                id="pos-stoploss"
                type="number"
                step={form.stopMode === 'ticks' ? '1' : String(currentSpec.tickSize)}
                value={form.stop || ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, stop: parseFloat(e.target.value) || 0 }))
                }
                className="w-full bg-bg-muted border border-border rounded-md px-3 py-2 text-xs text-text-strong font-mono focus:border-accent-blue focus:outline-none transition-colors"
              />
            </div>

            {/* Risk Amount */}
            <div className="input-group flex flex-col gap-1.5">
              <div className="input-label-row flex items-center justify-between select-none">
                <label htmlFor="calc-risk" className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Risk Target
                </label>
                <div className="mode-toggle inline-flex p-0.5 bg-bg-muted border border-border rounded-md">
                  <button
                    type="button"
                    className={`toggle-btn px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                      form.riskMode === 'usd'
                        ? 'active bg-accent-blue text-white'
                        : 'text-text-muted hover:text-text-strong'
                    }`}
                    onClick={() => handleRiskModeToggle('usd')}
                  >
                    $ USD
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn px-2 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                      form.riskMode === 'pct'
                        ? 'active bg-accent-blue text-white'
                        : 'text-text-muted hover:text-text-strong'
                    }`}
                    onClick={() => handleRiskModeToggle('pct')}
                  >
                    %
                  </button>
                </div>
              </div>
              <input
                id="calc-risk"
                type="number"
                step={form.riskMode === 'usd' ? '10' : '0.1'}
                value={form.risk || ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, risk: parseFloat(e.target.value) || 0 }))
                }
                className="w-full bg-bg-muted border border-border rounded-md px-3 py-2 text-xs text-text-strong font-mono focus:border-accent-blue focus:outline-none transition-colors"
              />
              <div className="preset-pills equal-grid grid grid-cols-4 gap-2 mt-2 select-none">
                {(form.riskMode === 'usd' ? RISK_PRESETS_USD : RISK_PRESETS_PCT).map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`preset-pill py-2 text-center text-xs sm:text-sm font-mono font-bold rounded-md border transition-all cursor-pointer min-h-[40px] flex items-center justify-center ${
                      form.risk === val
                        ? 'active bg-accent-blue/15 text-accent-blue border-accent-blue/50 shadow-xs'
                        : 'bg-bg-muted text-text-muted border-border hover:bg-bg-panel hover:text-text-strong hover:border-text-muted/50'
                    }`}
                    onClick={() => setForm((prev) => ({ ...prev, risk: val }))}
                  >
                    {form.riskMode === 'usd' ? `$${val}` : `${val}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Section (Right Column) */}
          <div className="calculator-results-card lg:col-span-7 bg-bg-panel border border-border rounded-lg p-5 flex flex-col gap-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <h3 className="card-heading text-sm font-bold text-text-strong uppercase tracking-wider flex items-center gap-2 m-0">
                <Zap size={15} className="text-accent-blue" />
                <span>Calculated Position</span>
              </h3>
              <div className="contract-specs-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded bg-bg-muted border border-border text-text-muted font-mono select-none">
                <span className="font-semibold text-text-strong">{currentSpec.fullName}</span>
                <span>•</span>
                <span>${currentSpec.tickValue.toFixed(2)}/tick</span>
              </div>
            </div>

            {/* Hero Contracts Cockpit Box */}
            <div className="hero-contracts-box bg-bg-muted/90 border border-accent-blue/30 rounded-lg p-4 sm:p-5 flex items-center justify-between shadow-inner relative overflow-hidden select-none">
              <div className="contracts-main flex flex-col">
                <span className="hero-label text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  Max Contracts
                </span>
                <span
                  className="hero-value text-3xl sm:text-4xl font-black text-text-strong font-mono tracking-tight my-0.5 tabular-nums"
                  data-testid="res-contracts"
                >
                  {result.contracts}
                </span>
                <span className="hero-sub text-[11px] text-text-muted">
                  {result.contracts > 0
                    ? `Rounded down from ${result.rawContracts.toFixed(2)}`
                    : 'Stop exceeds allocated risk budget'}
                </span>
              </div>

              <div className="hidden sm:flex flex-col items-end text-right">
                <span className="text-[11px] text-text-muted uppercase tracking-wider font-medium">Risk / Contract</span>
                <span className="text-lg font-bold text-text-strong font-mono tabular-nums">
                  ${result.dollarRiskPerContract.toFixed(2)}
                </span>
                <span className="text-[11px] text-text-muted font-mono">
                  {result.stopPts} pts ({result.stopTicks} ticks)
                </span>
              </div>
            </div>

            {/* Summary Grid (4 cards in exact order) */}
            <div className="results-summary-grid grid grid-cols-1 sm:grid-cols-2 gap-3.5 select-none">
              {/* 1. Allocated Risk */}
              <div className="result-metric-card bg-bg-muted border border-border rounded-lg p-3.5 flex flex-col justify-between">
                <span className="metric-label text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Allocated Risk
                </span>
                <span className="metric-val text-xl font-bold font-mono text-text-strong my-1 tabular-nums">
                  ${result.riskAmount.toFixed(2)}
                </span>
                <span className="metric-sub text-[11px] text-text-muted font-mono">
                  {result.effectiveRiskPct.toFixed(2)}% of balance
                </span>
              </div>

              {/* 2. Risk Per Contract */}
              <div className="result-metric-card bg-bg-muted border border-border rounded-lg p-3.5 flex flex-col justify-between">
                <span className="metric-label text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Risk Per Contract
                </span>
                <span className="metric-val text-xl font-bold font-mono text-text-strong my-1 tabular-nums">
                  ${result.dollarRiskPerContract.toFixed(2)}
                </span>
                <span className="metric-sub text-[11px] text-text-muted font-mono">
                  {result.stopPts} pts ({result.stopTicks} ticks)
                </span>
              </div>

              {/* 3. Actual Risk */}
              <div className="result-metric-card bg-bg-muted border border-border rounded-lg p-3.5 flex flex-col justify-between">
                <span className="metric-label text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Actual Risk
                </span>
                <span className="metric-val text-xl font-bold font-mono text-text-strong my-1 tabular-nums">
                  ${result.actualRisk.toFixed(2)}
                </span>
                <span className="metric-sub text-[11px] text-text-muted font-mono">
                  {result.actualPct.toFixed(2)}% of balance
                </span>
              </div>

              {/* 4. Risk Profile */}
              <div className={`result-metric-card bg-bg-muted border border-border rounded-lg p-3.5 flex flex-col justify-between risk-tier-${result.riskLevel.toLowerCase().replace(' ', '-')}`}>
                <span className="metric-label text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Risk Profile
                </span>
                <span
                  className={`metric-val text-xl font-bold font-mono my-1 ${
                    result.actualPct <= 1.5
                      ? 'text-accent-green'
                      : result.actualPct <= 2.5
                      ? 'text-accent-yellow'
                      : 'text-accent-red'
                  }`}
                >
                  {result.riskLevel}
                </span>
                <span className="metric-sub text-[11px] text-text-muted flex items-center gap-1.5">
                  <ShieldAlert size={13} className="text-text-muted" />
                  <span>{result.actualPct <= 1.5 ? 'Normal range' : 'Caution advised'}</span>
                </span>
              </div>
            </div>

            {/* Profit Targets (1R, 2R, 3R) */}
            <div className="targets-section flex flex-col gap-3 pt-3 border-t border-border/70 select-none">
              <h4 className="targets-heading text-xs font-bold text-text-strong uppercase tracking-wider flex items-center gap-1.5 m-0">
                <Target size={14} className="text-accent-blue" />
                <span>Profit Targets</span>
              </h4>
              <div className="targets-grid grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="target-card bg-bg-muted border border-border rounded-lg p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="target-badge text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-accent-blue/15 text-accent-blue border border-accent-blue/30">
                      1R
                    </span>
                    <span className="target-dist text-[10px] text-text-muted font-mono">
                      {result.targets.r1.pts} pts
                    </span>
                  </div>
                  <span className="target-profit text-base sm:text-lg font-bold font-mono text-accent-green tabular-nums mt-0.5">
                    +${result.targets.r1.profit.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono">
                    {result.targets.r1.ticks} ticks target
                  </span>
                </div>

                <div className="target-card bg-bg-muted border border-border rounded-lg p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="target-badge text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-accent-blue/15 text-accent-blue border border-accent-blue/30">
                      2R
                    </span>
                    <span className="target-dist text-[10px] text-text-muted font-mono">
                      {result.targets.r2.pts} pts
                    </span>
                  </div>
                  <span className="target-profit text-base sm:text-lg font-bold font-mono text-accent-green tabular-nums mt-0.5">
                    +${result.targets.r2.profit.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono">
                    {result.targets.r2.ticks} ticks target
                  </span>
                </div>

                <div className="target-card bg-bg-muted border border-border rounded-lg p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="target-badge text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-accent-blue/15 text-accent-blue border border-accent-blue/30">
                      3R
                    </span>
                    <span className="target-dist text-[10px] text-text-muted font-mono">
                      {result.targets.r3.pts} pts
                    </span>
                  </div>
                  <span className="target-profit text-base sm:text-lg font-bold font-mono text-accent-green tabular-nums mt-0.5">
                    +${result.targets.r3.profit.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono">
                    {result.targets.r3.ticks} ticks target
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Compare Tab */
        <div className="compare-view-card bg-bg-panel border border-border rounded-lg p-5 flex flex-col gap-4 shadow-sm">
          <div className="compare-top-bar flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
            <span className="compare-desc text-xs text-text-muted">
              Specifications for 7 Micro Futures Contracts (Point value, Tick size, Tick value, Reference margin)
            </span>
            <div className="relative min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search contracts..."
                value={compareSearch}
                onChange={(e) => setCompareSearch(e.target.value)}
                className="compare-search-input w-full bg-bg-muted border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-text-strong focus:border-accent-blue focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="compare-table-wrapper overflow-x-auto">
            <table className="compare-table w-full text-left text-xs border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-border/80 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                  <th className="py-2.5 px-3 font-semibold text-text-muted">Symbol</th>
                  <th className="py-2.5 px-3 font-semibold text-text-muted">Contract Name</th>
                  <th className="py-2.5 px-3 font-semibold text-text-muted">Group</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-text-muted">Point Value</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-text-muted">Tick Size</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-text-muted">Tick Value</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-text-muted">Margin (Est.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredContracts.map((spec) => (
                  <tr key={spec.symbol} className="hover:bg-white/[0.02] transition-colors">
                    <td className="symbol-cell py-2.5 px-3 font-bold font-mono text-accent-blue">
                      {spec.symbol}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-text-strong">
                      {spec.fullName}
                    </td>
                    <td className="py-2.5 px-3 text-text-muted">
                      {spec.group}
                    </td>
                    <td className="num-cell py-2.5 px-3 text-right font-mono text-text-strong">
                      ${spec.lotSize}
                    </td>
                    <td className="num-cell py-2.5 px-3 text-right font-mono text-text-muted">
                      {spec.tickSize}
                    </td>
                    <td className="num-cell py-2.5 px-3 text-right font-mono text-text-strong">
                      ${spec.tickValue.toFixed(2)}
                    </td>
                    <td className="num-cell py-2.5 px-3 text-right font-mono text-text-muted">
                      ${spec.margin.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
