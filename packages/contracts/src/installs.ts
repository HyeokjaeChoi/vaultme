import { z } from 'zod'

// Install auth (LLD §4). The app signs requests with a device key (ECDSA P-256, separate from the wallet key).
export const INSTALL_ID_HEADER = 'X-Install-Id'
export const TIMESTAMP_HEADER = 'X-Timestamp' // unix seconds
export const NONCE_HEADER = 'X-Nonce' // 16 random bytes, base64url
export const SIGNATURE_HEADER = 'X-Signature' // base64url of r||s (64 bytes) over the canonical string

export const CLOCK_SKEW_SECONDS = 300
export const TOKEN_TTL_SECONDS = 900

const B64URL = /^[A-Za-z0-9_-]+$/
export const InstallId = z.uuid()
export const Nonce = z.string().min(22).max(64).regex(B64URL)
export const Signature = z.string().length(86).regex(B64URL)
// Uncompressed P-256 point (0x04 || X || Y), 65 bytes, base64url without padding.
export const PublicKey = z.string().length(87).regex(B64URL)

export const RegisterRequest = z.object({ publicKey: PublicKey }).meta({ id: 'RegisterRequest' })
export const RegisterResponse = z.object({ installId: InstallId }).meta({ id: 'RegisterResponse' })
export const TokenResponse = z
  .object({ token: z.string(), expiresAt: z.number().int() }) // expiresAt: unix seconds
  .meta({ id: 'TokenResponse' })
export const InstallMeResponse = z.object({ installId: InstallId }).meta({ id: 'InstallMeResponse' })

export type CanonicalInput = {
  method: string
  path: string // URL path without query
  installId: string
  ts: number | string
  nonce: string
  bodySha256Hex: string // lowercase hex SHA-256 of the raw body; sha256("") when empty
}

/** The exact string both sides sign and verify. */
export const canonicalString = (i: CanonicalInput): string =>
  ['vaultme-v1', i.method.toUpperCase(), i.path, i.installId, String(i.ts), i.nonce, i.bodySha256Hex].join('\n')
