import { describe, expect, test } from 'vitest'
import { planSpeedUp } from '../src'

const GWEI = 1_000_000_000n
const f = (maxFeePerGas: bigint, maxPriorityFeePerGas: bigint) => ({ maxFeePerGas, maxPriorityFeePerGas })

// The fee fields of a plan are `replacementFees`.
const replacementFees = (latestSent: ReturnType<typeof f>, market: ReturnType<typeof f>) => {
  const p = planSpeedUp({ latestSent, market, gasLimit: 1n, asset: 'USDC', amount: 0n, nativeBalance: 0n })
  return f(p.maxFeePerGas, p.maxPriorityFeePerGas)
}

describe('replacementFees (ADR-0031 D2)', () => {
  test('rounds up and adds 1 wei over the latest sent value when the market is lower', () => {
    expect(replacementFees(f(100n, 10n), f(1n, 1n))).toEqual(f(111n, 12n)) // 110 + 1, 11 + 1
    expect(replacementFees(f(101n, 3n), f(1n, 1n))).toEqual(f(113n, 5n)) // ceil(111.1)=112 + 1, ceil(3.3)=4 + 1
  })
  test('the result is always at least 10 % above the sent value (node replacement rule)', () => {
    for (const v of [1n, 7n, 9n, 10n, 11n, 999n, 3n * GWEI + 1n]) {
      const r = replacementFees(f(v, v), f(0n, 0n))
      expect(r.maxFeePerGas * 10n).toBeGreaterThanOrEqual(v * 11n)
      expect(r.maxFeePerGas).toBeGreaterThan(v)
    }
  })
  test('the market value wins per field when it is higher', () => {
    expect(replacementFees(f(100n, 10n), f(500n, 1n))).toEqual(f(500n, 12n))
    expect(replacementFees(f(100n, 10n), f(1n, 50n))).toEqual(f(111n, 50n))
  })
  test('no count limit: bumping its own result keeps rising', () => {
    let cur = f(2n * GWEI, GWEI)
    for (let i = 0; i < 5; i++) {
      const next = replacementFees(cur, f(0n, 0n))
      expect(next.maxFeePerGas).toBeGreaterThan(cur.maxFeePerGas)
      cur = next
    }
  })
})

describe('planSpeedUp', () => {
  const base = {
    latestSent: f(2n * GWEI, GWEI),
    market: f(GWEI, GWEI / 2n),
    gasLimit: 21_000n,
    asset: 'ETH' as const,
    amount: 5n * 10n ** 16n,
    nativeBalance: 10n ** 18n,
  }
  test('fee caps, difference and cost of an ETH send include the amount', () => {
    const p = planSpeedUp(base)
    expect(p.maxFeePerGas).toBe(2_200_000_001n)
    expect(p.currentFeeCap).toBe(21_000n * 2n * GWEI)
    expect(p.newFeeCap).toBe(21_000n * 2_200_000_001n)
    expect(p.extra).toBe(p.newFeeCap - p.currentFeeCap)
    expect(p.needed).toBe(p.newFeeCap + base.amount)
    expect(p.shortBy).toBe(0n)
    expect(p.overAbsCap).toBe(false)
  })
  test('shortBy is the missing ETH; a token send needs only the fee', () => {
    const eth = planSpeedUp({ ...base, nativeBalance: base.amount })
    expect(eth.shortBy).toBe(eth.newFeeCap)
    const usdc = planSpeedUp({ ...base, asset: 'USDC', nativeBalance: 1n })
    expect(usdc.needed).toBe(usdc.newFeeCap)
    expect(usdc.shortBy).toBe(usdc.newFeeCap - 1n)
  })
  test('exactly enough balance is not short', () => {
    const p = planSpeedUp(base)
    expect(planSpeedUp({ ...base, nativeBalance: p.needed }).shortBy).toBe(0n)
  })
  test('a fee cap above the absolute cap is flagged', () => {
    expect(planSpeedUp({ ...base, latestSent: f(10n ** 15n, GWEI) }).overAbsCap).toBe(true)
  })
})
