import { describe, expect, it } from 'vitest'
import { ApiError } from '../src/shared/api/errors'
import { createHistory } from '../src/shared/api/history'
import type { HistoryCache, PendingTx } from '../src/shared/storage/kv'

const A = '0x' + 'a'.repeat(40)
const tx: PendingTx = {
  hash: '0x1',
  nonce: 0,
  asset: 'ETH',
  to: A,
  amount: '1',
  createdAt: 1,
  lastCheckedAt: 1,
  state: 'Pending',
}
const err = (code: ConstructorParameters<typeof ApiError>[0], status = 500) => new ApiError(code, status, false, code)

function setup(fetchPage: (a: string, c?: string) => Promise<unknown>) {
  let cache: HistoryCache | null = null
  const h = createHistory({
    fetchPage,
    cache: { get: () => cache, set: (c) => void (cache = c) },
    local: () => [tx],
    now: () => 42,
  })
  return { h, cache: () => cache }
}

describe('history adapter', () => {
  it('stores the first page with its update time', async () => {
    const s = setup(() => Promise.resolve({ items: [1] }))
    expect(await s.h.load(A)).toEqual({ source: 'api', data: { items: [1] }, updatedAt: 42 })
    expect(s.cache()).toEqual({ address: A, json: '{"items":[1]}', updatedAt: 42 })
  })
  it('does not cache later pages', async () => {
    const s = setup(() => Promise.resolve({ items: [2] }))
    await s.h.load(A, 'next')
    expect(s.cache()).toBeNull()
  })
  it('404 falls back to the locally recorded sends', async () => {
    const s = setup(() => Promise.reject(err('not_found', 404)))
    expect(await s.h.load(A)).toEqual({ source: 'local', sent: [tx] })
  })
  it('other failures show the cache with the error and its time', async () => {
    let fail = false
    const s = setup(() => {
      if (fail) return Promise.reject(err('unavailable', 503))
      return Promise.resolve({ items: [1] })
    })
    await s.h.load(A)
    fail = true
    const r = await s.h.load(A)
    expect(r).toMatchObject({ source: 'cache', data: { items: [1] }, updatedAt: 42 })
  })
  it('a cache of another address is not shown', async () => {
    let fail = false
    const s = setup(() => {
      if (fail) return Promise.reject(err('network'))
      return Promise.resolve({})
    })
    await s.h.load('0x' + 'b'.repeat(40))
    fail = true
    await expect(s.h.load(A)).rejects.toMatchObject({ code: 'network' })
  })
  it('update_required always throws', async () => {
    const s = setup(() => Promise.reject(err('update_required', 426)))
    await expect(s.h.load(A)).rejects.toMatchObject({ code: 'update_required' })
  })
})
