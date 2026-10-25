import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HistoryCache } from '@vaultme/history'

// The mobile wiring of @vaultme/history: API client page fetch, the MMKV cache slot, the account address from kv.
const ME = '0x' + 'a'.repeat(40)
const H = '0x' + '1'.repeat(64)
const item = {
  id: `${H}:0`,
  kind: 'native',
  hash: H,
  blockNumber: 1,
  txIndex: 0,
  timestamp: 1,
  direction: 'in',
  asset: 'ETH',
  value: '1',
  from: '0x' + 'b'.repeat(40),
  to: ME,
  status: 'ok',
  zeroValue: false,
}
const m = vi.hoisted(() => ({
  api: null as { history: (a: string) => Promise<unknown> } | null,
  stored: null as HistoryCache | null,
  address: (): string => '',
}))
vi.mock('@/shared/api', () => ({
  get api() {
    return m.api
  },
  historyCache: { get: () => m.stored, set: (c: HistoryCache) => void (m.stored = c) },
}))
vi.mock('@/shared/storage', () => ({ getAccountAddress: () => m.address() }))

const loader = () => import('../src/features/history/model/loader')

beforeEach(() => {
  vi.resetModules()
  m.api = null
  m.stored = null
  m.address = () => ME
})

describe('history loader (mobile wiring)', () => {
  it('real mode: the list fetches through the API client and fills the cache that S41 reads', async () => {
    const history = vi.fn(() => Promise.resolve({ items: [item], nextCursor: null, incomplete: false }))
    m.api = { history }
    const l = await loader()
    expect(l.listAddress()).toBe(ME)
    const views: unknown[] = []
    await l.history.list((v) => views.push(v))(l.listAddress())
    expect(history).toHaveBeenCalledWith(ME)
    expect(views).toMatchObject([{ items: [{ id: `${H}:0` }], failed: false }])
    expect(l.findCachedRow(l.accountAddress(), `${H}:0`)).toMatchObject({ kind: 'receive' })
  })
  it('test-data mode (no API): the list has no address; an S41 lookup fails instead of fetching', async () => {
    const l = await loader()
    expect(l.listAddress()).toBeNull()
    expect(l.accountAddress()).toBe(ME)
    expect(await l.history.findRow(l.accountAddress(), H)).toEqual({ status: 'failed' })
  })
  it('kv unreadable: no address', async () => {
    m.address = () => {
      throw new Error('kv closed')
    }
    m.api = { history: () => Promise.resolve(null) }
    const l = await loader()
    expect(l.accountAddress()).toBeNull()
    expect(l.listAddress()).toBeNull()
  })
})
