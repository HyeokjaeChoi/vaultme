import { keccak256, parseEther, parseGwei, parseTransaction, recoverTransactionAddress, decodeFunctionData, erc20Abi, type Hash } from 'viem'
import { describe, expect, test } from 'vitest'
import { ABS_MAX_FEE_WEI, ASSETS, CHAIN, Mnemonic, deriveAddress, prepare, signAndSubmit, type ChainSnapshot, type SendIntent } from '../src'
import { OTHER, PUBLIC_JUNK_PHRASE, RECIPIENT } from './fixtures'

const mnemonic = new Mnemonic(PUBLIC_JUNK_PHRASE)
const snap: ChainSnapshot = {
  nonce: 7,
  nativeBalance: parseEther('1'),
  tokenBalance: 5_000_000n,
  gasLimit: 65_000n,
  baseFeePerGas: parseGwei('10'),
  maxPriorityFeePerGas: parseGwei('1'),
}
const usdc: SendIntent = { asset: 'USDC', to: RECIPIENT, amount: '1.5', previous: [RECIPIENT] }

function ok(intent: SendIntent, chain = snap) {
  const r = prepare(intent, chain)
  if (!r.ok) throw new Error(r.error)
  return r.review
}

describe('prepare', () => {
  test('review model', () => {
    const r = ok(usdc)
    expect(r.amount).toBe(1_500_000n)
    expect(r.estimatedFee).toBe(65_000n * parseGwei('11'))
    expect(r.feeCap).toBe(65_000n * parseGwei('21'))
    expect(r.warnings).toEqual([])
  })
  test('warnings: first recipient, lookalike, burn', () => {
    expect(ok({ ...usdc, previous: [] }).warnings).toEqual([{ kind: 'recipientRisk', risk: 'first' }])
    expect(ok({ ...usdc, previous: [OTHER] }).risk).toBe('first')
    expect(ok({ ...usdc, to: '0x0000000000000000000000000000000000000000' }).risk).toBe('burn')
  })
  test('native fee shortfall warning (USDC and ETH)', () => {
    const poor = { ...snap, nativeBalance: 1_000n }
    const r = ok(usdc, poor)
    expect(r.warnings).toContainEqual({ kind: 'nativeFeeShortfall', shortBy: r.feeCap - 1_000n })
    const e = ok({ ...usdc, asset: 'ETH', amount: '1' }, snap) // amount == balance, fee unpaid
    expect(e.warnings).toContainEqual({ kind: 'nativeFeeShortfall', shortBy: e.feeCap })
  })
  test.each([
    [{ to: '0x123' as never }, 'invalidAddress'],
    [{ amount: 'abc' }, 'invalidAmount'],
    [{ amount: '0.0000001' }, 'tooManyDecimals'],
    [{ amount: '0' }, 'zeroAmount'],
    [{ amount: '5.000001' }, 'insufficientFunds'],
  ])('errors %j -> %s', (patch, error) => {
    expect(prepare({ ...usdc, ...patch }, snap)).toEqual({ ok: false, error })
  })
  test('fee above absolute cap is refused', () => {
    const r = prepare(usdc, { ...snap, baseFeePerGas: parseGwei('1000') })
    expect(r).toEqual({ ok: false, error: 'overAbsCap' })
  })
})

describe('signAndSubmit (fake submit, no network)', () => {
  const run = (approved = ok(usdc), latest = snap, submit: (raw: `0x${string}`) => Promise<Hash>) =>
    signAndSubmit(approved, latest, { mnemonic, submit })

  test('matching hash -> Pending; tx is a correct signed USDC transfer', async () => {
    let raw: `0x${string}` | undefined
    const res = await run(undefined, snap, async (r) => ((raw = r), keccak256(r)))
    expect(res.status).toBe('Pending')
    if (!raw || res.status !== 'Pending') throw new Error('unreachable')
    expect(res.hash).toBe(keccak256(raw))
    const tx = parseTransaction(raw)
    expect(tx).toMatchObject({ chainId: CHAIN.id, nonce: 7 })
    expect(tx.to?.toLowerCase()).toBe(ASSETS.USDC.address.toLowerCase())
    expect(tx.value ?? 0n).toBe(0n)
    const call = decodeFunctionData({ abi: erc20Abi, data: tx.data! })
    expect(call.functionName).toBe('transfer')
    expect(call.args).toEqual([RECIPIENT, 1_500_000n])
    expect(await recoverTransactionAddress({ serializedTransaction: raw as never })).toBe(deriveAddress(mnemonic))
  })
  test('ETH transfer goes to recipient with value', async () => {
    let raw: `0x${string}` | undefined
    await run(ok({ ...usdc, asset: 'ETH', amount: '0.1' }), snap, async (r) => ((raw = r), keccak256(r)))
    const tx = parseTransaction(raw!)
    expect(tx.to?.toLowerCase()).toBe(RECIPIENT.toLowerCase())
    expect(tx.value).toBe(parseEther('0.1'))
  })
  test('hash mismatch -> Unknown with local hash', async () => {
    const res = await run(undefined, snap, async () => `0x${'11'.repeat(32)}`)
    expect(res).toMatchObject({ status: 'Unknown', reason: 'hashMismatch' })
  })
  test('submit throws -> Unknown (tx may be out there)', async () => {
    const res = await run(undefined, snap, async () => {
      throw new Error('timeout')
    })
    expect(res).toMatchObject({ status: 'Unknown', reason: 'submitError' })
  })
  test('latest fee cap above approved -> NeedsReview, nothing submitted', async () => {
    let called = false
    const res = await run(undefined, { ...snap, baseFeePerGas: parseGwei('20') }, async () => ((called = true), '0x'))
    expect(res).toEqual({ status: 'NeedsReview' })
    expect(called).toBe(false)
  })
  test('nonce changed since review -> NeedsReview, nothing submitted', async () => {
    let called = false
    const res = await run(undefined, { ...snap, nonce: snap.nonce + 1 }, async () => ((called = true), '0x'))
    expect(res).toEqual({ status: 'NeedsReview' })
    expect(called).toBe(false)
  })
  test('latest fee cap over absolute cap -> Blocked', async () => {
    let called = false
    const huge = { ...snap, baseFeePerGas: ABS_MAX_FEE_WEI } // cap = gas * 2*base >> 0.005 ETH
    const res = await run(undefined, huge, async () => ((called = true), '0x'))
    expect(res).toEqual({ status: 'Blocked' })
    expect(called).toBe(false)
  })
})
