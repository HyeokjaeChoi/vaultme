import { beforeEach, describe, expect, it, vi } from 'vitest'

// Published BIP39 test vector (all-zero entropy). Its first account is a well-known public address. Not a wallet phrase.
const VECTOR = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const VECTOR_ADDRESS = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const PROMPT = { title: '인증하세요', cancel: '취소' }

const items = new Map<string, { username: string; password: string }>()
vi.mock('react-native-keychain', () => ({
  ACCESS_CONTROL: { BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'x' },
  ACCESSIBLE: { WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'x', AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'y' },
  setGenericPassword: vi.fn(async (u: string, p: string, o: { service: string }) => {
    items.set(o.service, { username: u, password: p })
    return { service: o.service, storage: 'x' }
  }),
  getGenericPassword: vi.fn(async (o: { service: string }) => items.get(o.service) ?? false),
  hasGenericPassword: vi.fn(async (o: { service: string }) => items.has(o.service)),
  resetGenericPassword: vi.fn(async () => true),
  getSupportedBiometryType: vi.fn(async () => null),
}))
vi.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    const m = new Map<string, string | number | boolean>()
    return {
      set: (k: string, v: string | number | boolean) => void m.set(k, v),
      getString: (k: string) => (typeof m.get(k) === 'string' ? (m.get(k) as string) : undefined),
      getNumber: () => undefined,
      getBoolean: (k: string) => (typeof m.get(k) === 'boolean' ? (m.get(k) as boolean) : undefined),
      remove: (k: string) => m.delete(k),
    }
  },
}))
vi.mock('expo-crypto', () => ({ getRandomBytes: (n: number) => Uint8Array.from({ length: n }, (_, i) => i + 1) }))
vi.mock('@vaultme/wallet-core', async (orig) => {
  const real = await orig<typeof import('@vaultme/wallet-core')>()
  return { ...real, generateMnemonic: () => new real.Mnemonic(VECTOR) }
})

beforeEach(() => {
  items.clear()
  vi.resetModules()
})

describe('createWallet', () => {
  it('stores the phrase and the derived first-account address, backup not done', async () => {
    const { createWallet } = await import('../src/features/backup/model/createWallet')
    const kv = await import('../src/shared/storage/kv')
    await kv.openKv()
    expect(kv.getAccountAddress()).toBeNull()
    await createWallet(PROMPT)
    expect(kv.getAccountAddress()).toBe(VECTOR_ADDRESS)
    expect(kv.getBackupDone()).toBe(false)
    expect(items.get('app.vaultme.phrase')?.password).toBe(VECTOR)
  })

  it('never replaces an existing phrase or its address', async () => {
    const { createWallet } = await import('../src/features/backup/model/createWallet')
    const kv = await import('../src/shared/storage/kv')
    await kv.openKv()
    items.set('app.vaultme.phrase', { username: 'vaultme', password: 'kept' })
    await createWallet(PROMPT)
    expect(items.get('app.vaultme.phrase')?.password).toBe('kept')
    expect(kv.getAccountAddress()).toBeNull()
  })
})
