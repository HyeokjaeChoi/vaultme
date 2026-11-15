import { USDC_SEPOLIA } from '@vaultme/contracts'
import { toUnits, prepare, type Address, type Hex } from '@vaultme/wallet-core'
import { Mnemonic } from '@vaultme/wallet-core/signer'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { canCancel, quoteCancel, runCancel } from '../src/features/send/model/cancel'
import { cancelMined } from '../src/features/send/model/hashes'
import { blocksNewSend, runSend, type SendOutcome } from '../src/features/send/model/runSend'
import { canSpeedUp, quoteSpeedUp, runSpeedUp, type SpeedUpDeps } from '../src/features/send/model/speedUp'
import { checkTx } from '../src/features/send/model/txState'
import { createRpcChain } from '../src/shared/chain/real'
import type { PendingTx } from '../src/shared/storage'
import { admin, appRpc, mine } from './anvil'

// CHAIN-3 (Q67): the send path with the real app code on a local anvil chain (chain id 11155111, `safe` = head - 2): `createRpcChain`,
// `runSend`, `runReplace` (speed up, cancel), `checkTx` and `deriveState`. Nothing in the app is faked; only the network is a local node.
// Every case starts from an anvil snapshot, so the cases do not depend on each other.

// Hardhat/viem dev phrase, public test vector (R10): anvil account 0 holds 10,000 ETH.
const PHRASE = 'test test test test test test test test test test test junk'
const SENDER = new Mnemonic(PHRASE).account().address
const TO: Address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' // anvil account 1
const REVERTS_UNTIL_SET = '0x' + 'ee'.repeat(20) // contract: reverts while storage slot 0 is zero, else stops
const REVERTS_UNTIL_SET_CODE = '0x600054600a57600080fd5b00'
const AMOUNT = '0.001'

const chain = createRpcChain(appRpc)
let stored: PendingTx | null = null
const depsFor = (c: SpeedUpDeps['chain']): SpeedUpDeps => ({
  chain: c,
  loadPhrase: () => Promise.resolve({ status: 'ok', mnemonic: new Mnemonic(PHRASE) }),
  readPending: () => stored,
  savePending: (tx) => void (stored = tx),
  now: () => 1_700_000_000,
  prompt: { title: 'auth', cancel: 'cancel' },
})
const deps = depsFor(chain)

const balance = async (a: string): Promise<bigint> => BigInt((await admin('eth_getBalance', [a, 'latest'])) as string)
const head = async (): Promise<bigint> => BigInt((await admin('eth_blockNumber')) as string)
const nonceAt = async (tag: 'latest' | 'pending'): Promise<bigint> =>
  BigInt((await admin('eth_getTransactionCount', [SENDER, tag])) as string)

/** What the user does on Review: a snapshot, `prepare`, then `runSend` (auth, a fresh snapshot, sign, submit). */
async function send(to: Address, amount: string, c: SpeedUpDeps['chain'] = chain): Promise<SendOutcome> {
  const snapshot = await c.getSnapshot(SENDER, 'ETH', to, amount)
  const r = prepare({ asset: 'ETH', to, amount, previous: [] }, snapshot)
  if (!r.ok) throw new Error(`prepare refused: ${r.error}`)
  return runSend(r.review, amount, SENDER, depsFor(c))
}
const current = (): PendingTx => {
  if (stored === null) throw new Error('no send recorded')
  return stored
}
/** One status check (S41 "상태 다시 확인"): the record moves only by what the chain says. */
const check = async (): Promise<PendingTx> => (stored = await checkTx(current(), chain, SENDER, deps.now))
const pending = async (): Promise<PendingTx> => {
  const out = await send(TO, AMOUNT)
  expect(out.status).toBe('Pending')
  return current()
}

let snapshotId: string
beforeAll(() => mine(10)) // `anvil_reorg` needs a chain at least as high as its depth
beforeEach(async () => {
  stored = null
  snapshotId = (await admin('evm_snapshot')) as string
  await admin('anvil_setCode', [REVERTS_UNTIL_SET, REVERTS_UNTIL_SET_CODE])
  // `getSnapshot` reads the USDC balance (eth_call). A local chain has no token there: this code answers one zero word (balance 0).
  await admin('anvil_setCode', [USDC_SEPOLIA, '0x60206000f3'])
})
afterEach(async () => {
  await admin('evm_revert', [snapshotId])
})

describe('send lifecycle on anvil (chain id 11155111)', () => {
  it('1. ETH send: Pending, Included in a block, Confirmed once `safe` reaches it', async () => {
    const before = await balance(TO)
    const tx = await pending()
    expect(tx.nonce).toBe(0)
    expect(await nonceAt('latest')).toBe(0n) // in the pool, not in a block
    expect((await check()).state).toBe('Pending')

    await mine(1)
    const included = await check()
    expect(included).toMatchObject({ state: 'Included', blockNumber: Number(await head()), minedHash: tx.hash })

    await mine(2)
    const confirmed = await check()
    expect(confirmed).toMatchObject({ state: 'Confirmed', minedHash: tx.hash })
    expect(await balance(TO)).toBe(before + toUnits(AMOUNT, 'ETH'))
    expect(await nonceAt('latest')).toBe(1n)
  })

  it('2. a tx that reverts: Included, then Failed once `safe` reaches it', async () => {
    // slot 0 is zero: the node cannot estimate gas, so the app uses its 21,000 fallback; that equals the intrinsic gas, so the tx runs out of gas
    // in the block (status 0). Either way the receipt is a failed one.
    const out = await send(REVERTS_UNTIL_SET as Address, AMOUNT)
    expect(out.status).toBe('Pending')
    await mine(1)
    expect((await check()).state).toBe('Included') // a revert above `safe` is not a verdict yet
    await mine(2)
    expect(await check()).toMatchObject({ state: 'Failed' })
    expect(await balance(REVERTS_UNTIL_SET)).toBe(0n) // the value went back with the revert
  })

  it('3. a reorg takes the tx out of its block: Included goes back to Pending, then the same tx is mined again', async () => {
    const raws: Hex[] = []
    const recording: SpeedUpDeps['chain'] = {
      ...chain,
      submit: (raw) => {
        raws.push(raw)
        return chain.submit(raw)
      },
    }
    const out = await send(TO, AMOUNT, recording)
    expect(out.status).toBe('Pending')
    const hash = current().hash
    await mine(1)
    expect(await check()).toMatchObject({ state: 'Included', minedHash: hash })

    await admin('anvil_reorg', [1, []]) // the block with the tx is replaced by an empty one
    const back = await check()
    expect(back.state).toBe('Pending')
    expect(back.minedHash).toBeUndefined() // the explorer link falls back to the latest sent hash

    await admin('anvil_reorg', [1, [[raws[0], 0]]]) // the same raw tx lands in the replacement block
    expect(await check()).toMatchObject({ state: 'Included', minedHash: hash })
    await mine(2)
    expect(await check()).toMatchObject({ state: 'Confirmed', minedHash: hash })
  })

  it('4. speed up: the replacement is mined, the original never is; Confirmed on the replacement hash', async () => {
    const original = await pending()
    expect(canSpeedUp(original, true)).toBe(true)
    const plan = await quoteSpeedUp(original, SENDER, chain)
    const out = await runSpeedUp(original, plan, SENDER, deps)
    expect(out.status).toBe('Sent')
    const sped = current()
    expect(sped.hashes).toHaveLength(2)
    expect(sped).toMatchObject({ kind: 'speedUp', nonce: original.nonce })
    expect(BigInt(sped.maxFeePerGas!)).toBeGreaterThan(BigInt(original.maxFeePerGas!)) // anvil does not enforce the 10 % rule; the app does

    await mine(1)
    const [first, second] = sped.hashes!
    expect(await chain.getReceipt(first as Hex)).toBeNull() // replaced in the pool
    expect(await check()).toMatchObject({ state: 'Included', minedHash: second })
    await mine(2)
    expect(await check()).toMatchObject({ state: 'Confirmed', minedHash: second })
    expect(await nonceAt('latest')).toBe(1n) // one tx for the nonce
  })

  it('5. cancel: above `safe` the send stays Pending, at or below it the send is Replaced by the cancel', async () => {
    const before = await balance(TO)
    const original = await pending()
    expect(canCancel(original, true)).toBe(true)
    const plan = await quoteCancel(original, SENDER, chain)
    expect((await runCancel(original, plan, SENDER, deps)).status).toBe('Sent')
    expect(current()).toMatchObject({ kind: 'cancel', cancelFrom: 1 })

    await mine(1)
    expect(await chain.getReceipt(current().hashes![1] as Hex)).not.toBeNull() // the cancel is in the block
    expect(await chain.getReceipt(original.hash as Hex)).toBeNull()
    expect((await check()).state).toBe('Pending') // no cancel is claimed before it is final (ADR-0031)
    await mine(2)
    const done = await check()
    expect(done.state).toBe('Replaced')
    expect(cancelMined(done)).toBe(true)
    expect(done.minedHash).toBe(current().hashes?.[1])
    expect(await balance(TO)).toBe(before) // the amount never left
  })

  it('6. Replaced: another tx with the same nonce is mined, our tx has no receipt', async () => {
    const original = await pending()
    const other = await new Mnemonic(PHRASE).account().signTransaction({
      type: 'eip1559',
      chainId: 11155111,
      nonce: original.nonce,
      gas: 21_000n,
      maxFeePerGas: 4n * BigInt(original.maxFeePerGas!),
      maxPriorityFeePerGas: 4n * BigInt(original.maxPriorityFeePerGas!),
      to: TO,
      value: 1n,
    })
    await admin('eth_sendRawTransaction', [other]) // made outside the app, e.g. from another wallet app with the same phrase
    await mine(1)
    expect(await chain.getReceipt(original.hash as Hex)).toBeNull()
    expect((await check()).state).toBe('Pending') // `safe` has not reached the other tx yet
    await mine(2)
    const done = await check()
    expect(done.state).toBe('Replaced')
    expect(cancelMined(done)).toBe(false) // not a cancel of ours: the plain Replaced copy
    expect(done.minedHash).toBeUndefined()
  })

  it('7. duplicate broadcast: the node says "already imported", the app records Unknown, a receipt then makes it Included', async () => {
    const before = await balance(TO)
    // What the API proxy can do after a timeout: send the same raw tx to a second upstream.
    let nodeSaid: unknown
    const twice: SpeedUpDeps['chain'] = {
      ...chain,
      submit: async (raw) => {
        await chain.submit(raw)
        try {
          return await chain.submit(raw)
        } catch (e) {
          nodeSaid = e
          throw e
        }
      },
    }
    const out = await send(TO, AMOUNT, twice)
    expect(nodeSaid).toMatchObject({ rpcCode: -32003, message: expect.stringMatching(/already imported/) as string })
    expect(out.status).toBe('Unknown') // not thrown: the tx is out there
    const unknown = current()
    expect(unknown.state).toBe('Unknown')
    expect(blocksNewSend(unknown)).toBe(true)

    await mine(1)
    expect(await check()).toMatchObject({ state: 'Included', minedHash: unknown.hash })
    await mine(2)
    expect((await check()).state).toBe('Confirmed')
    expect(await nonceAt('latest')).toBe(1n)
    expect(await balance(TO)).toBe(before + toUnits(AMOUNT, 'ETH')) // sent once
  })

  it('8. stale nonce: "nonce too low" is not a refusal, the record is Unknown; the next check reads Replaced', async () => {
    await pending()
    await mine(3)
    expect((await check()).state).toBe('Confirmed') // nonce 0 is used and safe
    // A lagging node answers the pending nonce with the old value (the case CHAIN-4 keeps away from the hedge).
    let nodeSaid: unknown
    const lagging: SpeedUpDeps['chain'] = {
      ...chain,
      submit: async (raw) => {
        try {
          return await chain.submit(raw)
        } catch (e) {
          nodeSaid = e
          throw e
        }
      },
      getSnapshot: async (...args) => ({ ...(await chain.getSnapshot(...args)), nonce: 0 }),
    }
    const out = await send(TO, '0.002', lagging)
    expect(nodeSaid).toMatchObject({ rpcCode: -32003, message: expect.stringMatching(/nonce too low/) as string })
    expect(out.status).toBe('Unknown')
    expect(current()).toMatchObject({ state: 'Unknown', nonce: 0 })
    expect(blocksNewSend(current())).toBe(true)
    // Documented behavior today: the safe account nonce is already past ours, so the check says Replaced.
    expect((await check()).state).toBe('Replaced')
    expect(await nonceAt('latest')).toBe(1n) // the second tx never ran
  })

  // ADR-0041 (was the known bug of plan section 1 finding 4): an Unknown send that never reached a node blocked every new send, and only
  // Pending offered cancel. Now Cancel is offered for Unknown too, and it frees the nonce.
  it('9. Unknown deadlock: a send that never reached a node leaves the user a way out (Cancel)', async () => {
    const neverSent: SpeedUpDeps['chain'] = { ...chain, submit: () => Promise.reject(new Error('timeout')) }
    await send(TO, AMOUNT, neverSent)
    expect(await nonceAt('pending')).toBe(0n) // nothing reached the node
    await mine(3)
    expect((await check()).state).toBe('Unknown') // no receipt, no node record: the result is not known
    expect(blocksNewSend(current())).toBe(true)
    expect(canCancel(current(), true)).toBe(true)
    expect(canSpeedUp(current(), true)).toBe(false)

    const plan = await quoteCancel(current(), SENDER, chain)
    expect((await runCancel(current(), plan, SENDER, deps)).status).toBe('Sent')
    expect(current()).toMatchObject({ state: 'Pending', kind: 'cancel' })
    await mine(3)
    const done = await check()
    expect(done.state).toBe('Replaced')
    expect(cancelMined(done)).toBe(true)
    expect(blocksNewSend(done)).toBe(false) // the user can send again
    expect(await nonceAt('latest')).toBe(1n)
  })
})
