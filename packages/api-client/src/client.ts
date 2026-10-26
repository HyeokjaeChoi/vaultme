import {
  APP_VERSION_HEADER,
  CLIENT_HEADER,
  ErrorEnvelope,
  HistoryRequest,
  INSTALL_ID_HEADER,
  NONCE_HEADER,
  PushOkResponse,
  PushSubscribeRequest,
  RegisterResponse,
  RpcResponse,
  TxInternalRequest,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  TokenResponse,
  WEB_CLIENT,
  canonicalString,
} from '@vaultme/contracts'
import { ApiError, RpcError } from './errors.ts'

/**
 * The platform half of the install identity (ARCHITECTURE.md#install-auth): an ECDSA P-256 device key, not the wallet key, and the installId the server gave for it.
 * The private key never crosses this seam, so a non-extractable key (WebCrypto) fits as well as a stored one (mobile: noble + Keychain).
 */
export type DeviceSigner = {
  /** Public key of the stored device key: uncompressed point (65 bytes), base64url. `null` = no key yet. */
  publicKey(): Promise<string | null>
  /** Makes and stores a new device key in place of any old one, and returns its public key. */
  createKey(): Promise<string>
  /** ECDSA P-256 over SHA-256(text) with the stored key: compact r||s (64 bytes), base64url. The server verifies exactly this form. */
  sign(text: string): Promise<string>
  getInstallId(): Promise<string | null>
  setInstallId(id: string | null): Promise<void>
  /**
   * Runs `fn` while no other tab or process of this app does the same (web: a Web Lock). The key and the installId are
   * read, made and registered inside it, so two tabs opened together on a fresh browser make one install. Absent where
   * there is one process (mobile).
   */
  exclusive?<T>(fn: () => Promise<T>): Promise<T>
}

export type ApiDeps = {
  baseUrl: string
  appVersion: string
  /** `'web'` sends `X-Client: web`, so the API checks `MIN_WEB_VERSION` (ADR-0011). Mobile sends none. */
  client?: typeof WEB_CLIENT
  signer: DeviceSigner
  fetch?: typeof fetch
  /** ms since epoch */
  now?: () => number
  nonce?: () => string
  /** Called once a response says this app version is no longer supported (426). The caller blocks the app (S91). */
  onUpdateRequired?: () => void
}

/** A token is renewed this long before `expiresAt`, so a request never leaves with a token about to expire. */
const REFRESH_MARGIN_MS = 60_000

/** SHA-256 of the empty body: the token request has no body. */
const EMPTY_BODY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

const b64u = (b: Uint8Array): string =>
  btoa(String.fromCharCode(...b))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')

const randomNonce = (): string => b64u(crypto.getRandomValues(new Uint8Array(16)))

const unknown = (m: string, status = 0) => new ApiError('Unknown', status, false, m)

function toApiError(status: number, json: unknown): ApiError {
  const env = ErrorEnvelope.safeParse(json)
  if (env.success) return new ApiError(env.data.code, status, env.data.retryable, env.data.message)
  if (status === 426) return new ApiError('update_required', status, false, 'update required')
  const retryable =
    typeof (json as { retryable?: unknown } | null)?.retryable === 'boolean' &&
    (json as { retryable: boolean }).retryable
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
        headers: {
          [APP_VERSION_HEADER]: d.appVersion,
          ...(d.client ? { [CLIENT_HEADER]: d.client } : {}),
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
          ...headers,
        },
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
  let installId: Promise<string> | null = null

  function ensureInstall(): Promise<string> {
    const identify = async () => {
      let publicKey = await d.signer.publicKey()
      let id = await d.signer.getInstallId()
      if (!publicKey) {
        // No key: any stored installId belongs to a lost key. Start over.
        publicKey = await d.signer.createKey() // key first: a crash before registration only costs a re-register
        id = null
      }
      if (!id) {
        const r = parseWith(
          (v) => RegisterResponse.parse(v),
          await http('POST', '/v1/installs', {}, JSON.stringify({ publicKey })),
        )
        id = r.installId
        await d.signer.setInstallId(id)
      }
      return id
    }
    installId ??= (d.signer.exclusive ? d.signer.exclusive(identify) : identify()).catch((e: unknown) => {
      installId = null
      throw e
    })
    return installId
  }

  /** The server does not know this install (for example its database was reset): register the same key again. */
  async function forgetInstall() {
    installId = null
    await d.signer.setInstallId(null)
  }

  // --- token ---
  let cached: { token: string; expiresAt: number } | null = null
  let inflight: Promise<{ token: string; expiresAt: number }> | null = null

  async function fetchToken(): Promise<{ token: string; expiresAt: number }> {
    for (let attempt = 0; ; attempt++) {
      const installId = await ensureInstall()
      const path = '/v1/installs/token'
      const ts = Math.floor(now() / 1000)
      const n = nonce()
      const canonical = canonicalString({
        method: 'POST',
        path,
        installId,
        ts,
        nonce: n,
        bodySha256Hex: EMPTY_BODY_SHA256,
      })
      try {
        const json = await http('POST', path, {
          [INSTALL_ID_HEADER]: installId,
          [TIMESTAMP_HEADER]: String(ts),
          [NONCE_HEADER]: n,
          [SIGNATURE_HEADER]: await d.signer.sign(canonical),
        })
        return parseWith((v) => TokenResponse.parse(v), json)
      } catch (e) {
        if (attempt === 0 && e instanceof ApiError && e.code === 'unauthorized') {
          await forgetInstall()
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
    /** POST /v1/history (ARCHITECTURE.md#api-contract). Returned as is (`HistoryResponse`, ARCHITECTURE.md#history): the history model checks each item, so one unknown item does not fail the page. */
    history(address: string, cursor?: string): Promise<unknown> {
      return post(
        '/v1/history',
        HistoryRequest.parse({ address, ...(cursor === undefined ? {} : { cursor }) }),
        (v) => v,
      )
    },
    /** POST /v1/tx/internal: the internal ETH transfers of one transaction (ADR-0015). Returned as is; `readInternalTransfers` checks it. */
    txInternal(hash: string): Promise<unknown> {
      return post('/v1/tx/internal', TxInternalRequest.parse({ hash }), (v) => v)
    },
    /** PUT /v1/push/subscription: registers this install's address and Expo push token (#67). Replaces any earlier one. */
    async putPushSubscription(address: string, expoToken: string): Promise<void> {
      await send('PUT', '/v1/push/subscription', PushSubscribeRequest.parse({ address, expoToken }), (v) =>
        PushOkResponse.parse(v),
      )
    },
    /** DELETE /v1/push/subscription: deletes the address and token on the server. Also fine when there is none. */
    async deletePushSubscription(): Promise<void> {
      await send('DELETE', '/v1/push/subscription', undefined, (v) => PushOkResponse.parse(v))
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
