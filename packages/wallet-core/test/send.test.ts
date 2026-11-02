import {
  keccak256,
  parseEther,
  parseGwei,
  parseTransaction,
  recoverTransactionAddress,
  decodeFunctionData,
  erc20Abi,
  type Hash,
} from 'viem'
import { describe, expect, test } from 'vitest'
import { ABS_MAX_FEE_WEI, ASSETS, CHAIN, prepare, type ChainSnapshot, type SendIntent } from '../src'
import { Mnemonic, deriveAddress, signAndSubmit, signReplacement } from '../src/signer'
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
    const res = await run(undefined, snap, (r) => {
      raw = r
      return Promise.resolve(keccak256(r))
    })
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
    await run(ok({ ...usdc, asset: 'ETH', amount: '0.1' }), snap, (r) => {
      raw = r
      return Promise.resolve(keccak256(r))
    })
    const tx = parseTransaction(raw!)
    expect(tx.to?.toLowerCase()).toBe(RECIPIENT.toLowerCase())
    expect(tx.value).toBe(parseEther('0.1'))
  })
  test('hash mismatch -> Unknown with local hash', async () => {
    const res = await run(undefined, snap, () => Promise.resolve(`0x${'11'.repeat(32)}` as const))
    expect(res).toMatchObject({ status: 'Unknown', reason: 'hashMismatch' })
  })
  test('submit throws -> Unknown (tx may be out there)', async () => {
    const res = await run(undefined, snap, () => Promise.reject(new Error('timeout')))
    expect(res).toMatchObject({ status: 'Unknown', reason: 'submitError' })
  })
  test('a node refusal (underpriced, nonce too low, insufficient funds) throws; "already known" and a timeout stay Unknown', async () => {
    const rpc = (message: string) => Object.assign(new Error(message), { rpcCode: -32000 })
    for (const m of [
      'replacement transaction underpriced',
      'nonce too low: next nonce 8',
      'insufficient funds for gas * price + value',
    ])
      await expect(run(undefined, snap, () => Promise.reject(rpc(m)))).rejects.toThrow(m)
    expect(await run(undefined, snap, () => Promise.reject(rpc('already known')))).toMatchObject({ status: 'Unknown' })
    expect(await run(undefined, snap, () => Promise.reject(new Error('nonce too low')))).toMatchObject({
      status: 'Unknown',
    })
  })
  test('latest fee cap above approved -> NeedsReview, nothing submitted', async () => {
    let called = false
    const res = await run(undefined, { ...snap, baseFeePerGas: parseGwei('20') }, () => {
      called = true
      return Promise.resolve('0x' as const)
    })
    expect(res).toEqual({ status: 'NeedsReview' })
    expect(called).toBe(false)
  })
  test('nonce changed since review -> NeedsReview, nothing submitted', async () => {
    let called = false
    const res = await run(undefined, { ...snap, nonce: snap.nonce + 1 }, () => {
      called = true
      return Promise.resolve('0x' as const)
    })
    expect(res).toEqual({ status: 'NeedsReview' })
    expect(called).toBe(false)
  })
  test('latest fee cap over absolute cap -> Blocked', async () => {
    let called = false
    const huge = { ...snap, baseFeePerGas: ABS_MAX_FEE_WEI } // cap = gas * 2*base >> 0.005 ETH
    const res = await run(undefined, huge, () => {
      called = true
      return Promise.resolve('0x' as const)
    })
    expect(res).toEqual({ status: 'Blocked' })
    expect(called).toBe(false)
  })
})

describe('signReplacement as a cancel (ADR-0031)', () => {
  test('0 ETH to the own address, gas 21000, the original nonce', async () => {
    const own = mnemonic.account().address
    const raws: `0x${string}`[] = []
    const submit = (raw: `0x${string}`) => (raws.push(raw), Promise.resolve(keccak256(raw)))
    const fee = { maxFeePerGas: parseGwei('30'), maxPriorityFeePerGas: parseGwei('2') }
    const out = await signReplacement(
      { asset: 'ETH', to: own, amount: 0n, gasLimit: 21_000n, nonce: 7, ...fee },
      { mnemonic, submit },
    )
    expect(out.status).toBe('Pending')
    const tx = parseTransaction(raws[0]!)
    expect(tx).toMatchObject({ nonce: 7, gas: 21_000n, to: own.toLowerCase(), ...fee })
    expect(tx.value ?? 0n).toBe(0n) // a zero value is encoded as empty
  })
})

describe('signReplacement (speed up, ADR-0031)', () => {
  test('same nonce, to, value, gas and chain; only the fee fields change', async () => {
    const approved = ok({ asset: 'ETH', to: RECIPIENT, amount: '0.05', previous: [RECIPIENT] })
    const raws: `0x${string}`[] = []
    const submit = (raw: `0x${string}`) => {
      raws.push(raw)
      return Promise.resolve(keccak256(raw))
    }
    const higher = {
      maxFeePerGas: approved.maxFeePerGas * 2n,
      maxPriorityFeePerGas: approved.maxPriorityFeePerGas * 2n,
    }
    const out = await signReplacement({ ...approved, ...higher }, { mnemonic, submit })
    expect(out.status).toBe('Pending')
    const tx = parseTransaction(raws[0]!)
    expect(tx).toMatchObject({
      chainId: CHAIN.id,
      nonce: approved.nonce,
      to: approved.to.toLowerCase(),
      value: approved.amount,
      gas: approved.gasLimit,
      ...higher,
    })
  })
  test('a fee cap above the absolute cap is Blocked and nothing is submitted', async () => {
    const approved = ok(usdc)
    const submit = () => Promise.reject(new Error('must not submit'))
    const out = await signReplacement(
      { ...approved, maxFeePerGas: ABS_MAX_FEE_WEI / approved.gasLimit + 1n },
      { mnemonic, submit },
    )
    expect(out).toEqual({ status: 'Blocked' })
  })
})
