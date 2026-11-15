import { BALANCE_OF_SELECTOR, RPC_ALLOWED_METHODS, USDC_SEPOLIA, type RpcRequest } from '@vaultme/contracts'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { rpcAllowed } from '../src/rpc.ts'

// API-8 (docs/plans/quality-gates.md): property fuzz of the RPC allow-list. `rpcAllowed` is the only guard in front of the paid
// Infura and Alchemy keys. 500 runs per property, 0 counterexamples. Each property is also run against a copy of the rule with one
// hole added; the run must find a counterexample, so a property that cannot fail is caught here.
const RUNS = { numRuns: 500 }
const hex = (n: number) => fc.stringMatching(new RegExp(`^[0-9a-fA-F]{${String(n)}}$`))
const address = hex(40).map((h) => `0x${h}`)
const hash = hex(64).map((h) => `0x${h}`)
const json = fc.jsonValue()
const request = (method: string, params?: unknown[]): RpcRequest => ({ jsonrpc: '2.0', id: 1, method, params })
const caseOf = (s: string) =>
  fc.array(fc.boolean(), { minLength: s.length, maxLength: s.length }).map((f) =>
    s
      .split('')
      .map((ch, i) => (f[i] ? ch.toUpperCase() : ch.toLowerCase()))
      .join(''),
  )

const goodCall = (data: string, to = USDC_SEPOLIA) => ({ to, data: `${BALANCE_OF_SELECTOR}${data.padStart(64, '0')}` })

describe('rpcAllowed (property fuzz, 500 runs each)', () => {
  it('refuses every method that is not on the list, whatever the params', () => {
    const listed = new Set<string>(RPC_ALLOWED_METHODS)
    fc.assert(
      fc.property(
        fc.string().filter((m) => !listed.has(m)),
        fc.option(fc.array(json), { nil: undefined }),
        (method, params) => !rpcAllowed(request(method, params)),
      ),
      RUNS,
    )
  })

  it('refuses a method whose name is a listed one in another case or with padding', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...RPC_ALLOWED_METHODS),
        fc.constantFrom('', ' ', '\n', '\u0000'),
        fc.constantFrom('', ' ', '\n', '\u0000'),
        (method, pre, post) => {
          const name = `${pre}${method}${post}`
          return name === method || !rpcAllowed(request(name))
        },
      ),
      RUNS,
    )
    fc.assert(
      fc.property(
        fc.constantFrom(...RPC_ALLOWED_METHODS).chain(caseOf),
        (name) => (RPC_ALLOWED_METHODS as readonly string[]).includes(name) || !rpcAllowed(request(name)),
      ),
      RUNS,
    )
  })

  it('never throws, for any JSON params', () => {
    fc.assert(
      fc.property(fc.constantFrom(...RPC_ALLOWED_METHODS), fc.array(json), (method, params) => {
        expect(typeof rpcAllowed(request(method, params))).toBe('boolean')
      }),
      RUNS,
    )
  })

  describe('eth_call: only USDC balanceOf(address), one 32-byte argument', () => {
    const valid = fc
      .tuple(
        hex(40),
        caseOf(USDC_SEPOLIA),
        fc.option(fc.constantFrom('latest', 'finalized', '0x10'), { nil: undefined }),
      )
      .map(([arg, to, tag]) => request('eth_call', [goodCall(arg, to), ...(tag === undefined ? [] : [tag])]))

    it('accepts every valid shape, the contract address in any letter case (not vacuous)', () => {
      fc.assert(
        fc.property(valid, (r) => rpcAllowed(r)),
        RUNS,
      )
    })

    it('refuses another target', () => {
      fc.assert(
        fc.property(
          address.filter((a) => a.toLowerCase() !== USDC_SEPOLIA.toLowerCase()),
          hex(40),
          (to, arg) => !rpcAllowed(request('eth_call', [goodCall(arg, to), 'latest'])),
        ),
        RUNS,
      )
    })

    it('refuses any other data: another selector, a short or long argument, non-hex, a suffix', () => {
      const good = new RegExp(`^${BALANCE_OF_SELECTOR}[0-9a-fA-F]{64}$`)
      fc.assert(
        fc.property(
          fc
            .oneof(
              fc.string(),
              hex(8).map((s) => `0x${s}`),
              fc.tuple(hex(8), hex(80)).map(([s, a]) => `0x${s}${a}`),
              hex(63).map((a) => `${BALANCE_OF_SELECTOR}${a}`),
              hex(65).map((a) => `${BALANCE_OF_SELECTOR}${a}`),
              hex(64).map((a) => `${BALANCE_OF_SELECTOR}${a}\n`),
              hex(64).map((a) => `\n${BALANCE_OF_SELECTOR}${a}`),
            )
            .filter((d) => !good.test(d)),
          (data) => !rpcAllowed(request('eth_call', [{ to: USDC_SEPOLIA, data }, 'latest'])),
        ),
        RUNS,
      )
    })

    it('refuses an alias field, a state override (3rd param), extra params, and a call object with any extra key', () => {
      fc.assert(
        fc.property(
          valid,
          fc.oneof(
            fc.record({ kind: fc.constant('input'), value: hex(8) }),
            fc.record({ kind: fc.constant('override'), value: fc.dictionary(address, json) }),
            fc.record({ kind: fc.constant('extra'), value: json }),
          ),
          (r, add) => {
            const [tx, tag = 'latest'] = r.params as [Record<string, unknown>, string?]
            const params =
              add.kind === 'input'
                ? [{ ...tx, input: add.value }, tag]
                : add.kind === 'override'
                  ? [tx, tag, add.value]
                  : [tx, tag, ...[add.value, add.value]]
            return !rpcAllowed(request('eth_call', params))
          },
        ),
        RUNS,
      )
    })

    it('refuses a call without an object, or with a non-object first param', () => {
      fc.assert(
        fc.property(
          fc.array(json).filter((p) => typeof p[0] !== 'object' || p[0] === null || Array.isArray(p[0])),
          (params) => !rpcAllowed(request('eth_call', params)),
        ),
        RUNS,
      )
    })
  })

  describe('eth_getBlockByNumber: the body without transactions only', () => {
    it('accepts `false` as the second param, for any block tag', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constantFrom('latest', 'safe', 'finalized'),
            hex(6).map((h) => `0x${h}`),
          ),
          (tag) => rpcAllowed(request('eth_getBlockByNumber', [tag, false])),
        ),
        RUNS,
      )
    })

    it('refuses everything else as the second param, or none', () => {
      fc.assert(
        fc.property(
          fc.string(),
          json.filter((v) => v !== false),
          fc.boolean(),
          (tag, second, omit) => !rpcAllowed(request('eth_getBlockByNumber', omit ? [tag] : [tag, second])),
        ),
        RUNS,
      )
    })
  })

  describe('eth_getTransactionByHash: one 32-byte hash and nothing else', () => {
    it('accepts one hash, in any letter case', () => {
      fc.assert(
        fc.property(hash, (h) => rpcAllowed(request('eth_getTransactionByHash', [h]))),
        RUNS,
      )
    })

    it('refuses anything else: other strings, other lengths, extra params, no params', () => {
      const good = /^0x[0-9a-fA-F]{64}$/
      fc.assert(
        fc.property(
          fc.oneof(
            fc.array(json).filter((p) => !(p.length === 1 && typeof p[0] === 'string' && good.test(p[0]))),
            fc.tuple(hash, json).map(([h, extra]) => [h, extra]),
            hex(63).map((h) => [`0x${h}`]),
            hex(65).map((h) => [`0x${h}`]),
            hash.map((h) => [`${h}\n`]),
          ),
          (params) => !rpcAllowed(request('eth_getTransactionByHash', params)),
        ),
        RUNS,
      )
    })
  })

  // The properties above must be able to fail: each of these rules is `rpcAllowed` plus one hole, and a property has to find it.
  describe('the properties catch a hole', () => {
    const holes: [string, (r: RpcRequest) => boolean, () => void][] = [
      [
        'any eth_call target',
        (r) => rpcAllowed(r) || (r.method === 'eth_call' && r.params?.length === 2),
        () =>
          fc.assert(
            fc.property(
              address,
              hex(40),
              (to, arg) => !holes[0]![1](request('eth_call', [goodCall(arg, to), 'latest'])),
            ),
            RUNS,
          ),
      ],
      [
        'a state override',
        (r) => rpcAllowed({ ...r, params: r.method === 'eth_call' ? r.params?.slice(0, 2) : r.params }),
        () =>
          fc.assert(
            fc.property(hex(40), (arg) => !holes[1]![1](request('eth_call', [goodCall(arg), 'latest', { '0x1': {} }]))),
            RUNS,
          ),
      ],
      [
        'full transaction bodies',
        (r) => rpcAllowed(r) || (r.method === 'eth_getBlockByNumber' && r.params?.[1] === true),
        () =>
          fc.assert(
            fc.property(fc.constant('latest'), (t) => !holes[2]![1](request('eth_getBlockByNumber', [t, true]))),
            RUNS,
          ),
      ],
      [
        'extra hash params',
        (r) => rpcAllowed(r) || (r.method === 'eth_getTransactionByHash' && r.params?.length === 2),
        () =>
          fc.assert(
            fc.property(hash, (h) => !holes[3]![1](request('eth_getTransactionByHash', [h, 'x']))),
            RUNS,
          ),
      ],
    ]
    it.each(holes)('%s', (_name, _rule, property) => {
      expect(property).toThrow(/Property failed/)
    })
  })
})
