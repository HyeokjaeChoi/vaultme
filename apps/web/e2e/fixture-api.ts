import { type Page, type Route } from '@playwright/test'

// The viewer against fixture answers: the default build calls the staging API (scripts/finalize.ts apiOrigin), and
// every request to it is answered here. Real data only in app code. No test reads balances from the real staging API
// yet (the web-staging smoke only checks the 404 page).
export const API = 'https://vaultme-api-staging.gurwo1007.workers.dev'
export const A = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'

type Mode = 'ok' | 'down' | 'big'
/** History answers: `list` = 12 rows then 3 more (cursor p2), `empty`, `down` (503), `big` = one row with a 25-digit amount. */
export type HistoryMode = 'list' | 'empty' | 'down' | 'big'

const ME = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const PEER = [
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
]
const hex = (n: number) => `0x${n.toString(16).padStart(64, '0')}`
// An HistoryItem of the API contract (packages/contracts). `age` in seconds; newest first.
const mkTx = (n: number, age: number, o: Record<string, unknown> = {}) => ({
  id: `${hex(n)}:0`,
  kind: 'native',
  hash: hex(n),
  blockNumber: 7_000_000 - n,
  txIndex: 0,
  timestamp: Math.floor(Date.now() / 1000) - age,
  direction: n % 2 ? 'in' : 'out',
  asset: 'ETH',
  value: '50000000000000000',
  from: n % 2 ? PEER[n % 3] : ME,
  to: n % 2 ? ME : PEER[n % 3],
  status: 'ok',
  zeroValue: false,
  ...o,
})
const DAY = 86_400
const FIRST_PAGE = [
  mkTx(1, 180), // +0.05 ETH, 3 minutes ago
  mkTx(2, 720, { value: '20000000000000000' }), // -0.02 ETH
  mkTx(3, DAY + 3600, { asset: 'USDC', kind: 'erc20', value: '7500000' }), // +7.5 USDC, yesterday (not the 12.5 of the balance: balance specs match text)
  mkTx(4, 14 * DAY, { asset: 'USDC', kind: 'erc20', value: '1000000', status: 'failed' }), // failed send
  mkTx(5, 16 * DAY, { value: '10000000000000000' }),
  mkTx(6, 17 * DAY),
  mkTx(7, 18 * DAY),
  mkTx(8, 19 * DAY),
  mkTx(9, 20 * DAY),
  mkTx(10, 21 * DAY),
  mkTx(11, 22 * DAY, { zeroValue: true, value: '0', direction: 'in' }), // address poisoning: the page must not show it
  mkTx(12, 23 * DAY),
]
const SECOND_PAGE = [mkTx(13, 30 * DAY), mkTx(14, 31 * DAY), mkTx(15, 32 * DAY)]

/** The transaction answers: `ok` = 0.05 ETH 3 minutes ago, `usdc` = a 12.5 USDC transfer, `failed` = reverted, `unknown` = no such tx, `pending` = no block yet, `down` = 503. */
export type TxMode = 'ok' | 'usdc' | 'failed' | 'unknown' | 'pending' | 'down'
export const TX = hex(0x8f3b) // the hash of every fixture transaction answer
const SENDER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

export async function fixtureApi(page: Page) {
  const api = {
    mode: 'ok' as Mode,
    history: 'list' as HistoryMode,
    hold: null as Promise<void> | null,
    holdHistory: null as Promise<void> | null,
    tx: 'ok' as TxMode,
    holdTx: null as Promise<void> | null,
    historyCursors: [] as (string | undefined)[],
    registers: 0,
    requests: [] as { path: string; headers: Record<string, string> }[],
  }
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }
  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) })
  await page.route(`${API}/**`, async (route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const path = new URL(req.url()).pathname
    api.requests.push({ path, headers: req.headers() })
    if (path === '/v1/installs') {
      api.registers++
      return json(route, 201, { installId: crypto.randomUUID() })
    }
    if (path === '/v1/installs/token')
      return json(route, 200, { token: 'tok', expiresAt: Math.floor(Date.now() / 1000) + 900 })
    if (path === '/v1/history') {
      const { cursor } = req.postDataJSON() as { cursor?: string }
      api.historyCursors.push(cursor)
      await api.holdHistory
      if (api.history === 'down') return json(route, 503, { code: 'unavailable', message: 'x', retryable: true })
      const page = (items: unknown[], nextCursor: string | null) => ({ items, nextCursor, incomplete: false })
      if (api.history === 'empty') return json(route, 200, page([], null))
      if (api.history === 'big')
        return json(route, 200, page([mkTx(1, 180, { value: '1000000000000000000000000000000' })], null))
      return json(route, 200, cursor === 'p2' ? page(SECOND_PAGE, null) : page(FIRST_PAGE, 'p2'))
    }
    const body = req.postDataJSON() as { id: number; method: string; params: unknown[] }
    if (
      ['eth_getTransactionByHash', 'eth_getTransactionReceipt', 'eth_getBlockByNumber'].includes(body.method) &&
      body.params[0] !== 'latest'
    ) {
      await api.holdTx
      if (api.tx === 'down') return json(route, 503, { code: 'unavailable', message: 'x', retryable: true })
      const to = api.tx === 'usdc' ? USDC : ME
      const input =
        api.tx === 'usdc'
          ? `0xa9059cbb${SENDER.slice(2).toLowerCase().padStart(64, '0')}${(12_500_000).toString(16).padStart(64, '0')}`
          : '0x'
      const result =
        body.method === 'eth_getTransactionByHash'
          ? api.tx === 'unknown'
            ? null
            : {
                hash: body.params[0],
                from: SENDER,
                to,
                value: api.tx === 'usdc' ? '0x0' : '0xb1a2bc2ec50000',
                input,
                blockNumber: '0x713a27',
              }
          : body.method === 'eth_getTransactionReceipt'
            ? api.tx === 'unknown' || api.tx === 'pending'
              ? null
              : {
                  status: api.tx === 'failed' ? '0x0' : '0x1',
                  gasUsed: '0x5208',
                  effectiveGasPrice: '0x3b9aca00',
                  blockNumber: '0x713a27',
                  transactionHash: body.params[0],
                }
            : { number: '0x713a27', timestamp: `0x${(Math.floor(Date.now() / 1000) - 180).toString(16)}` }
      return json(route, 200, { jsonrpc: '2.0', id: body.id, result })
    }
    if (api.mode === 'down') return json(route, 503, { code: 'unavailable', message: 'x', retryable: true })
    await api.hold
    const { id, method } = body
    const big = api.mode === 'big' // 10^24 ETH and 10^24 USDC: far above any supply, wider than the card at 375 px
    const result =
      method === 'eth_getBalance'
        ? big
          ? '0xb7abc627050305adf14a3d9e40000000000'
          : '0x11d448f27b93c000'
        : big
          ? '0xc9f2c9cd04674edea40000000'
          : '0xbebc20' // 1.284732 ETH, 12.5 USDC
    return json(route, 200, { jsonrpc: '2.0', id, result })
  })
  return api
}
