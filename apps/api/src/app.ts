import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import {
  APP_VERSION_HEADER,
  AppVersion,
  CLIENT_HEADER,
  ErrorEnvelope,
  HealthResponse,
  HistoryRequest,
  HistoryResponse,
  INSTALL_ID_HEADER,
  InstallMeResponse,
  NONCE_HEADER,
  PushOkResponse,
  PushSubscribeRequest,
  RegisterRequest,
  RegisterResponse,
  RpcRequest,
  RpcResponse,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  TokenResponse,
  TxInternalRequest,
  TxInternalResponse,
  WEB_CLIENT,
  errorEnvelope,
  isBelow,
} from '@vaultme/contracts'
import type { ErrorHandler, MiddlewareHandler } from 'hono'
import { cors } from 'hono/cors'
import pkg from '../package.json' with { type: 'json' }
import {
  importPublicKey,
  issueToken,
  limitInstall,
  nowSeconds,
  rateLimited,
  requireSigned,
  requireToken,
} from './auth.ts'
import type { Env } from './env.ts'
import { getHistory, getTxInternal } from './etherscan.ts'
import { InvalidCursorError, UpstreamError, fail } from './errors.ts'
import { AlchemyPayload, handleActivity, subscribe, unsubscribe, verifyAlchemySignature } from './push.ts'
import { proxyRpc, rpcAllowed } from './rpc.ts'

export const app = new OpenAPIHono<Env>({
  defaultHook: (r, c) => {
    if (!r.success) return fail(c, 400, 'invalid_request', 'Invalid request')
    return undefined
  },
})

// WEB_ORIGINS is a comma-separated var: the exact browser origins allowed (ADR-0011). Empty = no browser.
const webOrigins = (c: { env: Env['Bindings'] }) =>
  (c.env.WEB_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

// A browser always sends Origin on cross-origin requests. The native app does not.
// Only the allow-listed web origins pass; this also covers preflight and /webhooks.
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin')
  if (origin !== undefined && !webOrigins(c).includes(origin))
    return fail(c, 403, 'origin_forbidden', 'Origin is not allowed')
  await next()
})

// CORS only for /v1. cors() answers the preflight itself, before the version check below.
app.use(
  '/v1/*',
  cors({
    origin: (origin, c) => (webOrigins(c).includes(origin) ? origin : null),
    allowHeaders: [
      APP_VERSION_HEADER,
      CLIENT_HEADER,
      INSTALL_ID_HEADER,
      TIMESTAMP_HEADER,
      NONCE_HEADER,
      SIGNATURE_HEADER,
      'Authorization',
      'Content-Type',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    exposeHeaders: ['Retry-After'], // the web shows a retry hint on 429
    maxAge: 600,
  }),
)

app.use('/v1/*', async (c, next) => {
  if (c.req.path === '/v1/health') return next()
  const v = AppVersion.safeParse(c.req.header(APP_VERSION_HEADER))
  if (!v.success) return fail(c, 400, 'invalid_request', `${APP_VERSION_HEADER} header is required`)
  // Web and mobile have separate minimums (ADR-0011). A bad minimum would make every comparison wrong. Fail closed.
  const web = c.req.header(CLIENT_HEADER) === WEB_CLIENT
  const min = web ? c.env.MIN_WEB_VERSION : c.env.MIN_APP_VERSION
  if (!AppVersion.safeParse(min).success) throw new Error(web ? 'invalid MIN_WEB_VERSION' : 'invalid MIN_APP_VERSION')
  if (isBelow(v.data, min)) return fail(c, 426, 'update_required', 'Update the app to continue')
  await next()
})

const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: ErrorEnvelope } },
})

app.openapi(
  createRoute({
    method: 'get',
    path: '/v1/health',
    responses: {
      200: { description: 'API is up', content: { 'application/json': { schema: HealthResponse } } },
      403: errorResponse('Origin header is not an allowed web origin'),
    },
  }),
  (c) => c.json({ ok: true as const, version: pkg.version }, 200),
)

const bearer = { 401: errorResponse('Missing, invalid or expired token'), 429: errorResponse('Rate limited') }
const signed = { 401: errorResponse('Missing or invalid signed-request headers'), 429: errorResponse('Rate limited') }

// Coarse IP limit. Mobile networks share IPs, so this only slows down mass registration.
app.use('/v1/installs', async (c, next) => {
  const key = c.req.header('CF-Connecting-IP') ?? 'unknown'
  if (!(await c.env.INSTALL_IP_LIMITER.limit({ key })).success) return rateLimited(c)
  await next()
})
app.use('/v1/installs/token', requireSigned, limitInstall)
app.use('/v1/installs/me', requireToken)
const ipLimit =
  (name: 'RPC_IP_LIMITER' | 'HISTORY_IP_LIMITER'): MiddlewareHandler<Env> =>
  async (c, next) => {
    const key = c.req.header('CF-Connecting-IP') ?? 'unknown'
    if (!(await c.env[name].limit({ key })).success) return rateLimited(c)
    await next()
  }
app.use('/v1/rpc', ipLimit('RPC_IP_LIMITER'), requireToken)
app.use('/v1/history', ipLimit('HISTORY_IP_LIMITER'), requireToken)
app.use('/v1/tx/internal', ipLimit('HISTORY_IP_LIMITER'), requireToken) // same limits as history (ADR-0015)
app.use('/v1/push/*', requireToken)

app.openapi(
  createRoute({
    method: 'post',
    path: '/v1/installs',
    request: { body: { content: { 'application/json': { schema: RegisterRequest } }, required: true } },
    responses: {
      201: { description: 'Install registered', content: { 'application/json': { schema: RegisterResponse } } },
      400: errorResponse('Invalid public key'),
      429: errorResponse('Rate limited'),
    },
  }),
  async (c) => {
    const { publicKey } = c.req.valid('json')
    try {
      await importPublicKey(publicKey)
    } catch {
      return c.json(errorEnvelope('invalid_request', 'Invalid public key'), 400)
    }
    const installId = crypto.randomUUID()
    const now = nowSeconds()
    await c.env.DB.prepare('INSERT INTO installs (id, public_key, created_at, last_seen_at) VALUES (?, ?, ?, ?)')
      .bind(installId, publicKey, now, now)
      .run()
    return c.json({ installId }, 201)
  },
)

app.openapi(
  createRoute({
    method: 'post',
    path: '/v1/installs/token',
    responses: {
      200: { description: 'Short-lived token', content: { 'application/json': { schema: TokenResponse } } },
      ...signed,
    },
  }),
  async (c) => {
    const installId = c.get('installId')
    await c.env.DB.prepare('UPDATE installs SET last_seen_at = ? WHERE id = ?').bind(nowSeconds(), installId).run()
    return c.json(await issueToken(c, installId), 200)
  },
)

// Token check. Also the template for /v1/rpc, /v1/history and /v1/tx/internal, which mount requireToken the same way.
app.openapi(
  createRoute({
    method: 'get',
    path: '/v1/installs/me',
    responses: {
      200: { description: 'Token is valid', content: { 'application/json': { schema: InstallMeResponse } } },
      ...bearer,
    },
  }),
  (c) => c.json({ installId: c.get('installId') }, 200),
)

app.openapi(
  createRoute({
    method: 'post',
    path: '/v1/rpc',
    request: { body: { content: { 'application/json': { schema: RpcRequest } }, required: true } },
    responses: {
      200: {
        description: 'Upstream JSON-RPC response, errors included',
        content: { 'application/json': { schema: RpcResponse } },
      },
      400: errorResponse('Not a single JSON-RPC 2.0 request (batches are not supported)'),
      403: errorResponse('Method or eth_call target not allowed'),
      503: errorResponse('Both upstreams failed (retryable)'),
      ...bearer,
    },
  }),
  async (c) => {
    const req = c.req.valid('json')
    if (!rpcAllowed(req)) return c.json(errorEnvelope('method_not_allowed', 'Method not allowed'), 403)
    const text = await proxyRpc(c.env, req)
    if (text === null) return c.json(errorEnvelope('unavailable', 'RPC upstream unavailable'), 503)
    return c.body(text, 200, { 'content-type': 'application/json' }) as never
  },
)

app.openapi(
  createRoute({
    method: 'post',
    path: '/v1/history',
    request: { body: { content: { 'application/json': { schema: HistoryRequest } }, required: true } },
    responses: {
      200: {
        description: 'One page of history, newest first',
        content: { 'application/json': { schema: HistoryResponse } },
      },
      400: errorResponse('Invalid address or cursor (`invalid_cursor`)'),
      503: errorResponse('Etherscan failed or was throttled (retryable)'),
      ...bearer,
    },
  }),
  async (c) => {
    const { address, cursor } = c.req.valid('json')
    try {
      return c.json(await getHistory(c.env, address, cursor), 200)
    } catch (e) {
      if (e instanceof InvalidCursorError) return c.json(errorEnvelope('invalid_cursor', 'Invalid cursor'), 400)
      if (e instanceof UpstreamError) return c.json(errorEnvelope('unavailable', 'History unavailable'), 503)
      throw e
    }
  },
)

app.openapi(
  createRoute({
    method: 'post',
    path: '/v1/tx/internal',
    request: { body: { content: { 'application/json': { schema: TxInternalRequest } }, required: true } },
    responses: {
      200: {
        description: 'Internal ETH transfers of the transaction (empty when there are none or Etherscan lags)',
        content: { 'application/json': { schema: TxInternalResponse } },
      },
      400: errorResponse('Invalid transaction hash'),
      503: errorResponse('Etherscan failed or was throttled (retryable)'),
      ...bearer,
    },
  }),
  async (c) => {
    try {
      return c.json(await getTxInternal(c.env, c.req.valid('json').hash), 200)
    } catch (e) {
      if (e instanceof UpstreamError) return c.json(errorEnvelope('unavailable', 'Internal transfers unavailable'), 503)
      throw e
    }
  },
)

app.openapi(
  createRoute({
    method: 'put',
    path: '/v1/push/subscription',
    request: { body: { content: { 'application/json': { schema: PushSubscribeRequest } }, required: true } },
    responses: {
      200: {
        description: 'Address and push token registered',
        content: { 'application/json': { schema: PushOkResponse } },
      },
      400: errorResponse('Invalid address or push token'),
      503: errorResponse('Webhook registration failed, nothing was kept (retryable)'),
      ...bearer,
    },
  }),
  async (c) => {
    const { address, expoToken } = c.req.valid('json')
    if (!(await subscribe(c.env, c.get('installId'), address, expoToken)))
      return c.json(errorEnvelope('unavailable', 'Push registration unavailable'), 503)
    return c.json({ ok: true as const }, 200)
  },
)

app.openapi(
  createRoute({
    method: 'delete',
    path: '/v1/push/subscription',
    responses: {
      200: {
        description: 'Subscription deleted (also when there was none)',
        content: { 'application/json': { schema: PushOkResponse } },
      },
      ...bearer,
    },
  }),
  async (c) => {
    // The row is gone before the Alchemy call. A failed removal is queued and retried by cron, so the answer is still 200.
    await unsubscribe(c.env, c.get('installId'))
    return c.json({ ok: true as const }, 200)
  },
)

// Alchemy Notify address-activity webhook. Not under /v1: Alchemy sends no app version header. Authenticated by HMAC, not by token.
app.post('/webhooks/alchemy', async (c) => {
  const raw = await c.req.text()
  if (!(await verifyAlchemySignature(c.env, raw, c.req.header('X-Alchemy-Signature'))))
    return fail(c, 401, 'unauthorized', 'Signature is invalid')
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return fail(c, 400, 'invalid_request', 'Invalid request')
  }
  const payload = AlchemyPayload.safeParse(json)
  if (!payload.success) return fail(c, 400, 'invalid_request', 'Invalid request')
  try {
    await handleActivity(c.env, payload.data)
  } catch (e) {
    // Non-200 makes Alchemy retry with backoff. push_sent stops a retry from notifying twice.
    if (e instanceof UpstreamError) return fail(c, 503, 'unavailable', 'Push unavailable')
    throw e
  }
  return c.json({ ok: true }, 200)
})

app.notFound((c) => fail(c, 404, 'not_found', 'Not found'))
// Never return the stack or the error text. Log only the error name.
export const handleError: ErrorHandler<Env> = (err, c) => {
  console.error('unhandled error', err.name)
  return fail(c, 500, 'internal', 'Internal error')
}
app.onError(handleError)
