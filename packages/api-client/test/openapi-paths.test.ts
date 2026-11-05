import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createApiClient, type DeviceSigner } from '../src/index.ts'

// ADR-0027: the client is hand-written, so this test is what stops path/method drift from `docs/openapi/v1.json`.
const spec = JSON.parse(readFileSync(new URL('../../../docs/openapi/v1.json', import.meta.url), 'utf8')) as {
  paths: Record<string, Record<string, unknown>>
}

const addr = `0x${'a'.repeat(40)}`
const hash = `0x${'b'.repeat(64)}`
const INSTALL_ID = '123e4567-e89b-42d3-a456-426614174000'

/** Per client method: how to call it and the one operation it must send. A new method without a row fails the test below. */
type Row = { call: (c: ReturnType<typeof createApiClient>) => Promise<unknown>; op: string }
const CALLS: Record<string, Row> = {
  rpc: { call: (c) => c.rpc('eth_blockNumber'), op: 'POST /v1/rpc' },
  history: { call: (c) => c.history(addr), op: 'POST /v1/history' },
  txInternal: { call: (c) => c.txInternal(hash), op: 'POST /v1/tx/internal' },
  putPushSubscription: {
    call: (c) => c.putPushSubscription(addr, 'ExponentPushToken[abcdefgh12345678]'),
    op: 'PUT /v1/push/subscription',
  },
  deletePushSubscription: { call: (c) => c.deletePushSubscription(), op: 'DELETE /v1/push/subscription' },
}
// Sent by the first call (identify, then token), whatever the method.
const AUTH_OPS = ['POST /v1/installs', 'POST /v1/installs/token']

/** `/v1/tx/{hash}` in the spec matches any one segment of a client path. */
const matches = (template: string, path: string) =>
  new RegExp(`^${template.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[^}]+\}/g, '[^/]+')}$`).test(path)

describe('api-client vs docs/openapi/v1.json', () => {
  const inSpec = (op: string) => {
    const [method = '', path = ''] = op.split(' ')
    return Object.entries(spec.paths).some(([t, ops]) => matches(t, path) && method.toLowerCase() in ops)
  }

  it('each client method sends its expected operation, and that operation is in the spec', async () => {
    let sent: string[] = []
    const fetchStub = ((url: string, init: RequestInit) => {
      const path = new URL(url).pathname
      sent.push(`${String(init.method)} ${path}`)
      const body =
        path === '/v1/installs'
          ? { installId: INSTALL_ID }
          : path === '/v1/installs/token'
            ? { token: 't', expiresAt: 4_000_000_000 }
            : path === '/v1/rpc'
              ? { jsonrpc: '2.0', id: 1, result: '0x1' }
              : { ok: true }
      return Promise.resolve(new Response(JSON.stringify(body)))
    }) as unknown as typeof fetch

    let id: string | null = null
    const signer: DeviceSigner = {
      publicKey: () => Promise.resolve('k'),
      createKey: () => Promise.resolve('k'),
      sign: () => Promise.resolve('s'),
      getInstallId: () => Promise.resolve(id),
      setInstallId: (v) => {
        id = v
        return Promise.resolve()
      },
    }
    const client = createApiClient({ baseUrl: 'https://api.test', appVersion: '1.0.0', signer, fetch: fetchStub })

    expect(Object.keys(CALLS).sort()).toEqual(Object.keys(client).sort())
    for (const [name, { call, op }] of Object.entries(CALLS)) {
      sent = []
      await call(client)
      // The install and the token are made once, by the first method called.
      expect(
        sent.filter((o) => !AUTH_OPS.includes(o)),
        name,
      ).toEqual([op])
      expect(inSpec(op), `${op} is not in docs/openapi/v1.json`).toBe(true)
    }
    for (const op of AUTH_OPS) expect(inSpec(op), `${op} is not in docs/openapi/v1.json`).toBe(true)
  })
})
