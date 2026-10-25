import { PublicKey, SIGNATURE_HEADER, Signature } from '@vaultme/contracts'
import { createApiClient } from '@vaultme/api-client'
import { describe, expect, it, vi } from 'vitest'
import { newPrivateKeyHex, nobleSigner, publicKeyB64u, signCanonical, type KeyStore } from '../src/shared/api/deviceKey'

// Test key only (not a wallet key, never leaves this file).
const TEST_KEY = '11'.repeat(32)
// Same vector as packages/contracts/test/contracts.test.ts: the string the server builds.
const VECTOR =
  'vaultme-v1\nPOST\n/v1/installs/token\n123e4567-e89b-42d3-a456-426614174000\n1760400000\nAAAAAAAAAAAAAAAAAAAAAA\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
const enc = new TextEncoder()
const b64uDecode = (s: string) =>
  Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0))
const verify = async (pub: string, sig: string, text: string) =>
  crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    await crypto.subtle.importKey('raw', b64uDecode(pub), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']),
    b64uDecode(sig),
    enc.encode(text),
  )

function memoryStore(key: string | null = null) {
  const s = {
    key,
    installId: null as string | null,
    loadKey: vi.fn(() => Promise.resolve(s.key)),
    saveKey: (hex: string) => {
      s.key = hex
      return Promise.resolve()
    },
    getInstallId: () => s.installId,
    setInstallId: (id: string | null) => void (s.installId = id),
  }
  return s satisfies KeyStore
}

describe('noble device key', () => {
  it('a noble r||s signature verifies with WebCrypto, and the key and signature have the contract shapes', async () => {
    const pub = publicKeyB64u(TEST_KEY)
    const sig = signCanonical(TEST_KEY, VECTOR)
    expect(PublicKey.safeParse(pub).success).toBe(true)
    expect(Signature.safeParse(sig).success).toBe(true)
    expect(await verify(pub, sig, VECTOR)).toBe(true)
    expect(await verify(pub, sig, VECTOR + 'x')).toBe(false)
  })
  it('random keys work too', async () => {
    const k = newPrivateKeyHex()
    expect(await verify(publicKeyB64u(k), signCanonical(k, VECTOR), VECTOR)).toBe(true)
  })
})

describe('nobleSigner (mobile adapter)', () => {
  it('no stored key: no public key, and sign fails', async () => {
    const s = nobleSigner(memoryStore())
    expect(await s.publicKey()).toBeNull()
    await expect(s.sign('x')).rejects.toThrow()
  })
  it('createKey stores the key as hex and signs with it', async () => {
    const store = memoryStore()
    const s = nobleSigner(store)
    const pub = await s.createKey()
    expect(pub).toBe(publicKeyB64u(store.key!))
    expect(await s.publicKey()).toBe(pub)
    expect(await verify(pub, await s.sign(VECTOR), VECTOR)).toBe(true)
  })
  it('reads a stored key once, then keeps it in memory', async () => {
    const store = memoryStore(TEST_KEY)
    const s = nobleSigner(store)
    expect(await s.publicKey()).toBe(publicKeyB64u(TEST_KEY))
    await s.sign('a')
    await s.sign('b')
    expect(store.loadKey).toHaveBeenCalledTimes(1)
  })
  it('installId goes to and from the store', async () => {
    const store = memoryStore()
    const s = nobleSigner(store)
    await s.setInstallId('i1')
    expect(store.installId).toBe('i1')
    expect(await s.getInstallId()).toBe('i1')
    await s.setInstallId(null)
    expect(await s.getInstallId()).toBeNull()
  })
  it('the client registers its public key and signs the token request with it', async () => {
    const store = memoryStore()
    const seen: { pub?: string; sig?: string } = {}
    const f = ((url: string, init: RequestInit) => {
      const path = new URL(url).pathname
      const reply = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))
      if (path === '/v1/installs') {
        seen.pub = (JSON.parse(init.body as string) as { publicKey: string }).publicKey
        return reply({ installId: '123e4567-e89b-42d3-a456-426614174000' })
      }
      if (path === '/v1/installs/token') {
        seen.sig = new Headers(init.headers).get(SIGNATURE_HEADER) ?? ''
        return reply({ token: 't', expiresAt: 1_760_400_900 })
      }
      return reply({ jsonrpc: '2.0', id: 1, result: '0x1' })
    }) as unknown as typeof fetch
    const c = createApiClient({
      baseUrl: 'http://x.test',
      appVersion: '1.0.0',
      signer: nobleSigner(store),
      fetch: f,
      now: () => 1_760_400_000_000,
      nonce: () => 'AAAAAAAAAAAAAAAAAAAAAA',
    })
    expect(await c.rpc('eth_chainId')).toBe('0x1')
    expect(seen.pub).toBe(publicKeyB64u(store.key!))
    expect(store.installId).toBe('123e4567-e89b-42d3-a456-426614174000')
    expect(await verify(seen.pub!, seen.sig!, VECTOR)).toBe(true) // the client signed exactly the contract vector
  })
})
