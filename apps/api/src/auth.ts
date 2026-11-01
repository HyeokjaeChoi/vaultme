import {
  CLOCK_SKEW_SECONDS,
  INSTALL_ID_HEADER,
  InstallId,
  NONCE_HEADER,
  Nonce,
  SIGNATURE_HEADER,
  Signature,
  TIMESTAMP_HEADER,
  TOKEN_TTL_SECONDS,
  canonicalString,
} from '@vaultme/contracts'
import { and, eq, lt } from 'drizzle-orm'
import type { Context, Input, MiddlewareHandler } from 'hono'
import { getDb } from './db/index.ts'
import { installs, nonces } from './db/schema.ts'
import type { Env } from './env.ts'
import { fail } from './errors.ts'

const enc = new TextEncoder()
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' } as const
export const nowSeconds = () => Math.floor(Date.now() / 1000)

export const b64uEncode = (b: Uint8Array): string =>
  btoa(String.fromCharCode(...b))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
export const b64uDecode = (s: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(s.replaceAll('-', '+').replaceAll('_', '/')), (ch) => ch.charCodeAt(0))

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')

export const importPublicKey = (b64u: string) => {
  const raw = b64uDecode(b64u)
  if (raw.length !== 65 || raw[0] !== 4) throw new Error('bad public key')
  return crypto.subtle.importKey('raw', raw, ECDSA, false, ['verify'])
}

// Cloudflare limiters count per location and do not report a reset time. Retry-After = the period.
const RETRY_AFTER_SECONDS = 60
export const rateLimited = <P extends string, I extends Input>(c: Context<Env, P, I>) => {
  c.header('Retry-After', String(RETRY_AFTER_SECONDS))
  return fail(c, 429, 'rate_limited', 'Too many requests')
}

/** Verifies X-Install-Id / X-Timestamp / X-Nonce / X-Signature, then burns the nonce in D1. Sets `installId`. */
export const requireSigned: MiddlewareHandler<Env> = async (c, next) => {
  const installId = InstallId.safeParse(c.req.header(INSTALL_ID_HEADER))
  const nonce = Nonce.safeParse(c.req.header(NONCE_HEADER))
  const sig = Signature.safeParse(c.req.header(SIGNATURE_HEADER))
  const tsRaw = c.req.header(TIMESTAMP_HEADER) ?? ''
  if (!installId.success || !nonce.success || !sig.success || !/^\d{1,12}$/.test(tsRaw)) {
    return fail(c, 401, 'unauthorized', 'Signed request headers are required')
  }
  const ts = Number(tsRaw)
  if (Math.abs(nowSeconds() - ts) > CLOCK_SKEW_SECONDS) return fail(c, 401, 'clock_skew', 'Device clock is off')

  const db = getDb(c.env.DB)
  const row = await db
    .select({ publicKey: installs.publicKey })
    .from(installs)
    .where(eq(installs.id, installId.data))
    .get()
  if (!row) return fail(c, 401, 'unauthorized', 'Unknown install')

  const body = await c.req.arrayBuffer() // Hono caches it, so handlers can still read the body
  const canonical = canonicalString({
    method: c.req.method,
    path: c.req.path,
    installId: installId.data,
    ts,
    nonce: nonce.data,
    bodySha256Hex: hex(await crypto.subtle.digest('SHA-256', body)),
  })
  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    await importPublicKey(row.publicKey),
    b64uDecode(sig.data),
    enc.encode(canonical),
  )
  if (!ok) return fail(c, 401, 'signature_invalid', 'Signature is invalid')

  // The nonce must outlive the timestamp window, so it expires at ts + skew.
  const [, ins] = await db.batch([
    db.delete(nonces).where(and(eq(nonces.installId, installId.data), lt(nonces.expiresAt, nowSeconds()))),
    db
      .insert(nonces)
      .values({ installId: installId.data, nonce: nonce.data, expiresAt: ts + CLOCK_SKEW_SECONDS })
      .onConflictDoNothing(),
  ])
  if (ins.meta.changes === 0) return fail(c, 401, 'nonce_reused', 'Nonce was already used')

  c.set('installId', installId.data)
  await next()
}

// Token = `<installId>.<exp>.<b64url HMAC-SHA256(TOKEN_SECRET, "<installId>.<exp>")>`, sent as `Authorization: Bearer`.
const hmacKey = (c: Context<Env>, usage: 'sign' | 'verify') => {
  // Fail closed (500) when the secret is missing or weak.
  if (typeof c.env.TOKEN_SECRET !== 'string' || c.env.TOKEN_SECRET.length < 32) throw new Error('invalid TOKEN_SECRET')
  return crypto.subtle.importKey('raw', enc.encode(c.env.TOKEN_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, [
    usage,
  ])
}

export async function issueToken(c: Context<Env>, installId: string) {
  const expiresAt = nowSeconds() + TOKEN_TTL_SECONDS
  const payload = `${installId}.${String(expiresAt)}`
  const mac = await crypto.subtle.sign('HMAC', await hmacKey(c, 'sign'), enc.encode(payload))
  return { token: `${payload}.${b64uEncode(new Uint8Array(mac))}`, expiresAt }
}

/** Bearer token check + per-install rate limit. Sets `installId`. */
export const requireToken: MiddlewareHandler<Env> = async (c, next) => {
  const m = /^Bearer (\S+)$/.exec(c.req.header('Authorization') ?? '')
  const parts = m?.[1]?.split('.') ?? []
  const [id, exp, mac] = parts
  if (parts.length !== 3 || !id || !exp || !mac || !InstallId.safeParse(id).success || !/^\d{1,12}$/.test(exp)) {
    return fail(c, 401, 'unauthorized', 'Token is required')
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(mac)) return fail(c, 401, 'unauthorized', 'Token is required')
  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(c, 'verify'),
    b64uDecode(mac),
    enc.encode(`${id}.${exp}`),
  )
  if (!valid) return fail(c, 401, 'unauthorized', 'Token is invalid')
  if (Number(exp) <= nowSeconds()) return fail(c, 401, 'unauthorized', 'Token expired')
  c.set('installId', id)
  return limitInstall(c, next)
}

/** Per-install rate limit. Runs after requireSigned / requireToken, which set `installId`. */
export const limitInstall: MiddlewareHandler<Env> = async (c, next) => {
  if (!(await c.env.INSTALL_LIMITER.limit({ key: c.get('installId') })).success) return rateLimited(c)
  await next()
}
