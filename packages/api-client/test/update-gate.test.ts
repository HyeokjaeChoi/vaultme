import { describe, expect, it, vi } from 'vitest'
import { createApiClient, createUpdateGate } from '../src/index.ts'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function client(reply: Response, onUpdateRequired?: () => void) {
  return createApiClient({
    baseUrl: 'http://x',
    appVersion: '0.0.0',
    // The answer comes before any signature is checked, so this signer never needs a real key.
    signer: {
      publicKey: () => Promise.resolve('pub'),
      createKey: () => Promise.resolve('pub'),
      sign: () => Promise.resolve('sig'),
      getInstallId: () => Promise.resolve('id'),
      setInstallId: () => Promise.resolve(),
    },
    fetch: () => Promise.resolve(reply.clone()),
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
    await expect(
      client(json(503, { code: 'unavailable', message: 'm', retryable: true }), cb).rpc('x'),
    ).rejects.toMatchObject({ code: 'unavailable' })
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
  it('an unsubscribed listener is not called', () => {
    const g = createUpdateGate()
    const l = vi.fn()
    g.subscribe(l)()
    g.mark()
    expect(l).not.toHaveBeenCalled()
  })
})
