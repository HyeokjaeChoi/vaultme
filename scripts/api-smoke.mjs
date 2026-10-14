// Local smoke test: register -> token -> protected route against `wrangler dev`.
// Usage: node scripts/api-smoke.mjs [baseUrl]   (default http://127.0.0.1:8787)
import { canonicalString } from '../packages/contracts/src/installs.ts'

const base = process.argv[2] ?? 'http://127.0.0.1:8787'
const b64u = (buf) => Buffer.from(buf).toString('base64url')
const sha256Hex = async (s) => Buffer.from(await crypto.subtle.digest('SHA-256', Buffer.from(s))).toString('hex')
const send = async (path, init = {}) => {
  const res = await fetch(base + path, { ...init, headers: { 'X-App-Version': '1.0.0', ...init.headers } })
  const body = await res.json()
  console.log(init.method ?? 'GET', path, res.status, JSON.stringify(body))
  return { res, body }
}

const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const publicKey = b64u(await crypto.subtle.exportKey('raw', pair.publicKey))

const reg = await send('/v1/installs', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ publicKey }),
})
const { installId } = reg.body

const signedHeaders = async (method, path, body = '') => {
  const ts = Math.floor(Date.now() / 1000)
  const nonce = b64u(crypto.getRandomValues(new Uint8Array(16)))
  const canonical = canonicalString({ method, path, installId, ts, nonce, bodySha256Hex: await sha256Hex(body) })
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, Buffer.from(canonical))
  return { 'X-Install-Id': installId, 'X-Timestamp': String(ts), 'X-Nonce': nonce, 'X-Signature': b64u(sig) }
}

const noToken = await send('/v1/installs/me')
const tok = await send('/v1/installs/token', { method: 'POST', headers: await signedHeaders('POST', '/v1/installs/token') })
const replay = await (async () => {
  const h = await signedHeaders('POST', '/v1/installs/token')
  await send('/v1/installs/token', { method: 'POST', headers: h })
  return send('/v1/installs/token', { method: 'POST', headers: h })
})()
const me = await send('/v1/installs/me', { headers: { Authorization: `Bearer ${tok.body.token}` } })

const ok =
  reg.res.status === 201 && noToken.res.status === 401 && tok.res.status === 200 && replay.body.code === 'nonce_reused' &&
  me.res.status === 200 && me.body.installId === installId
console.log(ok ? 'SMOKE OK' : 'SMOKE FAILED')
process.exit(ok ? 0 : 1)
