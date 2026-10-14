import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import {
  APP_VERSION_HEADER,
  AppVersion,
  ErrorEnvelope,
  HealthResponse,
  InstallMeResponse,
  RegisterRequest,
  RegisterResponse,
  RpcRequest,
  RpcResponse,
  TokenResponse,
  errorEnvelope,
  isBelow,
} from '@vaultme/contracts'
import type { ErrorHandler } from 'hono'
import pkg from '../package.json' with { type: 'json' }
import { importPublicKey, issueToken, limitInstall, nowSeconds, rateLimited, requireSigned, requireToken } from './auth.ts'
import type { Env } from './env.ts'
import { fail } from './errors.ts'
import { proxyRpc, rpcAllowed } from './rpc.ts'

// No CORS headers on purpose: the only client is the native app (LLD §4).
export const app = new OpenAPIHono<Env>({
  defaultHook: (r, c) => {
    if (!r.success) return fail(c, 400, 'invalid_request', 'Invalid request')
    return undefined
  },
})

// A browser always sends Origin on cross-origin requests. The native app does not.
app.use('*', async (c, next) => {
  if (c.req.header('Origin') !== undefined) return fail(c, 403, 'origin_forbidden', 'Browser requests are not allowed')
  await next()
})

app.use('/v1/*', async (c, next) => {
  if (c.req.path === '/v1/health') return next()
  const v = AppVersion.safeParse(c.req.header(APP_VERSION_HEADER))
  if (!v.success) return fail(c, 400, 'invalid_request', `${APP_VERSION_HEADER} header is required`)
  // A bad MIN_APP_VERSION would make every comparison wrong. Fail closed.
  if (!AppVersion.safeParse(c.env.MIN_APP_VERSION).success) throw new Error('invalid MIN_APP_VERSION')
  if (isBelow(v.data, c.env.MIN_APP_VERSION)) return fail(c, 426, 'update_required', 'Update the app to continue')
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
      403: errorResponse('Request had an Origin header'),
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
app.use('/v1/rpc', async (c, next) => {
  const key = c.req.header('CF-Connecting-IP') ?? 'unknown'
  if (!(await c.env.RPC_IP_LIMITER.limit({ key })).success) return rateLimited(c)
  await next()
})
app.use('/v1/rpc', requireToken)

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

// Token check. Also the template for /v1/rpc and /v1/history, which mount requireToken the same way.
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
      200: { description: 'Upstream JSON-RPC response, errors included', content: { 'application/json': { schema: RpcResponse } } },
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

app.notFound((c) => fail(c, 404, 'not_found', 'Not found'))
// Never return the stack or the error text. Log only the error name.
export const handleError: ErrorHandler = (err, c) => {
  console.error('unhandled error', err.name)
  return fail(c, 500, 'internal', 'Internal error')
}
app.onError(handleError)
