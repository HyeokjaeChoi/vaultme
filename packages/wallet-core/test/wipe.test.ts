import { mnemonicToSeedSync } from '@scure/bip39'
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

const masters: HDKey[] = []
const children: HDKey[] = []
const fromMaster = HDKey.fromMasterSeed.bind(HDKey)
vi.spyOn(HDKey, 'fromMasterSeed').mockImplementation((seed) => {
  const m = fromMaster(seed)
  masters.push(m)
  const derive = m.derive.bind(m)
  vi.spyOn(m, 'derive').mockImplementation((path) => {
    const c = derive(path)
    children.push(c)
    return c
  })
  return m
})
afterEach(() => {
  seeds.length = masters.length = children.length = 0
})

const wiped = () => {
  expect(seeds.length).toBeGreaterThan(0)
  expect(masters.length).toBeGreaterThan(0)
  expect(children.length).toBeGreaterThan(0)
  for (const s of seeds) expect(s.every((b) => b === 0)).toBe(true)
  for (const m of masters) expect(m.privateKey).toBeNull()
  for (const c of children) expect(c.privateKey).toBeNull()
}

describe('seed and HD-key buffers are wiped after use (SEC-9)', () => {
  const m = new Mnemonic(PUBLIC_JUNK_PHRASE)

  test('account(): seed zero, master and child keys null, and the account still signs', async () => {
    const account = m.account()
    wiped()
    expect(account.address).toBe(PUBLIC_JUNK_ADDRESS)
    expect(await account.signMessage({ message: 'x' })).toMatch(/^0x[0-9a-f]{130}$/)
  })

  test('deriveAddress(): seed zero, master and child keys null', () => {
    expect(deriveAddress(m)).toBe(PUBLIC_JUNK_ADDRESS)
    wiped()
  })

  test('signAndSubmit(): seed zero, master and child keys null', async () => {
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

  test('the seed buffer the test sees is the one bip39 returns for this phrase (the spy is real)', () => {
    m.account()
    expect(seeds[0]).toHaveLength(64)
    expect(mnemonicToSeedSync(PUBLIC_JUNK_PHRASE).some((b) => b !== 0)).toBe(true) // a fresh seed is not zero
  })
})
