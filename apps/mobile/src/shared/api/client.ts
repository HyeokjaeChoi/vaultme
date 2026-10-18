import {
  APP_VERSION_HEADER,
  ErrorEnvelope,
  HistoryRequest,
  INSTALL_ID_HEADER,
  NONCE_HEADER,
  PushOkResponse,
  PushSubscribeRequest,
  RegisterResponse,
  RpcResponse,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  TokenResponse,
  canonicalString,
} from '@vaultme/contracts'
import { newPrivateKeyHex, publicKeyB64u, randomNonce, sha256Hex, signCanonical } from './deviceKey'
import { ApiError, RpcError } from './errors'

/** Where the device identity lives. Key: Keychain, no-auth tier. installId: kv. */
export type DeviceStore = {
  loadKey(): Promise<string | null>
  saveKey(hex: string): Promise<void>
  getInstallId(): string | null
  setInstallId(id: string | null): void
}

export type ApiDeps = {
  baseUrl: string
  appVersion: string
  store: DeviceStore
  fetch?: typeof fetch
  /** ms since epoch */
  now?: () => number
  nonce?: () => string
  /** Called once a response says this app version is no longer supported (426). The caller blocks the app (S91). */
  onUpdateRequired?: () => void
}

/** A token is renewed this long before `expiresAt`, so a request never leaves with a token about to expire. */
const REFRESH_MARGIN_MS = 60_000

const unknown = (m: string, status = 0) => new ApiError('Unknown', status, false, m)

function toApiError(status: number, json: unknown): ApiError {
  const env = ErrorEnvelope.safeParse(json)
  if (env.success) return new ApiError(env.data.code, status, env.data.retryable, env.data.message)
  if (status === 426) return new ApiError('update_required', status, false, 'update required')
  const retryable = typeof (json as { retryable?: unknown } | null)?.retryable === 'boolean' && (json as { retryable: boolean }).retryable
  return new ApiError('Unknown', status, retryable, 'unknown error')
}

function parseWith<T>(parse: (v: unknown) => T, json: unknown): T {
  try {
    return parse(json)
  } catch {
    throw unknown('unexpected response body')
  }
}

export function createApiClient(d: ApiDeps) {
  const base = d.baseUrl.replace(/\/+$/, '')
  const now = d.now ?? Date.now
  const nonce = d.nonce ?? randomNonce
  let rpcId = 0

  async function http(method: string, path: string, headers: Record<string, string>, body?: string): Promise<unknown> {
    let res: Response
    try {
      res = await (d.fetch ?? fetch)(base + path, {
        method,
        headers: { [APP_VERSION_HEADER]: d.appVersion, ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
        ...(body === undefined ? {} : { body }),
      })
    } catch {
      throw new ApiError('network', 0, true, 'network error')
    }
    let json: unknown
    try {
      const text = await res.text()
      json = text ? JSON.parse(text) : undefined
    } catch {
      json = undefined
    }
    if (!res.ok) {
      const err = toApiError(res.status, json)
      if (err.code === 'update_required') d.onUpdateRequired?.()
      throw err
    }
    return json
  }

  // --- identity: device key + installId ---
  type Identity = { installId: string; keyHex: string }
  let identity: Promise<Identity> | null = null

  function ensureIdentity(): Promise<Identity> {
    identity ??= (async () => {
      let keyHex = await d.store.loadKey()
      let installId = d.store.getInstallId()
      if (!keyHex) {
        // No key: any stored installId belongs to a lost key. Start over.
        keyHex = newPrivateKeyHex()
        await d.store.saveKey(keyHex) // key first: a crash before registration only costs a re-register
        installId = null
      }
      if (!installId) {
        const r = parseWith((v) => RegisterResponse.parse(v), await http('POST', '/v1/installs', {}, JSON.stringify({ publicKey: publicKeyB64u(keyHex) })))
        installId = r.installId
        d.store.setInstallId(installId)
      }
      return { installId, keyHex }
    })().catch((e) => {
      identity = null
      throw e
    })
    return identity
  }

  /** The server does not know this install (for example its database was reset): register the same key again. */
  function forgetInstall() {
    identity = null
    d.store.setInstallId(null)
  }

  // --- token ---
  let cached: { token: string; expiresAt: number } | null = null
  let inflight: Promise<{ token: string; expiresAt: number }> | null = null

  async function fetchToken(): Promise<{ token: string; expiresAt: number }> {
    for (let attempt = 0; ; attempt++) {
      const { installId, keyHex } = await ensureIdentity()
      const path = '/v1/installs/token'
      const ts = Math.floor(now() / 1000)
      const n = nonce()
      const canonical = canonicalString({ method: 'POST', path, installId, ts, nonce: n, bodySha256Hex: sha256Hex('') })
      try {
        const json = await http('POST', path, {
          [INSTALL_ID_HEADER]: installId,
          [TIMESTAMP_HEADER]: String(ts),
          [NONCE_HEADER]: n,
          [SIGNATURE_HEADER]: signCanonical(keyHex, canonical),
        })
        return parseWith((v) => TokenResponse.parse(v), json)
      } catch (e) {
        if (attempt === 0 && e instanceof ApiError && e.code === 'unauthorized') {
          forgetInstall()
          continue
        }
        throw e
      }
    }
  }

  async function getToken(force = false): Promise<string> {
    if (!force && cached && cached.expiresAt * 1000 - REFRESH_MARGIN_MS > now()) return cached.token
    inflight ??= fetchToken()
      .then((t) => (cached = t))
      .finally(() => {
        inflight = null
      })
    return (await inflight).token
  }

  /** Request with the install token. One retry with a fresh token on 401 `unauthorized` (expired, rotated secret). */
  async function send<T>(method: string, path: string, body: unknown, parse: (v: unknown) => T): Promise<T> {
    const raw = body === undefined ? undefined : JSON.stringify(body)
    for (let attempt = 0; ; attempt++) {
      try {
        const token = await getToken(attempt > 0)
        return parseWith(parse, await http(method, path, { Authorization: `Bearer ${token}` }, raw))
      } catch (e) {
        if (attempt === 0 && e instanceof ApiError && e.code === 'unauthorized') continue
        throw e
      }
    }
  }
  const post = <T>(path: string, body: unknown, parse: (v: unknown) => T) => send('POST', path, body, parse)

  return {
    /** JSON-RPC through POST /v1/rpc. Returns `result`; a JSON-RPC `error` throws `RpcError`. */
    async rpc(method: string, params: unknown[] = []): Promise<unknown> {
      const r = await post('/v1/rpc', { jsonrpc: '2.0', id: ++rpcId, method, params }, (v) => RpcResponse.parse(v))
      if (r.error) throw new RpcError(r.error.code, r.error.message)
      if (!('result' in r)) throw unknown('rpc: no result')
      return r.result
    },
    /** POST /v1/history (lld.md §4). Returned as is (`HistoryResponse`, lld §4.2): the history model checks each item, so one unknown item does not fail the page. */
    history(address: string, cursor?: string): Promise<unknown> {
      return post('/v1/history', HistoryRequest.parse({ address, ...(cursor === undefined ? {} : { cursor }) }), (v) => v)
    },
    /** PUT /v1/push/subscription: registers this install's address and Expo push token (#67). Replaces any earlier one. */
    async putPushSubscription(address: string, expoToken: string): Promise<void> {
      await send('PUT', '/v1/push/subscription', PushSubscribeRequest.parse({ address, expoToken }), (v) => PushOkResponse.parse(v))
    },
    /** DELETE /v1/push/subscription: deletes the address and token on the server. Also fine when there is none. */
    async deletePushSubscription(): Promise<void> {
      await send('DELETE', '/v1/push/subscription', undefined, (v) => PushOkResponse.parse(v))
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
