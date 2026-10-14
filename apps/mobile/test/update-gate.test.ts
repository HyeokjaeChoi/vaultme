import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../src/shared/api/client'
import { createUpdateGate } from '../src/shared/api/updateGate'

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function client(reply: Response, onUpdateRequired?: () => void) {
  let key: string | null = '11'.repeat(32)
  let id: string | null = null
  return createApiClient({
    baseUrl: 'http://x',
    appVersion: '0.0.0',
    store: { loadKey: async () => key, saveKey: async (k) => void (key = k), getInstallId: () => id, setInstallId: (v) => void (id = v) },
    fetch: (async () => reply.clone()) as unknown as typeof fetch,
    ...(onUpdateRequired ? { onUpdateRequired } : {}),
  })
}

describe('426 gate (S91)', () => {
  it('the client calls onUpdateRequired on a 426, with or without an envelope, and still throws', async () => {
    for (const body of [{ code: 'update_required', message: 'm', retryable: false }, 'plain']) {
      const cb = vi.fn()
      await expect(client(json(426, body), cb).rpc('eth_chainId')).rejects.toMatchObject({ code: 'update_required' })
      expect(cb).toHaveBeenCalled()
    }
  })
  it('other errors do not raise the gate', async () => {
    const cb = vi.fn()
    await expect(client(json(503, { code: 'unavailable', message: 'm', retryable: true }), cb).rpc('x')).rejects.toMatchObject({ code: 'unavailable' })
    expect(cb).not.toHaveBeenCalled()
  })
  it('the gate notifies once and stays set', () => {
    const g = createUpdateGate()
    const l = vi.fn()
    g.subscribe(l)
    expect(g.get()).toBe(false)
    g.mark()
    g.mark()
    expect(g.get()).toBe(true)
    expect(l).toHaveBeenCalledTimes(1)
  })
})
