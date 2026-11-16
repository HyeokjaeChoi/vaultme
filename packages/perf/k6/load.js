// k6 load test of the staging API at the edge of its rate limits (ADR-0045, gate LOAD-1). Staging only, inside the free tiers:
// the call budget is in ADR-0045 and packages/perf/README.md.
//   k6 run -e BASE_URL=<staging worker url> [-e APP_VERSION=<x.y.z>] [-e OUT_DIR=<dir>] packages/perf/k6/load.js
//
// 20 VUs at 2 req/s hold up to 8 s per request (the timeout; both upstreams hanging answer 503 after about 5.1 s). All VUs are pre-allocated: k6 drops an iteration while it starts a VU, and a dropped iteration fails the run.
// One runner IP, so the scenarios run one after the other and the IP probes go last (they use up the IP budget for 60 s):
//   steady         2 req/s for 3 min, 360 `POST /v1/rpc` over 3 installs (each install gets every 3rd request: 40 per minute, limit 60)
//   install_probe  2 req/s for 1 min on one install, 65 s after `steady`: the limit of 60 per 60 s must answer 429
//   ip_probe_rpc, ip_probe_history  7.5 req/s for 1 min each, no token: the IP limit of 300 per 60 s must answer 429, never 2xx
// Exit codes: 99 a threshold failed (our bug: a server bug aborts the run; every other threshold fails it at the end), 108 the run aborted because an upstream is down (not a failure).
import exec from 'k6/execution'
import http from 'k6/http'
import { Counter, Rate, Trend } from 'k6/metrics'
import { classify, loadMarkdown, loadResults, summarizeLoad, thresholds } from '../src/load.ts'
import { newInstall, serverTimingMs } from './lib.js'

const BASE_URL = (__ENV.BASE_URL || '').replace(/\/+$/, '')
if (!BASE_URL) throw new Error('set BASE_URL (see packages/perf/README.md)')
const APP_VERSION = __ENV.APP_VERSION || '0.1.0'
const OUT_DIR = (__ENV.OUT_DIR || '.').replace(/\/+$/, '')
// Public test-vector address of the repo (apps/web/e2e/fixture-api.ts): a Sepolia address with real history, not a user.
const ADDRESS = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
// Registration is limited to 3 per 60 s and IP (INSTALL_IP_LIMITER): the run uses exactly 3, in setup().
const INSTALLS = 3
// The quota guard: an upstream that answers 503 `unavailable` to more than this share of the steady requests stops the test.
const UNAVAILABLE_SHARE = 0.2
const UNAVAILABLE_MIN_REQUESTS = 10

const probe = (rate, startTime, fn) => ({
  executor: 'constant-arrival-rate',
  rate,
  timeUnit: '2s',
  duration: '1m',
  startTime,
  preAllocatedVUs: 30,
  maxVUs: 30,
  exec: fn,
})

export const options = {
  scenarios: {
    steady: {
      executor: 'constant-arrival-rate',
      rate: 2,
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 20,
      maxVUs: 20,
      exec: 'steady',
    },
    install_probe: {
      executor: 'constant-arrival-rate',
      rate: 2,
      timeUnit: '1s',
      duration: '1m',
      startTime: '4m5s',
      preAllocatedVUs: 20,
      maxVUs: 20,
      exec: 'installProbe',
    },
    // 15 per 2 s = 7.5 per s = 450 in 60 s, 1.5 times the IP limit of 300.
    ip_probe_rpc: probe(15, '6m10s', 'ipProbeRpc'),
    ip_probe_history: probe(15, '6m10s', 'ipProbeHistory'),
  },
  thresholds: thresholds(),
}

const serverBug = new Counter('server_bug')
const unexpected = new Counter('unexpected')
const steadyRequests = new Counter('steady_requests')
const unavailable503 = new Counter('unavailable_503')
const limitContract = new Rate('limit_contract')
const probeSent = new Counter('probe_sent')
const probeHits = new Counter('probe_hits')
const okOwn = new Trend('ok_own', true)
const ownN = new Counter('own_n')

export async function setup() {
  const tokens = []
  for (let i = 0; i < INSTALLS; i++) tokens.push((await newInstall(BASE_URL, APP_VERSION)).token)
  return { tokens }
}

const RPC_BODY = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] })
const HISTORY_BODY = JSON.stringify({ address: ADDRESS })

function send(path, body, token) {
  const headers = { 'X-App-Version': APP_VERSION, 'X-Client': 'web', 'content-type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return http.post(`${BASE_URL}${path}`, body, { headers, timeout: '8s' })
}

// The `code` of an error body, or null (a 200 is not parsed, and a body that is not JSON has none).
function errorCode(res) {
  if (res.status === 200) return null
  try {
    return res.json('code') ?? null
  } catch {
    return null
  }
}

// Every response goes through here: our bugs and the 429 contract count in every scenario.
function judge(res) {
  const r = classify(res.status, res.headers['Retry-After'], errorCode(res))
  if (r.verdict === 'server_bug') {
    serverBug.add(1)
    console.error(`server bug: HTTP ${res.status} ${res.body ? String(res.body).slice(0, 200) : ''}`)
  }
  if (r.verdict === 'rate_limited') limitContract.add(r.contract)
  return r.verdict
}

// Per VU: 503 `unavailable` answers among the steady requests it sent.
let sent = 0
let down = 0

export function steady(data) {
  const token = data.tokens[exec.scenario.iterationInTest % data.tokens.length]
  const res = send('/v1/rpc', RPC_BODY, token)
  const verdict = judge(res)
  steadyRequests.add(1)
  if (verdict === 'ok') {
    const worker = serverTimingMs(res.headers['Server-Timing'], 'total')
    const upstream = serverTimingMs(res.headers['Server-Timing'], 'upstream')
    if (worker !== null && upstream !== null) {
      okOwn.add(Math.max(0, worker - upstream))
      ownN.add(1)
    }
  } else if (verdict === 'unavailable') {
    unavailable503.add(1)
    down++
  } else if (verdict !== 'server_bug') {
    unexpected.add(1)
    console.error(`steady: HTTP ${res.status} ${res.error_code || ''}`)
  }
  sent++
  if (sent >= UNAVAILABLE_MIN_REQUESTS && down / sent > UNAVAILABLE_SHARE)
    exec.test.abort(`upstream down: ${down} of ${sent} steady requests of this VU got 503 unavailable`)
}

export function installProbe(data) {
  probeSent.add(1, { probe: 'install' })
  const verdict = judge(send('/v1/rpc', RPC_BODY, data.tokens[0]))
  if (verdict === 'ok') probeHits.add(1, { kind: 'install_200' })
  if (verdict === 'rate_limited') probeHits.add(1, { kind: 'install_429' })
}

// No token: the IP limiter runs before the token check, so the answer is 401 until the limit and 429 after it.
function ipProbe(name, path, body) {
  probeSent.add(1, { probe: name })
  const res = send(path, body)
  const verdict = judge(res)
  if (res.status >= 200 && res.status < 300) probeHits.add(1, { kind: `${name}_2xx` })
  if (verdict === 'rate_limited') probeHits.add(1, { kind: `${name}_429` })
}
export const ipProbeRpc = () => ipProbe('ip_rpc', '/v1/rpc', RPC_BODY)
export const ipProbeHistory = () => ipProbe('ip_history', '/v1/history', HISTORY_BODY)

export function handleSummary(data) {
  const summary = summarizeLoad(data, new Date().toISOString())
  let md
  try {
    md = loadMarkdown(loadResults(summary))
  } catch (e) {
    md = `No result: ${e.message}\n`
  }
  return {
    [`${OUT_DIR}/k6-load.json`]: JSON.stringify(summary, null, 2),
    [`${OUT_DIR}/k6-load.md`]: md,
    stdout: md,
  }
}
