import { describe, expect, it, vi } from 'vitest'
import {
  disablePush,
  enablePush,
  routeForPush,
  syncPush,
  type Permission,
  type PushDeps,
} from '@/features/push/model/push'

const ADDRESS = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const HASH = `0x${'ab'.repeat(32)}`

function make(over: Partial<PushDeps> & { permission?: Permission; requested?: Permission } = {}) {
  const state = { setting: false, pending: false }
  const server = {
    putPushSubscription: vi.fn(() => Promise.resolve()),
    deletePushSubscription: vi.fn(() => Promise.resolve()),
  }
  const port = {
    permission: vi.fn(() => Promise.resolve<Permission>(over.permission ?? 'granted')),
    request: vi.fn(() => Promise.resolve<Permission>(over.requested ?? 'granted')),
    token: vi.fn(() => Promise.resolve('ExponentPushToken[abcdefgh12345678]')),
  }
  const deps: PushDeps = {
    server,
    port,
    projectId: 'proj',
    address: () => ADDRESS,
    getSetting: () => state.setting,
    setSetting: (v) => void (state.setting = v),
    getUnregisterPending: () => state.pending,
    setUnregisterPending: (v) => void (state.pending = v),
    ...over,
  }
  return { deps, state, server, port }
}

describe('enablePush', () => {
  it('registers address and token, then turns the setting on', async () => {
    const t = make()
    expect(await enablePush(t.deps)).toBe('on')
    expect(t.server.putPushSubscription).toHaveBeenCalledWith(ADDRESS, 'ExponentPushToken[abcdefgh12345678]')
    expect(t.state.setting).toBe(true)
  })
  it('asks the OS when the permission is undetermined, and stops on a refusal', async () => {
    const t = make({ permission: 'undetermined', requested: 'denied' })
    expect(await enablePush(t.deps)).toBe('denied')
    expect(t.port.request).toHaveBeenCalled()
    expect(t.server.putPushSubscription).not.toHaveBeenCalled()
    expect(t.state.setting).toBe(false)
  })
  it('does not ask again when the OS already refused', async () => {
    const t = make({ permission: 'denied' })
    expect(await enablePush(t.deps)).toBe('denied')
    expect(t.port.request).not.toHaveBeenCalled()
  })
  it('keeps the setting off when the server call fails', async () => {
    const t = make()
    t.server.putPushSubscription.mockRejectedValue(new Error('503'))
    expect(await enablePush(t.deps)).toBe('error')
    expect(t.state.setting).toBe(false)
    expect(t.state.pending).toBe(true) // the PUT may have landed with its answer lost: the next launch deletes it
  })
  it('is unavailable without a wallet or without an EAS project id', async () => {
    expect(await enablePush(make({ address: () => null }).deps)).toBe('unavailable')
    const t = make({ projectId: null })
    expect(await enablePush(t.deps)).toBe('unavailable')
    expect(t.state.setting).toBe(false)
  })
  it('never rejects when the wallet address cannot be read (callers reset their busy state)', async () => {
    const t = make({
      address: () => {
        throw new Error('kv closed')
      },
    })
    expect(await enablePush(t.deps)).toBe('error')
  })
  it('test-data mode (no server): on locally, nothing registered', async () => {
    const t = make({ server: null, projectId: null })
    expect(await enablePush(t.deps)).toBe('on')
    expect(t.state.setting).toBe(true)
    expect(t.port.token).not.toHaveBeenCalled()
  })
})

describe('disablePush', () => {
  it('turns the setting off and deletes on the server', async () => {
    const t = make()
    t.state.setting = true
    await disablePush(t.deps)
    expect(t.state.setting).toBe(false)
    expect(t.server.deletePushSubscription).toHaveBeenCalled()
    expect(t.state.pending).toBe(false)
  })
  it('remembers a failed delete', async () => {
    const t = make()
    t.server.deletePushSubscription.mockRejectedValue(new Error('offline'))
    await disablePush(t.deps)
    expect(t.state.setting).toBe(false)
    expect(t.state.pending).toBe(true)
  })
})

describe('syncPush', () => {
  it('retries a pending delete and nothing else', async () => {
    const t = make()
    t.state.pending = true
    t.state.setting = true
    await syncPush(t.deps)
    expect(t.server.deletePushSubscription).toHaveBeenCalled()
    expect(t.server.putPushSubscription).not.toHaveBeenCalled()
    expect(t.state.pending).toBe(false)
  })
  it('keeps the pending flag while the delete still fails', async () => {
    const t = make()
    t.state.pending = true
    t.server.deletePushSubscription.mockRejectedValue(new Error('offline'))
    await syncPush(t.deps)
    expect(t.state.pending).toBe(true)
  })
  it('re-sends address and token when the setting is on', async () => {
    const t = make()
    t.state.setting = true
    await syncPush(t.deps)
    expect(t.server.putPushSubscription).toHaveBeenCalledTimes(1)
  })
  it('does nothing when the setting is off', async () => {
    const t = make()
    await syncPush(t.deps)
    expect(t.server.putPushSubscription).not.toHaveBeenCalled()
    expect(t.server.deletePushSubscription).not.toHaveBeenCalled()
  })
  it('switches off and deletes when the OS permission is gone', async () => {
    const t = make({ permission: 'denied' })
    t.state.setting = true
    await syncPush(t.deps)
    expect(t.state.setting).toBe(false)
    expect(t.server.deletePushSubscription).toHaveBeenCalled()
  })
  it('swallows a server failure', async () => {
    const t = make()
    t.state.setting = true
    t.server.putPushSubscription.mockRejectedValue(new Error('offline'))
    await expect(syncPush(t.deps)).resolves.toBeUndefined()
  })
})

describe('ordering', () => {
  it('a launch sync still waiting for its token cannot re-register after the user switched off', async () => {
    const t = make()
    t.state.setting = true
    let release!: (v: string) => void
    t.port.token.mockImplementationOnce(() => new Promise<string>((r) => (release = r)))
    const sync = syncPush(t.deps)
    const off = disablePush(t.deps)
    await vi.waitFor(() => expect(t.port.token).toHaveBeenCalled())
    release('ExponentPushToken[abcdefgh12345678]')
    await Promise.all([sync, off])
    const put = t.server.putPushSubscription.mock.invocationCallOrder[0]!
    const del = t.server.deletePushSubscription.mock.invocationCallOrder[0]!
    expect(put).toBeLessThan(del)
    expect(t.state).toEqual({ setting: false, pending: false })
  })
  it('records the owed delete before sending it', async () => {
    const t = make()
    t.server.deletePushSubscription.mockImplementationOnce(() => {
      expect(t.state.pending).toBe(true)
      return Promise.resolve()
    })
    await disablePush(t.deps)
    expect(t.state.pending).toBe(false)
  })
})

describe('routeForPush', () => {
  it('routes a valid payload to the transaction detail', () => {
    expect(routeForPush({ kind: 'deposit', hash: HASH })).toBe(`/activity/${HASH}`)
    expect(routeForPush({ kind: 'send', hash: HASH })).toBe(`/activity/${HASH}`)
  })
  it('ignores anything else', () => {
    expect(routeForPush(undefined)).toBeNull()
    expect(routeForPush({ kind: 'other', hash: HASH })).toBeNull()
    expect(routeForPush({ kind: 'deposit', hash: '../../settings' })).toBeNull()
  })
})
