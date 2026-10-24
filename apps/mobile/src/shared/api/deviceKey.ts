import { p256 } from '@noble/curves/nist.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js'

// Device key (ARCHITECTURE.md#install-auth): ECDSA P-256, separate from the wallet key. Signature = compact r||s over SHA-256(canonical string).

export const b64u = (b: Uint8Array): string =>
  btoa(String.fromCharCode(...b))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')

export const sha256Hex = (s: string): string => bytesToHex(sha256(utf8ToBytes(s)))

/** New private key (32 bytes, hex) from the OS CSPRNG (polyfilled `crypto.getRandomValues`). */
export const newPrivateKeyHex = (): string => bytesToHex(p256.utils.randomSecretKey())

/** Uncompressed point (65 bytes), base64url: the `publicKey` of POST /v1/installs. */
export const publicKeyB64u = (privateKeyHex: string): string =>
  b64u(p256.getPublicKey(hexToBytes(privateKeyHex), false))

/** 64-byte r||s, base64url. WebCrypto on the server verifies exactly this form. noble v2 `sign` hashes the message with SHA-256 itself (`prehash` default) and returns compact bytes. */
export const signCanonical = (privateKeyHex: string, canonical: string): string =>
  b64u(p256.sign(utf8ToBytes(canonical), hexToBytes(privateKeyHex)))

export const randomNonce = (): string => b64u(crypto.getRandomValues(new Uint8Array(16)))
