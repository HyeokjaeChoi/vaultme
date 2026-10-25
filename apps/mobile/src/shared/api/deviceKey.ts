import { p256 } from '@noble/curves/nist.js'
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js'
import type { DeviceSigner } from '@vaultme/api-client'

// Mobile device signer (ARCHITECTURE.md#install-auth): ECDSA P-256 with noble, separate from the wallet key. Signature = compact r||s over SHA-256(canonical string).

const b64u = (b: Uint8Array): string =>
  btoa(String.fromCharCode(...b))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')

/** New private key (32 bytes, hex) from the OS CSPRNG (polyfilled `crypto.getRandomValues`). */
export const newPrivateKeyHex = (): string => bytesToHex(p256.utils.randomSecretKey())

/** Uncompressed point (65 bytes), base64url: the `publicKey` of POST /v1/installs. */
export const publicKeyB64u = (privateKeyHex: string): string =>
  b64u(p256.getPublicKey(hexToBytes(privateKeyHex), false))

/** 64-byte r||s, base64url. WebCrypto on the server verifies exactly this form. noble v2 `sign` hashes the message with SHA-256 itself (`prehash` default) and returns compact bytes. */
export const signCanonical = (privateKeyHex: string, canonical: string): string =>
  b64u(p256.sign(utf8ToBytes(canonical), hexToBytes(privateKeyHex)))

/** Where the key (hex) and installId live. Mobile: Keychain no-auth tier and kv. */
export type KeyStore = {
  loadKey(): Promise<string | null>
  saveKey(hex: string): Promise<void>
  getInstallId(): string | null
  setInstallId(id: string | null): void
}

/** The private key is read from the store once and then kept in memory, so a token request does not read Keychain again. */
export function nobleSigner(store: KeyStore): DeviceSigner {
  let hex: string | null = null
  const key = async () => (hex ??= await store.loadKey())
  return {
    publicKey: async () => {
      const k = await key()
      return k ? publicKeyB64u(k) : null // '' counts as no key, as before
    },
    createKey: async () => {
      const k = newPrivateKeyHex()
      await store.saveKey(k)
      hex = k
      return publicKeyB64u(k)
    },
    sign: async (text) => {
      const k = await key()
      if (!k) throw new Error('device key: none stored')
      return signCanonical(k, text)
    },
    getInstallId: () => Promise.resolve(store.getInstallId()),
    setInstallId: (id) => {
      store.setInstallId(id)
      return Promise.resolve()
    },
  }
}
