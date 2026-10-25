import { createApiClient } from '@vaultme/api-client'
import { PublicKey, Signature } from '@vaultme/contracts'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { webSigner } from '../app/shared/api/webSigner'

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

/** The stored record, read the way any script on the page could. */
const storedKeyPair = (idb: IDBFactory) =>
  new Promise<CryptoKeyPair>((resolve, reject) => {
    const open = idb.open('vaultme')
    open.onerror = () => reject(open.error ?? new Error('open failed'))
    open.onsuccess = () => {
      const get = open.result.transaction('install').objectStore('install').get('device')
      get.onsuccess = () => {
        open.result.close()
        resolve((get.result as { pair: CryptoKeyPair }).pair)
      }
    }
  })

describe('web device signer (WebCrypto key in IndexedDB)', () => {
  it('has no key and no installId at first', async () => {
    const s = webSigner(new IDBFactory())
    expect(await s.publicKey()).toBeNull()
    expect(await s.getInstallId()).toBeNull()
  })

  it('makes a P-256 key whose public key and signature have the wire shapes the server verifies', async () => {
    const s = webSigner(new IDBFactory())
    const pub = await s.createKey()
    expect(PublicKey.safeParse(pub).success).toBe(true) // raw 65-byte point, base64url
    expect(await s.publicKey()).toBe(pub)
    const sig = await s.sign('vaultme-v1\nPOST\n/v1/installs/token')
    expect(Signature.safeParse(sig).success).toBe(true) // 64-byte r||s, base64url
    expect(await verify(pub, sig, 'vaultme-v1\nPOST\n/v1/installs/token')).toBe(true)
    expect(await verify(pub, sig, 'other text')).toBe(false)
  })

  it('stores the private key non-extractable: a script on the page cannot read it out', async () => {
    const idb = new IDBFactory()
    await webSigner(idb).createKey()
    const { privateKey } = await storedKeyPair(idb)
    expect(privateKey.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('pkcs8', privateKey)).rejects.toThrow()
  })

  it('keeps the key and installId across a reload (a new signer on the same database)', async () => {
    const idb = new IDBFactory()
    const first = webSigner(idb)
    const pub = await first.createKey()
    await first.setInstallId('123e4567-e89b-42d3-a456-426614174000')
    const reloaded = webSigner(idb)
    expect(await reloaded.publicKey()).toBe(pub)
    expect(await reloaded.getInstallId()).toBe('123e4567-e89b-42d3-a456-426614174000')
    expect(await verify(pub, await reloaded.sign('x'), 'x')).toBe(true)
  })

  it('a new key replaces the old one and keeps no installId of the old key', async () => {
    const idb = new IDBFactory()
    const s = webSigner(idb)
    const old = await s.createKey()
    await s.setInstallId('123e4567-e89b-42d3-a456-426614174000')
    const pub = await s.createKey()
    expect(pub).not.toBe(old)
    const reloaded = webSigner(idb)
    expect(await reloaded.publicKey()).toBe(pub)
    await reloaded.setInstallId(null)
    expect(await webSigner(idb).getInstallId()).toBeNull()
  })

  it('a failed database open is tried again on the next call', async () => {
    const idb = new IDBFactory()
    // A newer schema version on disk makes our open fail (VersionError), until the database is gone.
    const newer = idb.open('vaultme', 2)
    await new Promise((resolve) => (newer.onsuccess = resolve))
    newer.result.close()
    const s = webSigner(idb)
    await expect(s.publicKey()).rejects.toThrow()
    await new Promise((resolve) => (idb.deleteDatabase('vaultme').onsuccess = resolve))
    expect(await s.publicKey()).toBeNull()
  })

  it('cannot sign without a key', async () => {
    await expect(webSigner(new IDBFactory()).sign('x')).rejects.toThrow('device key: none stored')
  })
})

// Two tabs of one browser share the IndexedDB record and the Web Lock. fake-indexeddb has no tabs, so two API clients
// (each with its own signer, as each tab has) stand in, and the lock is a queue like navigator.locks.request.
describe('two tabs opened together on a fresh browser', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function twoTabs(withLocks: boolean) {
    const registered: string[] = []
    if (withLocks) {
      let tail: Promise<unknown> = Promise.resolve()
      vi.stubGlobal('navigator', {
        locks: {
          request: <T>(_name: string, fn: () => Promise<T>) => {
            const run = tail.then(fn)
            tail = run.catch(() => undefined)
            return run
          },
        },
      })
    }
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
    const fetchStub = vi.fn((url: string, init: RequestInit) => {
      const path = new URL(url).pathname
      if (path === '/v1/installs') {
        registered.push((JSON.parse(init.body as string) as { publicKey: string }).publicKey)
        return Promise.resolve(json(201, { installId: crypto.randomUUID() }))
      }
      if (path === '/v1/installs/token') return Promise.resolve(json(200, { token: 't', expiresAt: 4_000_000_000 }))
      return Promise.resolve(json(200, { jsonrpc: '2.0', id: 1, result: '0x0' }))
    }) as unknown as typeof fetch
    const idb = new IDBFactory()
    const tab = () =>
      createApiClient({
        baseUrl: 'https://api.test',
        appVersion: '0.1.0',
        client: 'web',
        signer: webSigner(idb),
        fetch: fetchStub,
        now: () => 1_000_000_000_000,
      })
    return { registered, tabs: [tab(), tab()] as const }
  }

  it('make one key and register one install, not two', async () => {
    const { registered, tabs } = twoTabs(true)
    await Promise.all(tabs.map((t) => t.rpc('eth_blockNumber', [])))
    expect(registered).toHaveLength(1)
  })

  it('(control) without the lock both tabs register their own key', async () => {
    const { registered, tabs } = twoTabs(false)
    await Promise.all(tabs.map((t) => t.rpc('eth_blockNumber', [])))
    expect(registered).toHaveLength(2)
  })
})
