import { afterEach, describe, expect, it, vi } from 'vitest'
import { logEvent, withRequestId } from '../src/log.ts'

const ADDR = '0x' + 'ab'.repeat(20)
const HASH = '0x' + '11'.repeat(32)
const TOKEN = 'ExponentPushToken[abcdefghijklmnop]'

const spy = (m: 'log' | 'warn' | 'error') => vi.spyOn(console, m).mockImplementation(() => undefined)
afterEach(() => vi.restoreAllMocks())

describe('logEvent', () => {
  it('writes one JSON line with level, event, request id and the fields', () => {
    const log = spy('log')
    withRequestId('req-1', () => logEvent('info', 'request', { route: '/v1/rpc', status: 200, duration_ms: 12 }))
    expect(log).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toEqual({
      level: 'info',
      event: 'request',
      requestId: 'req-1',
      route: '/v1/rpc',
      status: 200,
      duration_ms: 12,
    })
  })

  it('uses console.warn and console.error for those levels, and has no request id outside a request', () => {
    const warn = spy('warn')
    const err = spy('error')
    logEvent('warn', 'a')
    logEvent('error', 'b')
    expect(JSON.parse(String(warn.mock.calls[0]?.[0]))).toEqual({ level: 'warn', event: 'a' })
    expect(JSON.parse(String(err.mock.calls[0]?.[0]))).toEqual({ level: 'error', event: 'b' })
  })

  it('drops undefined fields and never writes an address, hash or push token', () => {
    const log = spy('log')
    logEvent('info', 'x', { a: undefined, b: `${ADDR} ${HASH} ${TOKEN}`, c: null })
    const line = String(log.mock.calls[0]?.[0])
    expect(JSON.parse(line)).toEqual({ level: 'info', event: 'x', b: '[address] [hash] [push-token]', c: null })
    expect(line).not.toContain('abab')
  })

  it('keeps the request id across awaits', async () => {
    const log = spy('log')
    await withRequestId('req-2', async () => {
      await new Promise((r) => setTimeout(r, 1))
      logEvent('info', 'later')
    })
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({ requestId: 'req-2' })
  })
})
