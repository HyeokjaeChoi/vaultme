import { describe, expect, it } from 'vitest'
import { scrubBreadcrumb, scrubEvent, scrubString } from '../src/scrub.ts'

// Fake values only. The phrase is the public BIP39 test vector (R10 allows it).
const ADDR = '0x' + 'ab'.repeat(20)
const HASH = '0x' + '11'.repeat(32)
const PHRASE = [...Array<string>(11).fill('abandon'), 'about'].join(' ')
const TOKEN = 'ExponentPushToken[abcdefghijklmnop]'

describe('scrubString', () => {
  it('removes an address, a tx hash, a bare 64-hex key, a push token and a 12-word phrase', () => {
    const s = scrubString(`to ${ADDR} tx ${HASH} key ${'cd'.repeat(32)} ${TOKEN} words (${PHRASE}) end`)
    expect(s).toBe('to [address] tx [hash] key [hash] [push-token] words ([phrase]) end')
  })

  it('removes a 24-word phrase and an address in either case', () => {
    expect(scrubString([...Array<string>(23).fill('abandon'), 'art'].join(' '))).toBe('[phrase]')
    expect(scrubString('0x' + 'AB'.repeat(20))).toBe('[address]')
  })

  it('removes long hex data as a hash, and does not cut an address out of it', () => {
    expect(scrubString('0x' + 'a'.repeat(100))).toBe('[hash]')
    expect(scrubString('0x' + 'a'.repeat(50))).toBe('0x' + 'a'.repeat(50)) // not an address, hash or key length
  })

  it('keeps ordinary text, short hex and short word runs', () => {
    for (const s of [
      'expo 502',
      'invalid MIN_APP_VERSION',
      '0x1234',
      'a b c d e f g h i j k l',
      'one two three four',
    ]) {
      expect(scrubString(s)).toBe(s)
    }
  })
})

describe('nested values', () => {
  it('scrubs strings at any depth, in arrays and objects, and passes other values through', () => {
    expect(scrubEvent({ extra: { a: [ADDR, 1, { b: HASH, c: null, d: true }] } })).toEqual({
      extra: { a: ['[address]', 1, { b: '[hash]', c: null, d: true }] },
    })
  })

  it('stops at a depth limit instead of looping on a cycle', () => {
    const a: Record<string, unknown> = { s: ADDR }
    a.self = a
    expect(JSON.stringify(scrubEvent({ extra: a }))).toContain('[address]')
  })
})

describe('scrubEvent', () => {
  it('drops the user and the request body, query, cookies and headers, and keeps method and path', () => {
    const e = scrubEvent({
      user: { ip_address: '1.2.3.4' },
      message: `failed for ${ADDR}`,
      exception: { values: [{ type: 'Error', value: `tx ${HASH}` }] },
      extra: { token: TOKEN },
      request: {
        method: 'POST',
        url: `https://api.example/v1/history?address=${ADDR}#x`,
        query_string: `address=${ADDR}`,
        data: { address: ADDR },
        cookies: { a: 'b' },
        headers: { authorization: 'Bearer x' },
      },
    })
    expect(e).toEqual({
      message: 'failed for [address]',
      exception: { values: [{ type: 'Error', value: 'tx [hash]' }] },
      extra: { token: '[push-token]' },
      request: { method: 'POST', url: 'https://api.example/v1/history' },
    })
  })

  it('works on an event without a request', () => {
    expect(scrubEvent({ message: 'x' })).toEqual({ message: 'x' })
  })

  it('keeps a url it cannot parse, without its query', () => {
    expect(scrubEvent({ request: { url: `/v1/history?a=${ADDR}` } })).toEqual({ request: { url: '/v1/history' } })
  })
})

describe('scrubBreadcrumb', () => {
  it('keeps only the path of a network breadcrumb url', () => {
    expect(
      scrubBreadcrumb({ category: 'fetch', data: { url: `https://api.example/v1/rpc?k=${ADDR}`, status_code: 200 } }),
    ).toEqual({ category: 'fetch', data: { url: '/v1/rpc', status_code: 200 } })
  })

  it('scrubs the message of any other breadcrumb', () => {
    expect(scrubBreadcrumb({ category: 'console', message: `sent ${HASH}` })).toEqual({
      category: 'console',
      message: 'sent [hash]',
    })
  })

  it('keeps the path of a relative url too', () => {
    expect(scrubBreadcrumb({ category: 'xhr', data: { url: `/v1/rpc?k=${ADDR}` } })).toEqual({
      category: 'xhr',
      data: { url: '/v1/rpc' },
    })
  })

  it('leaves a network breadcrumb without a url data alone', () => {
    expect(scrubBreadcrumb({ category: 'xhr' })).toEqual({ category: 'xhr' })
  })
})
