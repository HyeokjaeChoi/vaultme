import { beforeEach, describe, expect, it, vi } from 'vitest'

const keychain = new Map<string, { username: string; password: string }>()
vi.mock('react-native-keychain', () => ({
  ACCESS_CONTROL: { BIOMETRY_ANY_OR_DEVICE_PASSCODE: 'x' },
  ACCESSIBLE: { WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'x', AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'y' },
  setGenericPassword: vi.fn((u: string, p: string, o: { service: string }) => {
    keychain.set(o.service, { username: u, password: p })
    return Promise.resolve({ service: o.service, storage: 'x' })
  }),
  getGenericPassword: vi.fn((o: { service: string }) => Promise.resolve(keychain.get(o.service) ?? false)),
}))
vi.mock('expo-crypto', () => ({ getRandomBytes: (n: number) => Uint8Array.from({ length: n }, (_, i) => i + 1) }))

// The MMKV map outlives resetModules: it stands for the disk of an install that already ran an older build.
type V = string | number | boolean
const disk = new Map<string, V>()
let failWrites = false
vi.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    set: (k: string, v: V) => {
      if (failWrites) throw new Error('mmkv write')
      disk.set(k, v)
    },
    getString: (k: string) => (typeof disk.get(k) === 'string' ? (disk.get(k) as string) : undefined),
    getNumber: (k: string) => (typeof disk.get(k) === 'number' ? (disk.get(k) as number) : undefined),
    getBoolean: (k: string) => (typeof disk.get(k) === 'boolean' ? (disk.get(k) as boolean) : undefined),
    remove: (k: string) => disk.delete(k),
  }),
}))

const ADDRESS = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const T0 = 1_000_000

async function boot(phraseStored = false) {
  const kv = await import('../src/shared/storage/kv')
  await kv.openKv()
  const s = await import('../src/shared/app-store')
  s.initAppStore({ phraseStored })
  return { kv, ...s }
}
const bg = (now: number, o = {}) => ({
  type: 'appState' as const,
  next: 'background' as const,
  now,
  wallet: true,
  authInProgress: false,
  graceSeconds: 30,
  ...o,
})
const active = (now: number) => ({ ...bg(now), next: 'active' as const })
const inactive = (now: number) => ({ ...bg(now), next: 'inactive' as const })

beforeEach(() => {
  disk.clear()
  keychain.clear()
  failWrites = false
  vi.resetModules()
})

describe('app store: hydration from an existing install', () => {
  it('reads every flag from the keys and formats older builds wrote, synchronously', async () => {
    disk.set('backupDone', true)
    disk.set('backup.depositPromptShown', true)
    disk.set('wallet.restored', true)
    disk.set('settings.push', true)
    disk.set('push.optinShown', true)
    disk.set('settings.zero', true)
    disk.set('lock.graceSeconds', 60)
    const { appStore } = await boot()
    expect(appStore().getState()).toMatchObject({
      backupDone: true,
      depositPromptShown: true,
      restored: true,
      pushSetting: true,
      pushOptinShown: true,
      zeroSetting: true,
      graceSeconds: 60,
    })
  })

  it('uses the defaults on a fresh install (nothing is opted in, backup not done, 30 s)', async () => {
    const { appStore } = await boot()
    expect(appStore().getState()).toMatchObject({
      backupDone: false,
      depositPromptShown: false,
      restored: false,
      pushSetting: false,
      pushOptinShown: false,
      zeroSetting: false,
      graceSeconds: 30,
    })
  })

  it('writes through to the same keys and keeps the stored values readable by the kv helpers', async () => {
    const { appStore, kv } = await boot()
    const st = appStore().getState()
    st.setBackupDone(true)
    st.setDepositPromptShown(true)
    st.setRestored(true)
    st.setPushSetting(true)
    st.setPushOptinShown(true)
    st.setZeroSetting(true)
    expect([...disk.entries()]).toEqual(
      expect.arrayContaining([
        ['backupDone', true],
        ['backup.depositPromptShown', true],
        ['wallet.restored', true],
        ['settings.push', true],
        ['push.optinShown', true],
        ['settings.zero', true],
      ]),
    )
    expect(kv.getBackupDone()).toBe(true)
    expect(appStore().getState().pushSetting).toBe(true)
  })

  it('a failed write leaves the state as it was (the screen never shows an unsaved value)', async () => {
    const { appStore } = await boot()
    failWrites = true
    expect(() => appStore().getState().setPushSetting(true)).toThrow('mmkv write')
    expect(appStore().getState().pushSetting).toBe(false)
  })

  it('does not hold the phrase or any secret', async () => {
    const { appStore } = await boot()
    expect(Object.keys(appStore().getState()).sort()).toEqual(
      [
        'backupDone',
        'depositPromptShown',
        'dispatchLock',
        'graceSeconds',
        'lock',
        'pushOptinShown',
        'pushSetting',
        'restored',
        'setBackupDone',
        'setDepositPromptShown',
        'setPushOptinShown',
        'setPushSetting',
        'setRestored',
        'setZeroSetting',
        'zeroSetting',
      ].sort(),
    )
  })

  it('throws when read before the init (the kv must be open and the lock decided first)', async () => {
    const s = await import('../src/shared/app-store')
    expect(() => s.appStore()).toThrow()
  })
})

describe('app store: lock', () => {
  it('cold start is locked with a wallet, even when the last run saved "unlocked"', async () => {
    disk.set('account.address', ADDRESS)
    disk.set('lock.locked', false)
    const { appStore } = await boot()
    expect(appStore().getState().lock).toEqual({ locked: true, backgroundedAt: null })
  })

  it('cold start is locked when only the phrase exists (interrupted creation)', async () => {
    const { appStore } = await boot(true)
    expect(appStore().getState().lock.locked).toBe(true)
  })

  it('no wallet and no phrase: nothing to lock', async () => {
    const { appStore } = await boot()
    expect(appStore().getState().lock.locked).toBe(false)
  })

  it('unlock opens, 29 s in the background stays open, 30 s locks', async () => {
    disk.set('account.address', ADDRESS)
    const { appStore } = await boot()
    const { dispatchLock } = appStore().getState()
    dispatchLock({ type: 'unlock' })
    expect(appStore().getState().lock.locked).toBe(false)
    dispatchLock(bg(T0))
    dispatchLock(active(T0 + 29_000))
    expect(appStore().getState().lock.locked).toBe(false)
    dispatchLock(bg(T0))
    dispatchLock(active(T0 + 30_000))
    expect(appStore().getState().lock.locked).toBe(true)
  })

  it('inactive never starts the timer', async () => {
    disk.set('account.address', ADDRESS)
    const { appStore } = await boot()
    const { dispatchLock } = appStore().getState()
    dispatchLock({ type: 'unlock' })
    dispatchLock(inactive(T0))
    dispatchLock(active(T0 + 90_000))
    expect(appStore().getState().lock).toEqual({ locked: false, backgroundedAt: null })
  })

  it('a clock set back counts as locked', async () => {
    disk.set('account.address', ADDRESS)
    const { appStore } = await boot()
    const { dispatchLock } = appStore().getState()
    dispatchLock({ type: 'unlock' })
    dispatchLock(bg(T0))
    dispatchLock(active(T0 - 5_000))
    expect(appStore().getState().lock.locked).toBe(true)
  })

  it('the store lock uses the stored grace period', async () => {
    disk.set('account.address', ADDRESS)
    disk.set('lock.graceSeconds', 5)
    const { appStore } = await boot()
    const { dispatchLock, graceSeconds } = appStore().getState()
    dispatchLock({ type: 'unlock' })
    dispatchLock(bg(T0, { graceSeconds }))
    dispatchLock({ ...active(T0 + 5_000), graceSeconds })
    expect(appStore().getState().lock.locked).toBe(true)
  })

  it('persists each lock change in the old keys, and still locks when the write fails', async () => {
    disk.set('account.address', ADDRESS)
    const { appStore } = await boot()
    const { dispatchLock } = appStore().getState()
    dispatchLock({ type: 'unlock' })
    expect(disk.get('lock.locked')).toBe(false)
    dispatchLock(bg(T0))
    expect(disk.get('lock.backgroundedAt')).toBe(T0)
    failWrites = true
    dispatchLock(active(T0 + 60_000))
    expect(appStore().getState().lock.locked).toBe(true)
  })

  it('a flag change does not touch the lock state', async () => {
    disk.set('account.address', ADDRESS)
    const { appStore } = await boot()
    const before = appStore().getState().lock
    appStore().getState().setBackupDone(true)
    expect(appStore().getState().lock).toBe(before)
  })
})
