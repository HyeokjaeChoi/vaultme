// Spike #38: measure Etherscan V2 on Sepolia. Reads ETHERSCAN_API_KEY from an env file itself.
// Usage: node scripts/spikes/etherscan-sepolia.mjs <cmd> [k=v ...]
//   get k=v...            one call, prints status/latency/shape (list items truncated, key redacted)
//   dump file=PATH k=v... write the full redacted response body to PATH (use a scratch dir, not the repo)
//   latency n=20 k=v...   n sequential calls, prints p50/p95 (ms)
//   burst n=6 k=v...      n parallel calls, prints each status and message
//   fresh address=0x...   compare proxy eth_blockNumber with newest block seen in txlist
// Env file path: ETHERSCAN_ENV (default ~/.config/vaultme/etherscan.env). The key never leaves this process.
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'

const envPath = process.env.ETHERSCAN_ENV ?? `${homedir()}/.config/vaultme/etherscan.env`
const key = readFileSync(envPath, 'utf8').match(/^ETHERSCAN_API_KEY=(.+)$/m)?.[1]?.trim()
if (!key) throw new Error('ETHERSCAN_API_KEY missing in env file')
const redact = (s) => s.split(key).join('REDACTED')
const kv = (args) => Object.fromEntries(args.map((a) => [a.slice(0, a.indexOf('=')), a.slice(a.indexOf('=') + 1)]))

async function call(params) {
  const q = new URLSearchParams({ chainid: '11155111', ...params, apikey: key })
  const t = performance.now()
  const res = await fetch(`https://api.etherscan.io/v2/api?${q}`)
  const text = await res.text()
  const ms = Math.round(performance.now() - t)
  let body
  try { body = JSON.parse(redact(text)) } catch { body = { nonJson: redact(text).slice(0, 200) } }
  return { http: res.status, ms, body }
}
const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.ceil((p / 100) * xs.length) - 1)]
const out = (o) => console.log(redact(JSON.stringify(o, null, 1)))

const [cmd, ...rest] = process.argv.slice(2)
const { n: nStr, show: showStr, file, ...params } = kv(rest)
const n = Number(nStr ?? (cmd === 'burst' ? 6 : 20))
const show = Number(showStr ?? 2)

if (cmd === 'get') {
  const r = await call(params)
  const { result } = r.body
  const list = Array.isArray(result)
  out({ http: r.http, ms: r.ms, status: r.body.status, message: r.body.message,
    resultType: list ? 'array' : typeof result, count: list ? result.length : undefined,
    result: list ? result.slice(0, show) : result,
    last: list && result.length > show ? result[result.length - 1] : undefined })
} else if (cmd === 'dump') {
  const r = await call(params)
  writeFileSync(file, JSON.stringify(r.body))
  console.log(r.http, r.ms, r.body.status, r.body.message, Array.isArray(r.body.result) ? r.body.result.length : r.body.result)
} else if (cmd === 'latency') {
  const ms = []
  for (let i = 0; i < n; i++) { const r = await call(params); ms.push(r.ms); if (r.body.status !== '1') console.log('non-ok', r.body.message); await new Promise((r) => setTimeout(r, 400)) }
  out({ n, p50: pct(ms, 50), p95: pct(ms, 95), min: Math.min(...ms), max: Math.max(...ms) })
} else if (cmd === 'burst') {
  const rs = await Promise.all(Array.from({ length: n }, () => call(params)))
  out(rs.map((r) => ({ http: r.http, ms: r.ms, status: r.body.status, message: r.body.message, result: typeof r.body.result === 'string' ? r.body.result.slice(0, 160) : `array:${r.body.result?.length}` })))
} else if (cmd === 'fresh') {
  if (!/^0x[0-9a-fA-F]{40}$/.test(params.address ?? '')) { console.error('fresh needs address=0x<40 hex> (use a recently active one)'); process.exit(2) }
  const bn = async () => parseInt((await call({ module: 'proxy', action: 'eth_blockNumber' })).body.result, 16)
  const tip = await bn()
  const r = await call({ module: 'account', action: 'txlist', address: params.address, sort: 'desc', page: '1', offset: '1' })
  const top = r.body.result?.[0]
  const tip2 = await bn()
  out({ tipBefore: tip, tipAfter: tip2, newestTxBlock: top && Number(top.blockNumber), newestTxTime: top && new Date(top.timeStamp * 1000).toISOString(), now: new Date().toISOString() })
} else {
  console.error('usage: get|dump|latency|burst|fresh k=v...'); process.exit(2)
}
