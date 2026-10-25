import type { DeviceSigner } from '@vaultme/api-client'

// Browser device signer (ADR-0011): an ECDSA P-256 key made by WebCrypto with extractable = false, kept in IndexedDB
// (a CryptoKey is stored as is, so no script on the page can read the private key out). WebCrypto signs in the
// IEEE P1363 form, 64-byte r||s, which is what the server verifies. One record holds the key pair and the installId.

const DB = 'vaultme'
const STORE = 'install'
const KEY = 'device'
const ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' } as const

type Device = { pair: CryptoKeyPair | null; installId: string | null }

const b64u = (b: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error ?? new Error('IndexedDB request failed'))
  })
}

export function webSigner(idb: IDBFactory = indexedDB): DeviceSigner {
  let db: Promise<IDBDatabase> | null = null
  const open = () => {
    if (!db) {
      const r = idb.open(DB, 1)
      r.onupgradeneeded = () => r.result.createObjectStore(STORE)
      // A failed open is not kept: the next call (Retry) opens again.
      db = request(r).catch((e: unknown) => {
        db = null
        throw e
      })
    }
    return db
  }
  const store = async (mode: IDBTransactionMode) => (await open()).transaction(STORE, mode).objectStore(STORE)

  // No per-tab cache: another tab may have made the key since this tab last looked, and the install sequence
  // (exclusive, below) must see that. One IndexedDB read per signature is cheap next to the network call it signs.
  async function read(): Promise<Device> {
    return (
      ((await request((await store('readonly')).get(KEY))) as Device | undefined) ?? { pair: null, installId: null }
    )
  }
  async function write(d: Device) {
    await request((await store('readwrite')).put(d, KEY))
  }
  const exportPublic = async (pair: CryptoKeyPair) => b64u(await crypto.subtle.exportKey('raw', pair.publicKey))

  return {
    // Web Locks (all browsers since 2022): one tab at a time makes the key and registers it. Where the API is missing
    // (old browsers, an insecure context) the sequence runs unguarded, as before: two tabs opened together may then
    // each register a key and the later write wins; the other tab's install is left unused on the server.
    exclusive: (fn) =>
      typeof navigator !== 'undefined' && 'locks' in navigator ? navigator.locks.request('vaultme-install', fn) : fn(),
    async publicKey() {
      const { pair } = await read()
      return pair ? exportPublic(pair) : null
    },
    async createKey() {
      const pair = await crypto.subtle.generateKey(ALGORITHM, false, ['sign'])
      await write({ pair, installId: null }) // an installId belongs to the old key
      return exportPublic(pair)
    },
    async sign(text) {
      const { pair } = await read()
      if (!pair) throw new Error('device key: none stored')
      return b64u(
        await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, new TextEncoder().encode(text)),
      )
    },
    async getInstallId() {
      return (await read()).installId
    },
    async setInstallId(installId) {
      await write({ ...(await read()), installId })
    },
  }
}
