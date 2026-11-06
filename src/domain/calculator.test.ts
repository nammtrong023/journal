import { describe, it, expect } from 'vitest'
import { calculatePosition } from './calculator'

describe('calculatePosition', () => {
  it('rounds MNQ contracts down to stay within risk', () => {
    // 40 points on MNQ: $2/pt = $80 risk per contract. $200 risk / $80 = 2.5 -> 2 contracts
    const resPts = calculatePosition({
      contract: 'MNQ',
      account: 50000,
      stop: 40,
      stopMode: 'pts',
      risk: 200,
      riskMode: 'usd',
    })
    expect(resPts.contracts).toBe(2)
    expect(resPts.actualRisk).toBe(160)

    // 40 ticks on MNQ: $0.50/tick = $20 risk per contract. $200 risk / $20 = 10 contracts
    const resTicks = calculatePosition({
      contract: 'MNQ',
      account: 50000,
      stop: 40,
      stopMode: 'ticks',
      risk: 200,
      riskMode: 'usd',
    })
    expect(resTicks.contracts).toBe(10)
    expect(resTicks.actualRisk).toBe(200)
  })

  it('correctly calculates percentage risk and profit targets', () => {
    const res = calculatePosition({
      contract: 'MES',
      account: 10000,
      stop: 10, // 10 pts on MES ($5/pt) = $50 per contract
      stopMode: 'pts',
      risk: 1, // 1% of 10000 = $100
      riskMode: 'pct',
    })

    expect(res.riskAmount).toBe(100)
    expect(res.contracts).toBe(2) // 100 / 50 = 2
    expect(res.actualRisk).toBe(100)
    expect(res.targets.r1.profit).toBe(100)
    expect(res.targets.r2.profit).toBe(200)
    expect(res.targets.r3.profit).toBe(300)
  })

  it('correctly calculates specifications for all 7 micro contracts', () => {
    // MYM: $0.5/pt, tick 1.0, tickValue $0.5
    const mym = calculatePosition({
      contract: 'MYM',
      account: 50000,
      stop: 20,
      stopMode: 'pts',
      risk: 200,
      riskMode: 'usd',
    })
    // 20 pts * $0.5 = $10 per contract. 200 / 10 = 20 contracts
    expect(mym.dollarRiskPerContract).toBe(10)
    expect(mym.contracts).toBe(20)
    expect(mym.actualRisk).toBe(200)

    // M2K: $5/pt, tick 0.1, tickValue $0.5
    const m2k = calculatePosition({
      contract: 'M2K',
      account: 50000,
      stop: 4, // 4 pts * $5 = $20 per contract
      stopMode: 'pts',
      risk: 200,
      riskMode: 'usd',
    })
    expect(m2k.dollarRiskPerContract).toBe(20)
    expect(m2k.contracts).toBe(10)
    expect(m2k.actualRisk).toBe(200)

    // MGC: $10/pt, tick 0.1, tickValue $1.0
    const mgc = calculatePosition({
      contract: 'MGC',
      account: 50000,
      stop: 5, // 5 pts * $10 = $50 per contract
      stopMode: 'pts',
      risk: 200,
      riskMode: 'usd',
    })
    expect(mgc.dollarRiskPerContract).toBe(50)
    expect(mgc.contracts).toBe(4)
    expect(mgc.actualRisk).toBe(200)

    // SIL: $1000/pt, tick 0.005, tickValue $5.0
    const sil = calculatePosition({
      contract: 'SIL',
      account: 50000,
      stop: 0.1, // 0.1 pt * $1000 = $100 per contract
      stopMode: 'pts',
      risk: 250,
      riskMode: 'usd',
    })
    expect(sil.dollarRiskPerContract).toBe(100)
    expect(sil.contracts).toBe(2) // 250 / 100 = 2.5 -> 2 contracts
    expect(sil.actualRisk).toBe(200)

    // MCL: $100/pt, tick 0.01, tickValue $1.0
    const mcl = calculatePosition({
      contract: 'MCL',
      account: 50000,
      stop: 0.5, // 0.5 pt * $100 = $50 per contract
      stopMode: 'pts',
      risk: 150,
      riskMode: 'usd',
    })
    expect(mcl.dollarRiskPerContract).toBe(50)
    expect(mcl.contracts).toBe(3)
    expect(mcl.actualRisk).toBe(150)
  })

  it('evaluates risk levels accurately (Conservative <= 1.5%, Moderate <= 3%, High > 3%)', () => {
    // 1% risk of 10000 -> Conservative
    const conservative = calculatePosition({
      contract: 'MNQ',
      account: 10000,
      stop: 10, // 10 pts * $2 = $20
      stopMode: 'pts',
      risk: 100, // 100 / 20 = 5 contracts -> actualRisk = $100 (1%)
      riskMode: 'usd',
    })
    expect(conservative.riskLevel).toBe('Conservative')

    // 2% risk of 10000 -> Moderate Risk
    const moderate = calculatePosition({
      contract: 'MNQ',
      account: 10000,
      stop: 10,
      stopMode: 'pts',
      risk: 200, // 200 / 20 = 10 contracts -> actualRisk = $200 (2%)
      riskMode: 'usd',
    })
    expect(moderate.riskLevel).toBe('Moderate Risk')

    // 4% risk of 10000 -> High Risk
    const high = calculatePosition({
      contract: 'MNQ',
      account: 10000,
      stop: 10,
      stopMode: 'pts',
      risk: 400, // 400 / 20 = 20 contracts -> actualRisk = $400 (4%)
      riskMode: 'usd',
    })
    expect(high.riskLevel).toBe('High Risk')
  })

  it('handles edge case where stop loss exceeds allocated risk budget', () => {
    // 200 pts stop on MNQ = $400 risk per contract. Budget is only $200.
    const res = calculatePosition({
      contract: 'MNQ',
      account: 50000,
      stop: 200,
      stopMode: 'pts',
      risk: 200,
      riskMode: 'usd',
    })
    expect(res.dollarRiskPerContract).toBe(400)
    expect(res.rawContracts).toBe(0.5)
    expect(res.contracts).toBe(0)
    expect(res.actualRisk).toBe(0)
    expect(res.actualPct).toBe(0)
  })
})
