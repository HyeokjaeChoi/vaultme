import { QueryClient } from '@tanstack/react-query'
import { persistQueryClientRestore, persistQueryClientSave } from '@tanstack/react-query-persist-client'
import { describe, expect, it } from 'vitest'
import { balancesKey, fromRaw, toRaw } from '../src/shared/chain/balancesData'
import { persistOptions } from '../src/shared/query/persist'

const ADDR = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const mem = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init))
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  }
}
const client = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })

describe('balance cache entry', () => {
  it('round-trips bigint through decimal strings, also above 2^53', () => {
    const big = { ETH: 123456789012345678901234567890n, USDC: 5n }
    const raw = toRaw(big)
    expect(raw).toEqual({ ETH: '123456789012345678901234567890', USDC: '5' })
    expect(fromRaw(JSON.parse(JSON.stringify(raw)))).toEqual(big)
  })
  it('reads a damaged entry as "no number"', () => {
    expect(fromRaw({ ETH: '1', USDC: '-3' })).toBeNull()
    expect(fromRaw({ ETH: '1.5', USDC: '1' })).toBeNull()
    expect(fromRaw({ ETH: '1' })).toBeNull()
    expect(fromRaw(null)).toBeNull()
  })
})

describe('query cache persister (MMKV adapter shape)', () => {
  it('restores balances in a new client after a restart', async () => {
    const storage = mem()
    const opts = persistOptions(storage, 0)
    const a = client()
    a.setQueryData(balancesKey(ADDR), toRaw({ ETH: 10n ** 30n, USDC: 7n }))
    await persistQueryClientSave({ queryClient: a, ...opts })
    expect(storage.m.get('queryCache')).toContain('"10' + '0'.repeat(29) + '"')
    const b = client()
    await persistQueryClientRestore({ queryClient: b, ...opts })
    expect(fromRaw(b.getQueryData(balancesKey(ADDR)))).toEqual({ ETH: 10n ** 30n, USDC: 7n })
  })
  it('writes only whitelisted queries (a bigint or secret elsewhere never reaches storage)', async () => {
    const storage = mem()
    const opts = persistOptions(storage, 0)
    const a = client()
    a.setQueryData(['other', 1], { n: 1n })
    a.setQueryData(balancesKey(ADDR), toRaw({ ETH: 1n, USDC: 2n }))
    await persistQueryClientSave({ queryClient: a, ...opts })
    const saved = JSON.parse(storage.m.get('queryCache')!) as { clientState: { queries: { queryKey: unknown[] }[] } }
    expect(saved.clientState.queries.map((q) => q.queryKey[0])).toEqual(['balances'])
  })
  it('drops a cache with another buster, and survives a corrupt string', async () => {
    const storage = mem()
    const a = client()
    a.setQueryData(balancesKey(ADDR), toRaw({ ETH: 1n, USDC: 2n }))
    await persistQueryClientSave({ queryClient: a, ...persistOptions(storage, 0), buster: 'old' })
    const b = client()
    await persistQueryClientRestore({ queryClient: b, ...persistOptions(storage, 0) })
    expect(b.getQueryData(balancesKey(ADDR))).toBeUndefined()
    const bad = mem({ queryCache: '{not json' })
    const c = client()
    // The library removes the damaged cache, then rejects; PersistQueryClientProvider catches that and the app starts empty.
    await expect(persistQueryClientRestore({ queryClient: c, ...persistOptions(bad, 0) })).rejects.toThrow()
    expect(c.getQueryData(balancesKey(ADDR))).toBeUndefined()
    expect(bad.m.has('queryCache')).toBe(false)
  })
})
