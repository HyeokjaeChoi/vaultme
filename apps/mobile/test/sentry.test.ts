import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  flush: vi.fn(() => Promise.resolve(true)),
  nativeCrash: vi.fn(),
  wrap: vi.fn((c: unknown) => c),
  extra: {},
}))
vi.mock('@sentry/react-native', () => ({ ...h }))
vi.mock('expo-constants', () => ({
  default: {
    get expoConfig() {
      return { extra: h.extra }
    },
  },
}))

import { initSentry, triggerTestCrash, wrapRoot } from '../src/shared/lib/sentry'

const ADDR = '0x' + 'ab'.repeat(20)
const DSN = 'https://key@o1.ingest.us.sentry.io/2'
const g = globalThis as { __DEV__?: boolean }

beforeEach(() => {
  vi.clearAllMocks()
  h.extra = {}
  g.__DEV__ = false
  delete process.env.EXPO_PUBLIC_ENV
})

/** The `environment` option of the init call for this EXPO_PUBLIC_ENV and dev flag. */
const environment = (publicEnv: string | undefined, dev: boolean): unknown => {
  h.extra = { sentryDsn: DSN }
  g.__DEV__ = dev
  if (publicEnv === undefined) delete process.env.EXPO_PUBLIC_ENV
  else process.env.EXPO_PUBLIC_ENV = publicEnv
  h.init.mockClear()
  initSentry()
  return (h.init.mock.calls[0]?.[0] as { environment: string }).environment
}

describe('Sentry environment', () => {
  it('uses staging or production from EXPO_PUBLIC_ENV, else dev in a dev build and production in a release', () => {
    expect(environment('staging', false)).toBe('staging')
    expect(environment('production', true)).toBe('production')
    expect(environment(undefined, true)).toBe('dev')
    expect(environment('nonsense', false)).toBe('production')
  })
})

describe('initSentry', () => {
  it('sends nothing when the app config has no DSN', () => {
    initSentry()
    expect(h.init).not.toHaveBeenCalled()
    h.extra = { sentryDsn: '' }
    initSentry()
    expect(h.init).not.toHaveBeenCalled()
  })

  it('inits with the DSN, the environment, no PII, no tracing and the scrubbers', () => {
    h.extra = { sentryDsn: DSN }
    process.env.EXPO_PUBLIC_ENV = 'staging'
    initSentry()
    const o = h.init.mock.calls[0]?.[0] as Record<string, (x: object) => unknown> & Record<string, unknown>
    expect(o).toMatchObject({ dsn: DSN, environment: 'staging', sendDefaultPii: false })
    expect(o.tracesSampleRate).toBeUndefined()
    expect(o.integrations).toBeUndefined() // no replay, no extra integrations
    expect(o.beforeSend?.({ message: `to ${ADDR}`, user: { id: 'x' }, request: { url: `/a?b=${ADDR}` } })).toEqual({
      message: 'to [address]',
      sdk: { settings: { infer_ip: 'never' } },
      request: { url: '/a' },
    })
    expect(o.beforeBreadcrumb?.({ category: 'fetch', data: { url: `https://api.example/v1/rpc?a=${ADDR}` } })).toEqual({
      category: 'fetch',
      data: { url: '/v1/rpc' },
    })
  })
})

// triggerTestCrash waits a few seconds for the native send: run it on fake timers
async function crash() {
  vi.useFakeTimers()
  const done = triggerTestCrash()
  await vi.runAllTimersAsync()
  await done
  vi.useRealTimers()
}

describe('test crash door', () => {
  it.each([
    [undefined, true, true],
    ['staging', false, true],
    [undefined, false, false],
    ['production', false, false],
    ['production', true, true],
  ])('EXPO_PUBLIC_ENV=%s, dev=%s: open=%s', async (publicEnv, dev, open) => {
    g.__DEV__ = dev
    if (publicEnv) process.env.EXPO_PUBLIC_ENV = publicEnv
    await crash()
    expect(h.nativeCrash).toHaveBeenCalledTimes(open ? 1 : 0)
  })

  it('does nothing when the door is closed', async () => {
    await crash()
    expect(h.captureException).not.toHaveBeenCalled()
    expect(h.nativeCrash).not.toHaveBeenCalled()
  })

  it('sends one JS error, waits for the flush, then crashes the native side', async () => {
    g.__DEV__ = true
    await crash()
    expect(h.captureException).toHaveBeenCalledTimes(1)
    expect(h.flush).toHaveBeenCalled()
    expect(h.nativeCrash).toHaveBeenCalledTimes(1)
    expect(h.flush.mock.invocationCallOrder[0]).toBeLessThan(h.nativeCrash.mock.invocationCallOrder[0] ?? 0)
  })
})

describe('wrapRoot', () => {
  it('wraps the root component with Sentry', () => {
    const C = () => null
    expect(wrapRoot(C)).toBe(C)
    expect(h.wrap).toHaveBeenCalledWith(C)
  })
})
