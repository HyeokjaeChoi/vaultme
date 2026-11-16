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

// The refusal properties, run against any rule. The real rule must pass them; the same properties must fail on `rpcAllowed` plus one
// hole (see the last block), so a property that cannot fail is caught.
const validCall = fc
  .tuple(hex(40), caseOf(USDC_SEPOLIA), fc.option(fc.constantFrom('latest', 'finalized', '0x10'), { nil: undefined }))
  .map(([arg, to, tag]) => request('eth_call', [goodCall(arg, to), ...(tag === undefined ? [] : [tag])]))
const refusals = (allowed: (r: RpcRequest) => boolean): Record<string, () => void> => ({
  'eth_call: another target': () => {
    fc.assert(
      fc.property(
        address.filter((a) => a.toLowerCase() !== USDC_SEPOLIA.toLowerCase()),
        hex(40),
        (to, arg) => !allowed(request('eth_call', [goodCall(arg, to), 'latest'])),
      ),
      RUNS,
    )
  },
  'eth_call: any other data': () => {
    const good = new RegExp(`^${BALANCE_OF_SELECTOR}[0-9a-fA-F]{64}$`)
    fc.assert(
      fc.property(
        fc
          .oneof(
            fc.string(),
            hex(8).map((s) => `0x${s}`),
            fc.tuple(hex(8), hex(80)).map(([s, a]) => `0x${s}${a}`),
            fc
              .tuple(
                hex(8).filter((x) => `0x${x}` !== BALANCE_OF_SELECTOR),
                hex(64),
              )
              .map(([x, arg]) => `0x${x}${arg}`),
            hex(63).map((a) => `${BALANCE_OF_SELECTOR}${a}`),
            hex(65).map((a) => `${BALANCE_OF_SELECTOR}${a}`),
            hex(64).map((a) => `${BALANCE_OF_SELECTOR}${a}\n`),
            hex(64).map((a) => `\n${BALANCE_OF_SELECTOR}${a}`),
          )
          .filter((d) => !good.test(d)),
        (data) => !allowed(request('eth_call', [{ to: USDC_SEPOLIA, data }, 'latest'])),
      ),
      RUNS,
    )
  },
  'eth_call: an input alias, a state override, extra params': () => {
    const valid = validCall
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
          return !allowed(request('eth_call', params))
        },
      ),
      RUNS,
    )
  },
  'eth_call: no object as the first param': () => {
    fc.assert(
      fc.property(
        fc.array(json).filter((p) => typeof p[0] !== 'object' || p[0] === null || Array.isArray(p[0])),
        (params) => !allowed(request('eth_call', params)),
      ),
      RUNS,
    )
  },
  'eth_getBlockByNumber: anything but false as the second param': () => {
    fc.assert(
      fc.property(
        fc.string(),
        json.filter((v) => v !== false),
        fc.boolean(),
        (tag, second, omit) => !allowed(request('eth_getBlockByNumber', omit ? [tag] : [tag, second])),
      ),
      RUNS,
    )
  },
  'eth_getTransactionByHash: anything but one 32-byte hash': () => {
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
        (params) => !allowed(request('eth_getTransactionByHash', params)),
      ),
      RUNS,
    )
  },
})

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

  it('refuses a call with no params at all, for the three methods that have argument rules', () => {
    for (const method of ['eth_call', 'eth_getBlockByNumber', 'eth_getTransactionByHash'])
      expect(rpcAllowed(request(method, undefined))).toBe(false)
  })

  it('never throws, for any JSON params', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...RPC_ALLOWED_METHODS),
        fc.option(fc.array(json), { nil: undefined }),
        (method, params) => {
          expect(typeof rpcAllowed(request(method, params))).toBe('boolean')
        },
      ),
      RUNS,
    )
  })

  describe('eth_call: only USDC balanceOf(address), one 32-byte argument', () => {
    const valid = validCall

    it('accepts every valid shape, the contract address in any letter case (not vacuous)', () => {
      fc.assert(
        fc.property(valid, (r) => rpcAllowed(r)),
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
  })

  describe('eth_getTransactionByHash: one 32-byte hash and nothing else', () => {
    it('accepts one hash, in any letter case', () => {
      fc.assert(
        fc.property(hash, (h) => rpcAllowed(request('eth_getTransactionByHash', [h]))),
        RUNS,
      )
    })
  })

  // Real rule: every refusal property holds.
  it.each(Object.entries(refusals(rpcAllowed)))('refuses %s', (_name, property) => {
    property()
  })

  // Each of these rules is `rpcAllowed` plus one hole. The same refusal property must find a counterexample.
  const hasInput = (r: RpcRequest) => isCall(r) && 'input' in (r.params?.[0] as object)
  const withoutInput = (r: RpcRequest): RpcRequest => {
    const tx = Object.fromEntries(Object.entries(r.params?.[0] as object).filter(([k]) => k !== 'input'))
    return { ...r, params: [tx, ...(r.params?.slice(1) ?? [])] }
  }
  const isCall = (r: RpcRequest) => r.method === 'eth_call' && typeof r.params?.[0] === 'object' && r.params[0] !== null
  const holes: [string, (r: RpcRequest) => boolean, string][] = [
    [
      'any eth_call target',
      (r) => rpcAllowed(r) || (r.method === 'eth_call' && r.params?.length === 2),
      'eth_call: another target',
    ],
    [
      'a state override',
      (r) => rpcAllowed({ ...r, params: r.method === 'eth_call' ? r.params?.slice(0, 2) : r.params }),
      'eth_call: an input alias, a state override, extra params',
    ],
    [
      'the input alias',
      (r) => rpcAllowed(hasInput(r) ? withoutInput(r) : r),
      'eth_call: an input alias, a state override, extra params',
    ],
    [
      'any 4-byte selector',
      (r) =>
        rpcAllowed(r) ||
        (isCall(r) &&
          (r.params?.[0] as { to?: string }).to === USDC_SEPOLIA &&
          /^0x[0-9a-f]{72}$/i.test(String((r.params?.[0] as { data?: unknown }).data))),
      'eth_call: any other data',
    ],
    [
      'other data after the selector',
      (r) =>
        rpcAllowed(r) ||
        (isCall(r) &&
          typeof (r.params?.[0] as { data?: unknown }).data === 'string' &&
          (r.params?.[0] as { data: string }).data.startsWith(BALANCE_OF_SELECTOR) &&
          (r.params?.[0] as { to?: string }).to === USDC_SEPOLIA),
      'eth_call: any other data',
    ],
    [
      'full transaction bodies',
      (r) => rpcAllowed(r) || (r.method === 'eth_getBlockByNumber' && r.params?.[1] === true),
      'eth_getBlockByNumber: anything but false as the second param',
    ],
    [
      'extra hash params',
      (r) => rpcAllowed(r) || (r.method === 'eth_getTransactionByHash' && r.params?.length === 2),
      'eth_getTransactionByHash: anything but one 32-byte hash',
    ],
  ]
  it.each(holes)('catches the hole: %s', (_name, rule, property) => {
    expect(refusals(rule)[property]).toThrow(/Property failed/)
  })
})
