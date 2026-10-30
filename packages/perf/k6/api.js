// k6 benchmark of the VaultMe API (ADR-0019). Run it with `MODE=warm` and again with `MODE=cold`; see packages/perf/README.md.
//   k6 run -e BASE_URL=<worker url> -e MODE=warm|cold [-e APP_VERSION=<x.y.z>] [-e OUT_DIR=<dir>] packages/perf/k6/api.js
//
// MODE=warm: connections are reused (keep-alive). MODE=cold: `noConnectionReuse`, a new TCP + TLS connection for every request.
// k6 sets `noConnectionReuse` for a whole run, not per scenario, so the two modes are two runs.
// Per endpoint: 1 untimed warm-up request, then the timed requests. Only 200 responses count as latency; others count as errors.
import { check, sleep } from 'k6'
import { b64encode } from 'k6/encoding'
import http from 'k6/http'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = (__ENV.BASE_URL || '').replace(/\/+$/, '')
const MODE = __ENV.MODE
if (!BASE_URL || (MODE !== 'warm' && MODE !== 'cold'))
  throw new Error('set BASE_URL and MODE=warm|cold (see packages/perf/README.md)')
const APP_VERSION = __ENV.APP_VERSION || '0.1.0'
const OUT_DIR = (__ENV.OUT_DIR || '.').replace(/\/+$/, '')
// Public test-vector address of the repo (apps/web/e2e/fixture-api.ts): a Sepolia address with real history, not a user.
const ADDRESS = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
// Empty-body hash of the signed token request (packages/api-client/src/client.ts).
const EMPTY_BODY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

// Calls per case (ADR-0019): at most 1 token + 31 rpc + 21 history = 53 per install, under the limit of 60 per 60 s.
const N_HEALTH = 30
const N_RPC = 30
const N_HISTORY_HIT = 15
const N_HISTORY_MISS = 5
// Longer than the 30 s page cache of the Worker (apps/api/src/etherscan.ts): a miss call reaches Etherscan (3 calls each).
const HISTORY_MISS_GAP_S = 31

export const options = {
  noConnectionReuse: MODE === 'cold',
  tags: { mode: MODE },
  // Sequential: each scenario starts after the earlier one is done (with slack for a slow network).
  scenarios: {
    health: { executor: 'per-vu-iterations', vus: 1, iterations: N_HEALTH + 1, exec: 'health', startTime: '0s' },
    rpc: { executor: 'per-vu-iterations', vus: 1, iterations: N_RPC + 1, exec: 'rpc', startTime: '45s' },
    history: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      exec: 'history',
      startTime: '110s',
      maxDuration: '10m',
    },
  },
  summaryTrendStats: ['min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  thresholds: {},
}

const ENDPOINTS = ['health', 'rpc', 'history_hit', 'history_miss']
// k6 keeps a sub-metric only when a threshold names it, so every case gets one that always passes (collect only, no limit).
for (const e of ENDPOINTS) {
  for (const m of ['total', 'duration', 'dns', 'connecting', 'tls', 'waiting'])
    options.thresholds[`ok_${m}{endpoint:${e}}`] = ['max>=0']
  options.thresholds[`call_ok{endpoint:${e}}`] = ['rate>=0']
}

// total = DNS + TCP + TLS + request + response: what a client waits. k6 `http_req_duration` leaves out DNS, TCP and TLS, so
// it equals total on a reused connection and is much lower on a new one.
const T = {
  total: new Trend('ok_total', true),
  duration: new Trend('ok_duration', true),
  dns: new Trend('ok_dns', true),
  connecting: new Trend('ok_connecting', true),
  tls: new Trend('ok_tls', true),
  waiting: new Trend('ok_waiting', true),
}
const callOk = new Rate('call_ok')

const b64u = (buf) => b64encode(buf, 'rawurl')

// Registers one temporary install and gets a token, as the app does (a key made in memory, nothing stored).
export async function setup() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const publicKey = b64u(await crypto.subtle.exportKey('raw', pair.publicKey))
  const base = { 'X-App-Version': APP_VERSION, 'X-Client': 'web' }
  const reg = http.post(`${BASE_URL}/v1/installs`, JSON.stringify({ publicKey }), {
    headers: { ...base, 'content-type': 'application/json' },
    tags: { setup: 'register' },
  })
  if (reg.status !== 201) throw new Error(`register failed: HTTP ${reg.status}`)
  const installId = reg.json('installId')
  const ts = Math.floor(Date.now() / 1000)
  const nonce = b64u(crypto.getRandomValues(new Uint8Array(16)).buffer)
  const canonical = ['vaultme-v1', 'POST', '/v1/installs/token', installId, String(ts), nonce, EMPTY_BODY_SHA256].join(
    '\n',
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    pair.privateKey,
    new TextEncoder().encode(canonical),
  )
  const tok = http.post(`${BASE_URL}/v1/installs/token`, null, {
    headers: {
      ...base,
      'X-Install-Id': installId,
      'X-Timestamp': String(ts),
      'X-Nonce': nonce,
      'X-Signature': b64u(sig),
    },
    tags: { setup: 'token' },
  })
  if (tok.status !== 200) throw new Error(`token failed: HTTP ${tok.status}`)
  return { token: tok.json('token') }
}

// `timed` false is the warm-up: sent, not recorded.
function call(name, timed, method, path, token, body) {
  const headers = { 'X-App-Version': APP_VERSION, 'X-Client': 'web' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['content-type'] = 'application/json'
  const res = http.request(method, `${BASE_URL}${path}`, body, {
    headers,
    timeout: '10s',
    tags: { endpoint: name, timed: String(timed) },
  })
  const ok = check(res, { [`${name} 200`]: (r) => r.status === 200 })
  if (!timed) return res
  const tags = { endpoint: name }
  callOk.add(ok, tags)
  if (ok) {
    const t = res.timings
    T.total.add(t.looking_up + t.connecting + t.tls_handshaking + t.duration, tags)
    T.duration.add(t.duration, tags)
    T.dns.add(t.looking_up, tags)
    T.connecting.add(res.timings.connecting, tags)
    T.tls.add(res.timings.tls_handshaking, tags)
    T.waiting.add(res.timings.waiting, tags)
  } else {
    console.error(`${name}: HTTP ${res.status} ${res.error_code || ''}`)
  }
  return res
}

export function health() {
  // The first iteration (__ITER 0) is the warm-up.
  call('health', __ITER > 0, 'GET', '/v1/health')
}

export function rpc(data) {
  const body = JSON.stringify({ jsonrpc: '2.0', id: __ITER + 1, method: 'eth_blockNumber', params: [] })
  call('rpc', __ITER > 0, 'POST', '/v1/rpc', data.token, body)
}

// One iteration holds the whole sequence, so the cache state is known at every request:
// the warm-up misses (and fills the cache), the next requests hit it, then each later request waits out the 30 s cache and misses.
export function history(data) {
  const body = JSON.stringify({ address: ADDRESS })
  call('history_miss', false, 'POST', '/v1/history', data.token, body)
  for (let i = 0; i < N_HISTORY_HIT; i++) call('history_hit', true, 'POST', '/v1/history', data.token, body)
  for (let i = 0; i < N_HISTORY_MISS; i++) {
    sleep(HISTORY_MISS_GAP_S)
    call('history_miss', true, 'POST', '/v1/history', data.token, body)
  }
}

const v = (data, name) => {
  const m = data.metrics[name]
  return m ? m.values : null
}
const ms = (x) => (x === undefined || x === null ? null : Math.round(x * 100) / 100)
const trend = (x) =>
  x
    ? { min: ms(x.min), p50: ms(x.med), p90: ms(x['p(90)']), p95: ms(x['p(95)']), p99: ms(x['p(99)']), max: ms(x.max) }
    : null

/** Pure: the k6 end-of-test data to the compact result of one mode. */
export function summarize(data) {
  const endpoints = {}
  for (const e of ENDPOINTS) {
    const rate = v(data, `call_ok{endpoint:${e}}`)
    const ok = rate ? rate.passes : 0
    const failed = rate ? rate.fails : 0
    endpoints[e] = {
      calls: ok + failed,
      ok,
      errorRate: ok + failed === 0 ? null : failed / (ok + failed),
      total: trend(v(data, `ok_total{endpoint:${e}}`)),
      duration: trend(v(data, `ok_duration{endpoint:${e}}`)),
      dns: trend(v(data, `ok_dns{endpoint:${e}}`)),
      connecting: trend(v(data, `ok_connecting{endpoint:${e}}`)),
      tls: trend(v(data, `ok_tls{endpoint:${e}}`)),
      waiting: trend(v(data, `ok_waiting{endpoint:${e}}`)),
    }
  }
  return { mode: MODE, measuredAt: new Date().toISOString(), address: ADDRESS, endpoints }
}

const cell = (x) => (x === null || x === undefined ? 'n/a' : String(x))
function markdown(r) {
  const rows = Object.entries(r.endpoints).map(([name, e]) => {
    const d = e.total
    return `| \`${name}\` | ${r.mode} | ${e.ok} / ${e.calls} | ${cell(d?.p50)} | ${cell(d?.p90)} | ${cell(d?.p95)} | ${cell(d?.p99)} | ${cell(d?.max)} | ${cell(e.dns?.p50)} | ${cell(e.connecting?.p50)} | ${cell(e.tls?.p50)} | ${cell(e.waiting?.p50)} | ${cell(e.waiting?.p95)} |`
  })
  return [
    `| Endpoint | Mode | ok / sent | p50 | p90 | p95 | p99 | max | DNS p50 | connect p50 | TLS p50 | TTFB p50 | TTFB p95 |`,
    `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
    ...rows,
    '',
    'Times in ms. Only HTTP 200 responses are timed. p50 to max = total (DNS + TCP + TLS + request + response). TTFB = `http_req_waiting`.',
    '',
  ].join('\n')
}

export function handleSummary(data) {
  const r = summarize(data)
  const md = markdown(r)
  return {
    [`${OUT_DIR}/k6-api-${MODE}.json`]: JSON.stringify(r, null, 2),
    [`${OUT_DIR}/k6-api-${MODE}.md`]: md,
    stdout: md,
  }
}
