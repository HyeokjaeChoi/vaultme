import { HDKey } from 'viem/accounts'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { Mnemonic, deriveAddress, signAndSubmit } from '../src/signer'
import { prepare } from '../src'
import { PUBLIC_JUNK_ADDRESS, PUBLIC_JUNK_PHRASE, RECIPIENT } from './fixtures'

// SEC-9 (quality-gates plan): the seed and the HD keys (master, child) are wiped after each use.
// Honest ceiling: JS strings (the phrase, the hex key inside viem) cannot be wiped. This only claims the byte buffers.
const seeds: Uint8Array[] = []
vi.mock('@scure/bip39', async (orig) => {
  const real = await orig<typeof import('@scure/bip39')>()
  return {
    ...real,
    mnemonicToSeedSync: (...a: Parameters<typeof real.mnemonicToSeedSync>) => {
      const seed = real.mnemonicToSeedSync(...a)
      seeds.push(seed)
      return seed
    },
  }
})

// Every HD key made on the path (master and each derived step), with its key bytes as they were before the wipe.
const made: { key: HDKey; bytes: Uint8Array }[] = []
const note = (key: HDKey) => made.push({ key, bytes: key.privateKey! })
const fromMaster = HDKey.fromMasterSeed.bind(HDKey)
vi.spyOn(HDKey, 'fromMasterSeed').mockImplementation((seed) => {
  const m = fromMaster(seed)
  note(m)
  return m
})
// eslint-disable-next-line @typescript-eslint/unbound-method -- called with `this` below
const derive = HDKey.prototype.deriveChild
vi.spyOn(HDKey.prototype, 'deriveChild').mockImplementation(function (this: HDKey, index) {
  const c = derive.call(this, index)
  note(c)
  return c
})
afterEach(() => {
  seeds.length = made.length = 0
})

const wiped = () => {
  expect(seeds.length).toBeGreaterThan(0)
  expect(made).toHaveLength(6) // master + 5 steps of m/44'/60'/0'/0/0
  for (const s of seeds) expect(s.every((b) => b === 0)).toBe(true)
  for (const { key, bytes } of made) {
    expect(bytes.every((b) => b === 0)).toBe(true) // the buffer is zero, not only dropped
    expect(key.privateKey).toBeNull()
  }
}

describe('seed and HD-key buffers are wiped after use (SEC-9)', () => {
  const m = new Mnemonic(PUBLIC_JUNK_PHRASE)

  test('account(): seed zero, every HD key zero and null, and the account still signs', async () => {
    const account = m.account()
    wiped()
    expect(account.address).toBe(PUBLIC_JUNK_ADDRESS)
    expect(await account.signMessage({ message: 'x' })).toMatch(/^0x[0-9a-f]{130}$/)
  })

  test('deriveAddress(): seed zero, every HD key zero and null', () => {
    expect(deriveAddress(m)).toBe(PUBLIC_JUNK_ADDRESS)
    wiped()
  })

  test('signAndSubmit(): seed zero, every HD key zero and null', async () => {
    const snap = {
      nonce: 0,
      nativeBalance: 10n ** 18n,
      tokenBalance: 0n,
      gasLimit: 21_000n,
      baseFeePerGas: 1_000_000_000n,
      maxPriorityFeePerGas: 1_000_000_000n,
    }
    const r = prepare({ asset: 'ETH', to: RECIPIENT, amount: '0.000000000000000001', previous: [] }, snap)
    if (!r.ok) throw new Error('review expected')
    const submit = vi.fn(() => Promise.resolve<`0x${string}`>('0x00'))
    await signAndSubmit(r.review, snap, { mnemonic: m, submit })
    expect(submit).toHaveBeenCalledOnce()
    wiped()
  })
})
