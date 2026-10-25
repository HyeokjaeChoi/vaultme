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
      db = request(r)
    }
    return db
  }
  const store = async (mode: IDBTransactionMode) => (await open()).transaction(STORE, mode).objectStore(STORE)

  let cached: Device | null = null
  async function read(): Promise<Device> {
    cached ??= ((await request((await store('readonly')).get(KEY))) as Device | undefined) ?? {
      pair: null,
      installId: null,
    }
    return cached
  }
  async function write(d: Device) {
    await request((await store('readwrite')).put(d, KEY))
    cached = d
  }
  const exportPublic = async (pair: CryptoKeyPair) => b64u(await crypto.subtle.exportKey('raw', pair.publicKey))

  return {
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
