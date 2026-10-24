import { beforeEach, describe, expect, it, vi } from 'vitest'

// Published BIP39 test vector (all-zero entropy). Not a wallet phrase.
const VECTOR = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const PROMPT = { title: '인증하세요', cancel: '취소' }

const items = new Map<string, { username: string; password: string }>()
const calls: { fn: string; service: string; opts?: Record<string, unknown> }[] = []
let failGet: string | false = false

vi.mock('react-native-keychain', () => ({
  ACCESS_CONTROL: { BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'BiometryAnyOrDevicePasscode' },
  ACCESSIBLE: {
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'AccessibleWhenPasscodeSetThisDeviceOnly',
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AccessibleAfterFirstUnlockThisDeviceOnly',
  },
  setGenericPassword: vi.fn((username: string, password: string, o: { service: string }) => {
    calls.push({ fn: 'set', service: o.service, opts: o })
    items.set(o.service, { username, password })
    return Promise.resolve({ service: o.service, storage: 'x' })
  }),
  getGenericPassword: vi.fn((o: { service: string }) => {
    calls.push({ fn: 'get', service: o.service, opts: o })
    if (failGet && o.service.endsWith('phrase')) return Promise.reject(new Error(failGet))
    return Promise.resolve(items.get(o.service) ?? false)
  }),
  hasGenericPassword: vi.fn((o: { service: string }) => Promise.resolve(items.has(o.service))),
  resetGenericPassword: vi.fn((o: { service: string }) => Promise.resolve(items.delete(o.service))),
  getSupportedBiometryType: vi.fn(() => Promise.resolve(null)),
}))

let mmkvFail = false
const mmkvOpts: Record<string, unknown>[] = []
const mmkvMaps: Map<string, string | number | boolean>[] = []
vi.mock('react-native-mmkv', () => ({
  createMMKV: (o: Record<string, unknown>) => {
    if (mmkvFail) throw new Error('mmkv init')
    mmkvOpts.push(o)
    const m = new Map<string, string | number | boolean>()
    mmkvMaps.push(m)
    return {
      set: (k: string, v: string | number | boolean) => void m.set(k, v),
      getString: (k: string) => (typeof m.get(k) === 'string' ? (m.get(k) as string) : undefined),
      getNumber: (k: string) => (typeof m.get(k) === 'number' ? (m.get(k) as number) : undefined),
      getBoolean: (k: string) => (typeof m.get(k) === 'boolean' ? (m.get(k) as boolean) : undefined),
      remove: (k: string) => m.delete(k),
    }
  },
}))

let n = 0
vi.mock('expo-crypto', () => ({ getRandomBytes: (len: number) => Uint8Array.from({ length: len }, () => ++n) }))

beforeEach(() => {
  items.clear()
  calls.length = 0
  mmkvOpts.length = 0
  mmkvMaps.length = 0
  failGet = false
  mmkvFail = false
  vi.resetModules()
})

describe('keychain phrase', () => {
  it('round-trips and uses the auth + this-device-only tier', async () => {
    const { Mnemonic } = await import('@vaultme/wallet-core')
    const k = await import('../src/shared/storage/keychain')
    expect(await k.hasPhrase()).toBe(false)
    await k.savePhrase(new Mnemonic(VECTOR), PROMPT)
    expect(await k.hasPhrase()).toBe(true)
    const set = calls.find((c) => c.fn === 'set')!
    expect(set.opts).toMatchObject({
      accessControl: 'BiometryAnyOrDevicePasscode',
      accessible: 'AccessibleWhenPasscodeSetThisDeviceOnly',
      cloudSync: false,
      authenticationPrompt: PROMPT,
    })
    const loaded = await k.loadPhrase(PROMPT)
    expect(calls.find((c) => c.fn === 'get')!.opts).toMatchObject({ authenticationPrompt: PROMPT })
    expect(loaded.status === 'ok' && loaded.mnemonic.reveal()).toBe(VECTOR)
    await k.deletePhrase()
    expect(await k.hasPhrase()).toBe(false)
    expect(await k.loadPhrase(PROMPT)).toEqual({ status: 'error' })
  })

  it('deletePhrase throws only when the item survives a failed reset', async () => {
    const k = await import('../src/shared/storage/keychain')
    const kc = await import('react-native-keychain')
    items.set('app.vaultme.phrase', { username: 'vaultme', password: VECTOR })
    vi.mocked(kc.resetGenericPassword).mockResolvedValueOnce(false)
    await expect(k.deletePhrase()).rejects.toThrow('delete failed')
    vi.mocked(kc.resetGenericPassword).mockResolvedValueOnce(false)
    items.clear()
    await expect(k.deletePhrase()).resolves.toBeUndefined()
  })

  it('maps a user cancel to cancelled and other failures to error', async () => {
    const { Mnemonic } = await import('@vaultme/wallet-core')
    const k = await import('../src/shared/storage/keychain')
    await k.savePhrase(new Mnemonic(VECTOR), PROMPT)
    failGet = 'User canceled the operation.'
    expect(await k.loadPhrase(PROMPT)).toEqual({ status: 'cancelled' })
    failGet = 'keychain exploded'
    expect(await k.loadPhrase(PROMPT)).toEqual({ status: 'error' })
    expect(k.loadFailureStatus('not an Error')).toBe('error')
  })

  it('returns error for a stored value that is not a valid phrase', async () => {
    const k = await import('../src/shared/storage/keychain')
    items.set('app.vaultme.phrase', { username: 'vaultme', password: 'not a phrase' })
    expect(await k.loadPhrase(PROMPT)).toEqual({ status: 'error' })
  })
})

describe('kv key + store', () => {
  it('creates the key once, reuses it, in the no-auth tier', async () => {
    const k = await import('../src/shared/storage/keychain')
    const a = await k.getOrCreateKvKey()
    const b = await k.getOrCreateKvKey()
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    const sets = calls.filter((c) => c.fn === 'set')
    expect(sets).toHaveLength(1)
    expect(sets[0]!.opts).toMatchObject({ accessible: 'AccessibleAfterFirstUnlockThisDeviceOnly' })
    expect(sets[0]!.opts).not.toHaveProperty('accessControl')
  })

  it('opens MMKV once with the key; helpers need openKv first', async () => {
    const kv = await import('../src/shared/storage/kv')
    expect(() => kv.getBackupDone()).toThrow()
    await Promise.all([kv.openKv(), kv.openKv()])
    expect(mmkvOpts).toHaveLength(1)
    expect(mmkvOpts[0]).toMatchObject({ encryptionType: 'AES-256' })
    expect(typeof mmkvOpts[0]!.encryptionKey).toBe('string')
  })

  it('openKv retries after createMMKV throws', async () => {
    const kv = await import('../src/shared/storage/kv')
    mmkvFail = true
    await expect(kv.openKv()).rejects.toThrow()
    mmkvFail = false
    await kv.openKv()
    expect(kv.getBackupDone()).toBe(false)
  })

  it('round-trips backup flag, lock settings/state', async () => {
    const kv = await import('../src/shared/storage/kv')
    await kv.openKv()
    expect(kv.getBackupDone()).toBe(false)
    kv.setBackupDone(true)
    expect(kv.getBackupDone()).toBe(true)
    expect(kv.getLockSettings()).toEqual({ graceSeconds: 30 })
    kv.setLockSettings({ graceSeconds: 60 })
    expect(kv.getLockSettings()).toEqual({ graceSeconds: 60 })
    expect(kv.getLockState()).toEqual({ locked: true, backgroundedAt: null })
    kv.setLockState({ locked: false, backgroundedAt: 123 })
    expect(kv.getLockState()).toEqual({ locked: false, backgroundedAt: 123 })
    kv.setLockState({ locked: false, backgroundedAt: null })
    expect(kv.getLockState().backgroundedAt).toBeNull()
  })

  it('round-trips the account address', async () => {
    const kv = await import('../src/shared/storage/kv')
    await kv.openKv()
    expect(kv.getAccountAddress()).toBeNull()
    kv.setAccountAddress('0x9858EfFD232B4033E47d90003D41EC34EcaEda94')
    expect(kv.getAccountAddress()).toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94')
  })

  it('round-trips a pending tx and rejects malformed records', async () => {
    const kv = await import('../src/shared/storage/kv')
    await kv.openKv()
    expect(kv.getPendingTx()).toBeNull()
    const tx = {
      hash: '0xabc',
      nonce: 3,
      asset: 'ETH',
      to: '0xdef',
      amount: '0.1',
      createdAt: 1,
      lastCheckedAt: 2,
      state: 'Pending' as const,
    }
    kv.setPendingTx(tx)
    expect(kv.getPendingTx()).toEqual(tx)
    kv.setPendingTx(null)
    expect(kv.getPendingTx()).toBeNull()

    expect(kv.parsePendingTx('{not json')).toBeNull()
    expect(kv.parsePendingTx('null')).toBeNull()
    expect(kv.parsePendingTx(JSON.stringify({ ...tx, nonce: '3' }))).toBeNull()
    expect(kv.parsePendingTx(JSON.stringify({ ...tx, state: 'Done' }))).toBeNull()
    expect(kv.parsePendingTx(JSON.stringify({ hash: 'x' }))).toBeNull()
  })

  it('a corrupt stored pending tx throws instead of reading as none', async () => {
    const kv = await import('../src/shared/storage/kv')
    await kv.openKv()
    mmkvMaps[0]!.set('pendingTx', '{bad')
    expect(() => kv.getPendingTx()).toThrow('corrupt')
  })
})

describe('Mnemonic safety', () => {
  it('error text and masked form never contain the phrase', async () => {
    const { Mnemonic } = await import('@vaultme/wallet-core')
    const m = new Mnemonic(VECTOR)
    expect(String(m)).not.toContain('abandon')
    expect(JSON.stringify({ m })).not.toContain('abandon')
  })
})
