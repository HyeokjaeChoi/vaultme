import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { APP_VERSION_HEADER, AppVersion, ErrorEnvelope, HealthResponse, isBelow } from '@vaultme/contracts'
import type { ErrorHandler } from 'hono'
import pkg from '../package.json' with { type: 'json' }
import type { Env } from './env.ts'
import { fail } from './errors.ts'

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

app.notFound((c) => fail(c, 404, 'not_found', 'Not found'))
// Never return the stack or the error text. Log only the error name.
export const handleError: ErrorHandler = (err, c) => {
  console.error('unhandled error', err.name)
  return fail(c, 500, 'internal', 'Internal error')
}
app.onError(handleError)
