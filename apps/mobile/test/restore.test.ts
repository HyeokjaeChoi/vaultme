import { beforeEach, describe, expect, it, vi } from 'vitest'
import { inspectPhrase, toWords } from '../src/features/restore/model/phrase'

// Published BIP39 test vectors only (trezor python-mnemonic vectors.json): all-zero entropy, 12 and 24 words. Not wallet phrases.
const VECTOR = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const VECTOR_24 = `${'abandon '.repeat(23)}art`
const VECTOR_ADDRESS = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const BAD_CHECKSUM = VECTOR.replace(/about$/, 'abandon')
const PROMPT = { title: '인증하세요', cancel: '취소' }

describe('toWords', () => {
  it('lower-cases and splits on any whitespace', () => {
    expect(toWords('  Abandon\tABANDON\n about  ')).toEqual(['abandon', 'abandon', 'about'])
    expect(toWords('   ')).toEqual([])
  })
})

describe('inspectPhrase', () => {
  it('is ready at 12 and 24 words, mixed case and extra spaces included', () => {
    expect(inspectPhrase(VECTOR)).toEqual({ count: 12, ready: true, issue: null })
    expect(inspectPhrase(`  ${VECTOR.toUpperCase().replace(/ /g, '  ')}\n`).ready).toBe(true)
    expect(inspectPhrase(VECTOR_24)).toEqual({ count: 24, ready: true, issue: null })
  })
  it('names the first word outside the wordlist, but not the word still being typed', () => {
    expect(inspectPhrase('abandon abandon abcd').issue).toBeNull() // "abcd" is still being typed
    expect(inspectPhrase('abandon abandon abcd ').issue).toEqual({ kind: 'unknownWord', word: 'abcd' })
    expect(inspectPhrase('abandon abandon abcd', true).issue).toEqual({ kind: 'unknownWord', word: 'abcd' })
    expect(inspectPhrase('abandon zzzz abcd about ').issue).toEqual({ kind: 'unknownWord', word: 'zzzz' })
    expect(inspectPhrase(VECTOR.replace('about', 'abcd')).ready).toBe(false)
  })
  it('keeps the button off until 12 or 24 words; wrong count shows only when final or past 24', () => {
    expect(inspectPhrase('abandon abandon ').ready).toBe(false)
    expect(inspectPhrase('abandon abandon ').issue).toBeNull()
    expect(inspectPhrase('abandon abandon ', true).issue).toEqual({ kind: 'wrongCount', count: 2 })
    expect(inspectPhrase('', true).issue).toBeNull()
    expect(inspectPhrase(`${VECTOR_24} abandon`).issue).toEqual({ kind: 'wrongCount', count: 25 })
  })
  it('reports a checksum failure only when final', () => {
    expect(inspectPhrase(BAD_CHECKSUM)).toEqual({ count: 12, ready: true, issue: null })
    expect(inspectPhrase(BAD_CHECKSUM, true).issue).toEqual({ kind: 'badChecksum' })
  })
})

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
  resetGenericPassword: vi.fn(async (o?: { service: string }) => {
    if (o) items.delete(o.service)
    return true
  }),
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

beforeEach(() => {
  items.clear()
  vi.resetModules()
})

async function setup() {
  const { restoreWallet } = await import('../src/features/restore/model/restoreWallet')
  const kv = await import('../src/shared/storage/kv')
  await kv.openKv()
  return { restoreWallet, kv }
}

describe('restoreWallet', () => {
  it('stores the phrase and the first-account address; restored, backup not done (Q16)', async () => {
    const { restoreWallet, kv } = await setup()
    expect(await restoreWallet(`  ${VECTOR.toUpperCase()} `, PROMPT)).toEqual({ status: 'ok', address: VECTOR_ADDRESS })
    expect(kv.getAccountAddress()).toBe(VECTOR_ADDRESS)
    expect(kv.getRestored()).toBe(true)
    expect(kv.getBackupDone()).toBe(false)
    expect(items.get('app.vaultme.phrase')?.password).toBe(VECTOR) // normalized
  })
  it('passphrase: same keychain item, restart-safe account, address differs, never in result or kv', async () => {
    // Official BIP39 vector passphrase (trezor python-mnemonic vectors.json); address cross-checked in wallet-core tests.
    const { restoreWallet, kv } = await setup()
    const r = await restoreWallet(VECTOR, PROMPT, 'TREZOR')
    expect(r.status === 'ok' && r.address.toLowerCase()).toBe('0x9c32f71d4db8fb9e1a58b0a80df79935e7256fa6')
    expect(JSON.stringify(r)).not.toContain('TREZOR')
    expect(kv.getAccountAddress()).not.toBe(VECTOR_ADDRESS)
    vi.resetModules() // app restart: load again from the keychain
    const { loadPhrase } = await import('../src/shared/storage/keychain')
    const loaded = await loadPhrase(PROMPT)
    expect(loaded.status === 'ok' && loaded.mnemonic.reveal()).toBe(VECTOR) // words only
    expect(loaded.status === 'ok' && loaded.mnemonic.account().address.toLowerCase()).toBe(
      '0x9c32f71d4db8fb9e1a58b0a80df79935e7256fa6',
    )
  })
  it('no passphrase keeps the original storage format', async () => {
    const { restoreWallet } = await setup()
    await restoreWallet(VECTOR, PROMPT, '')
    expect(items.get('app.vaultme.phrase')?.password).toBe(VECTOR)
  })
  it('rejects bad input without touching storage', async () => {
    const { restoreWallet, kv } = await setup()
    expect(await restoreWallet(BAD_CHECKSUM, PROMPT)).toEqual({ status: 'invalid', issue: { kind: 'badChecksum' } })
    expect(await restoreWallet('abandon abcd', PROMPT)).toEqual({
      status: 'invalid',
      issue: { kind: 'unknownWord', word: 'abcd' },
    })
    expect(items.has('app.vaultme.phrase')).toBe(false)
    expect(kv.getAccountAddress()).toBeNull()
  })
  it('never overwrites an existing phrase', async () => {
    const { restoreWallet, kv } = await setup()
    items.set('app.vaultme.phrase', { username: 'vaultme', password: 'kept' })
    expect(await restoreWallet(VECTOR, PROMPT)).toEqual({ status: 'exists' })
    expect(items.get('app.vaultme.phrase')?.password).toBe('kept')
    expect(kv.getRestored()).toBe(false)
  })
  it('reports an error when the keychain refuses, and keeps nothing', async () => {
    const { restoreWallet, kv } = await setup()
    const Keychain = await import('react-native-keychain')
    vi.mocked(Keychain.setGenericPassword).mockRejectedValueOnce(new Error('cancelled'))
    expect(await restoreWallet(VECTOR, PROMPT)).toEqual({ status: 'error' })
    expect(kv.getAccountAddress()).toBeNull()
    expect(kv.getRestored()).toBe(false)
  })
  it('"다른 주소예요": removes the restored wallet (phrase, address, flags) so S05 can start again', async () => {
    const { restoreWallet, kv } = await setup()
    const { removeRestoredWallet } = await import('../src/features/restore/model/restoreWallet')
    await restoreWallet(VECTOR, PROMPT) // no passphrase: wrong address for the user
    expect(items.has('app.vaultme.phrase')).toBe(true)
    expect(await removeRestoredWallet()).toBe(true)
    expect(items.has('app.vaultme.phrase')).toBe(false)
    expect(kv.getAccountAddress()).toBeNull()
    expect(kv.getRestored()).toBe(false)
    expect(kv.getBackupDone()).toBe(false)
    const again = await restoreWallet(VECTOR, PROMPT, 'TREZOR') // words kept, passphrase now given
    expect(again.status === 'ok' && again.address.toLowerCase()).toBe('0x9c32f71d4db8fb9e1a58b0a80df79935e7256fa6')
  })
  it('removal reports false and keeps going on S06 when the keychain refuses', async () => {
    const { restoreWallet } = await setup()
    const { removeRestoredWallet } = await import('../src/features/restore/model/restoreWallet')
    await restoreWallet(VECTOR, PROMPT)
    const Keychain = await import('react-native-keychain')
    vi.mocked(Keychain.resetGenericPassword).mockResolvedValueOnce(false)
    expect(await removeRestoredWallet()).toBe(false)
  })
})
