import { beforeAll, describe, expect, it, vi } from 'vitest'

// GAP-1 (docs/plans/quality-gates.md): a 426 from a real call through the app's api client raises the S91 gate.
// The client and the gate have their own tests in packages/api-client; this test covers the wiring in shared/api/index.ts.
const TEST_KEY = '22'.repeat(32) // test device key only, not a wallet key

vi.hoisted(() => {
  process.env.EXPO_PUBLIC_API_URL = 'http://api.test'
})
vi.mock('expo-constants', () => ({ default: { expoConfig: { version: '1.2.3' } } }))
vi.mock('../src/shared/storage/keychain', () => ({
  loadDeviceKey: () => Promise.resolve(TEST_KEY),
  saveDeviceKey: () => Promise.resolve(),
}))
vi.mock('../src/shared/storage/kv', () => ({
  getInstallId: () => 'install-1',
  setInstallId: () => undefined,
  getHistoryCache: () => null,
  setHistoryCache: () => undefined,
}))
// useUpdateRequired is a hook; read the store directly instead of rendering.
vi.mock('react', () => ({ useSyncExternalStore: (_sub: unknown, get: () => boolean) => get() }))

let mod: typeof import('../src/shared/api')
beforeAll(async () => {
  mod = await import('../src/shared/api')
})

describe('S91 update gate wiring', () => {
  it('a 426 answer from the app api client opens the gate', async () => {
    expect(mod.useUpdateRequired()).toBe(false)
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ code: 'update_required', message: 'm', retryable: false }), {
          status: 426,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    await expect(mod.api!.rpc('eth_chainId')).rejects.toMatchObject({ code: 'update_required' })
    expect(fetchMock).toHaveBeenCalled()
    expect(mod.useUpdateRequired()).toBe(true)
  })
})
