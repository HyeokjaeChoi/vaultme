// Shared by k6/api.js and k6/load.js. Runs in k6, not in Node.
import { b64encode } from 'k6/encoding'
import http from 'k6/http'

// Empty-body hash of the signed token request (packages/api-client/src/client.ts).
const EMPTY_BODY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

const b64u = (buf) => b64encode(buf, 'rawurl')

// Registers one temporary install and gets a token, as the app does (a key made in memory, nothing stored).
export async function newInstall(baseUrl, appVersion) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const publicKey = b64u(await crypto.subtle.exportKey('raw', pair.publicKey))
  const base = { 'X-App-Version': appVersion, 'X-Client': 'web' }
  const reg = http.post(`${baseUrl}/v1/installs`, JSON.stringify({ publicKey }), {
    headers: { ...base, 'content-type': 'application/json' },
    tags: { setup: 'register' },
  })
  if (reg.status !== 201) throw new Error(`register failed: HTTP ${reg.status}`)
  const installId = reg.json('installId')
  const ts = Math.floor(Date.now() / 1000)
  const nonce = b64u(crypto.getRandomValues(new Uint8Array(16)).buffer)
  const canonical = ['vaultme-v1', 'POST', '/v1/installs/token', installId, String(ts), nonce, EMPTY_BODY_SHA256].join(
    '\n',
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    pair.privateKey,
    new TextEncoder().encode(canonical),
  )
  const tok = http.post(`${baseUrl}/v1/installs/token`, null, {
    headers: {
      ...base,
      'X-Install-Id': installId,
      'X-Timestamp': String(ts),
      'X-Nonce': nonce,
      'X-Signature': b64u(sig),
    },
    tags: { setup: 'token' },
  })
  if (tok.status !== 200) throw new Error(`token failed: HTTP ${tok.status}`)
  return { installId, token: tok.json('token') }
}

// One metric of a Server-Timing header (`total;dur=12.3, upstream;dur=8`), in ms, or null when the header has none.
export function serverTimingMs(header, metric) {
  const m = new RegExp(`(?:^|,)\\s*${metric};dur=([\\d.]+)`).exec(header || '')
  return m ? Number(m[1]) : null
}
