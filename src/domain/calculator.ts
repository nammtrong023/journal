export type ContractSymbol = 'MNQ' | 'MES' | 'MYM' | 'M2K' | 'MGC' | 'SIL' | 'MCL'

export interface ContractSpec {
  symbol: ContractSymbol
  name: string
  fullName: string
  group: 'Indices' | 'Metals' | 'Energy'
  lotSize: number // Point value
  tickSize: number
  tickValue: number
  margin: number
}

export const CONTRACTS: Record<ContractSymbol, ContractSpec> = {
  MNQ: {
    symbol: 'MNQ',
    name: 'MNQ - Micro Nasdaq-100',
    fullName: 'Micro Nasdaq-100',
    group: 'Indices',
    lotSize: 2,
    tickSize: 0.25,
    tickValue: 0.5,
    margin: 1760,
  },
  MES: {
    symbol: 'MES',
    name: 'MES - Micro S&P 500',
    fullName: 'Micro S&P 500',
    group: 'Indices',
    lotSize: 5,
    tickSize: 0.25,
    tickValue: 1.25,
    margin: 1540,
  },
  MYM: {
    symbol: 'MYM',
    name: 'MYM - Micro Dow',
    fullName: 'Micro Dow',
    group: 'Indices',
    lotSize: 0.5,
    tickSize: 1.0,
    tickValue: 0.5,
    margin: 1265,
  },
  M2K: {
    symbol: 'M2K',
    name: 'M2K - Micro Russell 2000',
    fullName: 'Micro Russell 2000',
    group: 'Indices',
    lotSize: 5,
    tickSize: 0.1,
    tickValue: 0.5,
    margin: 660,
  },
  MGC: {
    symbol: 'MGC',
    name: 'MGC - Micro Gold',
    fullName: 'Micro Gold',
    group: 'Metals',
    lotSize: 10,
    tickSize: 0.1,
    tickValue: 1.0,
    margin: 1100,
  },
  SIL: {
    symbol: 'SIL',
    name: 'SIL - Micro Silver',
    fullName: 'Micro Silver',
    group: 'Metals',
    lotSize: 1000,
    tickSize: 0.005,
    tickValue: 5.0,
    margin: 1540,
  },
  MCL: {
    symbol: 'MCL',
    name: 'MCL - Micro Crude Oil',
    fullName: 'Micro Crude Oil',
    group: 'Energy',
    lotSize: 100,
    tickSize: 0.01,
    tickValue: 1.0,
    margin: 660,
  },
}

export interface PositionInput {
  contract: ContractSymbol
  account: number
  stop: number
  stopMode: 'ticks' | 'pts'
  risk: number
  riskMode: 'usd' | 'pct'
}

export interface PositionResult {
  contracts: number
  rawContracts: number
  riskAmount: number
  effectiveRiskPct: number
  stopPts: number
  stopTicks: number
  dollarRiskPerContract: number
  actualRisk: number
  actualPct: number
  riskLevel: 'Conservative' | 'Moderate Risk' | 'High Risk'
  targets: {
    r1: { profit: number; pts: number; ticks: number }
    r2: { profit: number; pts: number; ticks: number }
    r3: { profit: number; pts: number; ticks: number }
  }
}

export function calculatePosition(input: PositionInput): PositionResult {
  const spec = CONTRACTS[input.contract] || CONTRACTS.MNQ
  const account = input.account > 0 ? input.account : 0
  const stopVal = input.stop > 0 ? input.stop : 0
  const riskVal = input.risk > 0 ? input.risk : 0

  let stopPts = 0
  let stopTicks = 0

  if (stopVal > 0) {
    if (input.stopMode === 'ticks') {
      stopTicks = Math.round(stopVal)
      stopPts = parseFloat((stopTicks * spec.tickSize).toFixed(4))
    } else {
      stopPts = stopVal
      stopTicks = Math.round(stopVal / spec.tickSize)
    }
  }

  let riskAmount = 0
  let effectiveRiskPct = 0

  if (input.riskMode === 'usd') {
    riskAmount = riskVal
    effectiveRiskPct = account > 0 ? (riskAmount / account) * 100 : 0
  } else {
    effectiveRiskPct = riskVal
    riskAmount = account * (effectiveRiskPct / 100)
  }

  const pointVal = spec.lotSize
  const dollarRiskPerContract = stopPts * pointVal
  const rawContracts =
    dollarRiskPerContract > 0 && riskAmount > 0
      ? riskAmount / dollarRiskPerContract
      : 0
  const contracts = Math.floor(rawContracts)
  const actualRisk = contracts * dollarRiskPerContract
  const actualPct = account > 0 ? (actualRisk / account) * 100 : 0

  let riskLevel: 'Conservative' | 'Moderate Risk' | 'High Risk' = 'Conservative'
  if (actualPct > 3) {
    riskLevel = 'High Risk'
  } else if (actualPct > 1.5) {
    riskLevel = 'Moderate Risk'
  }

  const r1Profit = actualRisk
  const r2Profit = actualRisk * 2
  const r3Profit = actualRisk * 3

  return {
    contracts,
    rawContracts,
    riskAmount,
    effectiveRiskPct,
    stopPts,
    stopTicks,
    dollarRiskPerContract,
    actualRisk,
    actualPct,
    riskLevel,
    targets: {
      r1: { profit: r1Profit, pts: stopPts, ticks: stopTicks },
      r2: { profit: r2Profit, pts: stopPts * 2, ticks: stopTicks * 2 },
      r3: { profit: r3Profit, pts: stopPts * 3, ticks: stopTicks * 3 },
    },
  }
}
