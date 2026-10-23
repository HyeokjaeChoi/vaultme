import { prepare, toUnits, type ChainSnapshot } from '@vaultme/wallet-core'
import { describe, expect, it } from 'vitest'
import { cleanAmount, resolveReview } from '../src/entities/transaction/review'
import { feeShortBy, listBalance, sendLimits } from '../src/features/send/model/limits'
import { pressKey } from '../src/shared/lib/amount'
import { parseAddressQr } from '../src/shared/lib/qrAddress'

const A = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94' // public test vector (scripts/check-repo-rules.sh R10)
const TOKEN = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // Sepolia USDC
const CAP = 227_500_000_000_000n // fake USDC fee cap (0.0002275 ETH)

describe('sendLimits: ETH-short boundaries (issue #64 decisions 4 and 7)', () => {
  const usdc = (nativeBalance: bigint) =>
    sendLimits('USDC', { balance: toUnits('25.5', 'USDC'), nativeBalance, feeCap: CAP })
  it('ETH exactly equal to the fee cap is enough; one wei less blocks', () => {
    expect(usdc(CAP).feeShort).toBe(false)
    expect(usdc(CAP - 1n).feeShort).toBe(true)
  })
  it('no ETH at all: chips off, balance still typeable (Review blocks)', () => {
    const l = usdc(0n)
    expect(l).toMatchObject({ sendable: '25.5', feeShort: true })
    expect(l.chips.every((c) => c.raw === 0n)).toBe(true)
  })
  it('USDC balance 0 with enough ETH: chips off, not reported as fee short', () => {
    const l = sendLimits('USDC', { balance: 0n, nativeBalance: toUnits('1', 'ETH'), feeCap: CAP })
    expect(l).toMatchObject({ sendable: '0', feeShort: false })
    expect(l.chips.every((c) => c.raw === 0n)).toBe(true)
  })
  it('ETH balance at or below the fee cap: sendable is 0 and every chip is off', () => {
    for (const balance of [CAP, CAP - 1n, 0n]) {
      const l = sendLimits('ETH', { balance, nativeBalance: balance, feeCap: CAP })
      expect(l.sendable).toBe('0')
      expect(l.feeShort).toBe(false)
      expect(l.chips.every((c) => c.raw === 0n)).toBe(true)
    }
  })
})

describe('prepare() fee shortage through feeShortBy', () => {
  const snap = (nativeBalance: bigint): ChainSnapshot =>
    ({
      nativeBalance,
      tokenBalance: toUnits('25.5', 'USDC'),
      nonce: 0,
      gasLimit: 65_000n,
      baseFeePerGas: 1_500_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
    }) as ChainSnapshot
  it('USDC send with ETH below the cap reports the exact missing ETH; with enough ETH it reports none', () => {
    const short = prepare({ asset: 'USDC', to: A, amount: '5', previous: [] }, snap(0n))
    if (!short.ok) throw new Error(short.error)
    expect(feeShortBy(short.review.warnings)).toBe(short.review.feeCap)
    const enough = prepare({ asset: 'USDC', to: A, amount: '5', previous: [] }, snap(toUnits('1', 'ETH')))
    if (!enough.ok) throw new Error(enough.error)
    expect(feeShortBy(enough.review.warnings)).toBeNull()
  })
  it('the full USDC balance is allowed: the fee is paid in ETH, not from the token', () => {
    const r = prepare({ asset: 'USDC', to: A, amount: '25.5', previous: [] }, snap(toUnits('1', 'ETH')))
    expect(r.ok).toBe(true)
    const over = prepare({ asset: 'USDC', to: A, amount: '25.500001', previous: [] }, snap(toUnits('1', 'ETH')))
    expect(over).toEqual({ ok: false, error: 'insufficientFunds' })
  })
})

describe('listBalance rounding edges', () => {
  it('floors at the cent and flags dust only below one cent', () => {
    expect(listBalance(10_000n, 'USDC')).toBe('0.01')
    expect(listBalance(9_999n, 'USDC')).toBe('<0.01')
    expect(listBalance(1n, 'ETH')).toBe('<0.01')
    expect(listBalance(10n ** 16n, 'ETH')).toBe('0.01')
    expect(listBalance(toUnits('1234.999999', 'USDC'), 'USDC')).toBe('1234.99')
  })
})

describe('cleanAmount for USDC', () => {
  it('rejects zero, empty, a bare dot and a 7th decimal; accepts 6 decimals and a trailing dot', () => {
    for (const s of [undefined, '', '0', '0.', '0.000000', '.', 'abc', '0.0000001'])
      expect(cleanAmount(s, 'USDC'), String(s)).toBeNull()
    expect(cleanAmount('0.000001', 'USDC')).toBe('0.000001')
    expect(cleanAmount('25.', 'USDC')).toBe('25')
  })
})

describe('resolveReview with a wallet-core review for USDC', () => {
  it('fee and cap come from the review, the total stays empty', () => {
    const base = { gasLimit: 65_000n, maxFeePerGas: 4_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n, nonce: 0 }
    const core = {
      asset: 'USDC' as const,
      to: A as `0x${string}`,
      amount: 5_000_000n,
      ...base,
      estimatedFee: 162_500_000_000_000n,
      feeCap: 260_000_000_000_000n,
      risk: 'first' as const,
      warnings: [],
    }
    const r = resolveReview(A, '5', false, core, [])
    expect(r).toMatchObject({
      asset: 'USDC',
      amount: '5 USDC',
      fee: '0.0001625 ETH',
      feeCap: '0.00026 ETH',
      total: null,
      totalMax: null,
    })
  })
})

describe('pressKey at the USDC sendable limit', () => {
  it('the exact balance is accepted; one more micro-unit is rejected', () => {
    expect(pressKey('25.49999', '9', '25.499999', 'USDC')).toMatchObject({ amount: '25.499999', accepted: true })
    expect(pressKey('25.499999', '1', '25.499999', 'USDC')).toEqual({
      amount: '25.499999',
      accepted: false,
      overMax: false,
    })
    expect(pressKey('25.5', '1', '25.5', 'USDC')).toEqual({ amount: '25.5', accepted: false, overMax: true })
  })
})

describe('parseAddressQr: parameter edge cases', () => {
  it('param names are case-insensitive (ADDRESS=, VALUE=) and still flagged', () => {
    expect(parseAddressQr(`ethereum:${TOKEN}/transfer?ADDRESS=${A}`)).toMatchObject({ ok: true, address: A })
    expect(parseAddressQr(`ethereum:${A}?VALUE=1`)).toMatchObject({ ok: true, hadAmount: true })
  })
  it('percent-encoded recipient in a transfer QR decodes to the address', () => {
    expect(parseAddressQr(`ethereum:${TOKEN}/transfer?address=%30x${A.slice(2)}`)).toMatchObject({
      ok: true,
      address: A,
    })
  })
  it('a transfer to a bad-checksum recipient is rejected, never falls back to the token contract', () => {
    const bad = A.slice(0, -1) + (A.endsWith('4') ? '5' : '4')
    expect(parseAddressQr(`ethereum:${TOKEN}/transfer?address=${bad}`)).toEqual({ ok: false, error: 'notAddress' })
  })
  it('the wrong chain wins over a valid transfer form', () => {
    expect(parseAddressQr(`ethereum:${TOKEN}@1/transfer?address=${A}&uint256=1`)).toEqual({
      ok: false,
      error: 'wrongChain',
      chainId: 1,
    })
  })
})
