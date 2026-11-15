// Release gate (CHAIN-1, ADR-0040): after the funded flows of one platform, check the chain, not only the UI text.
// Usage: tsx scripts/release-verify.mts snapshot a|b   before the flows: stores the sender's nonce and the block number
//        tsx scripts/release-verify.mts verify a|b     after the flows: checks the 2 sends (ETH, then USDC) of this run
// a|b = the wallet that sends on this platform (release-run.sh): iOS a, Android b. Each sender belongs to one platform, so its nonce
// moves only through this job's sends. Balance deltas are not used: both jobs send and receive in parallel (ADR-0033).
// verify fails (exit 1) unless: the sender nonce moved by exactly 2 (more = a send was broadcast twice, fewer = a send is missing);
// each tx has receipt status 1, the right recipient and amount (ETH: tx `value`; USDC: the `Transfer` log of the token contract);
// the fee per tx is at most ABS_MAX_FEE_WEI. It prints the Etherscan links of the 2 txs and writes an evidence file (public release
// wallets only, never an app user's hash; owner decision 1 of the quality-gates plan).
// Env: E2E_RELEASE_PHRASE (only to derive the public addresses; it is never printed), SEPOLIA_RPC_URL (default: publicnode, like
// release-balance.mts), MAESTRO_ETH_SUFFIX and MAESTRO_USDC_SUFFIX (verify; release-run.sh writes them to GITHUB_ENV),
// RELEASE_SNAPSHOT (snapshot file, default `<RUNNER_TEMP>/release-snapshot-<a|b>.json`), RELEASE_EVIDENCE (default `.../release-verify-<a|b>.json`).
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ABS_MAX_FEE_WEI, ASSETS } from '../packages/wallet-core/src/constants.ts'
import { releaseWallets } from './release-wallets.mts'

export type RpcTx = { hash: string; from: string; to: string | null; value: string; nonce: string; blockNumber: string }
export type RpcLog = { address: string; topics: string[]; data: string }
export type RpcReceipt = { status: string; gasUsed: string; effectiveGasPrice: string; logs: RpcLog[] }
export type SentTx = { tx: RpcTx; receipt: RpcReceipt | null }
export type Rpc = (method: string, params: unknown[]) => Promise<unknown>
export type Expected = {
  sender: string
  receiver: string
  token: string
  nonceBefore: number
  ethWei: bigint
  tokenUnits: bigint
  maxFeeWei: bigint
}

// keccak256("Transfer(address,address,uint256)")
export const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const SCAN_LIMIT = 900 // blocks (about 3 hours): a tag run is shorter; a longer scan means something else is wrong

const same = (a: string | null | undefined, b: string) => (a ?? '').toLowerCase() === b.toLowerCase()
const pad32 = (address: string) => `0x${address.slice(2).toLowerCase().padStart(64, '0')}`
const hex = (n: number) => `0x${n.toString(16)}`

/** Decimal digits as typed in the app: "0." + the suffix, as base units. ETH `0.000NNN` (3 digits), USDC `0.NN` (2 digits). */
export function expectedAmounts(ethSuffix: string, usdcSuffix: string): { ethWei: bigint; tokenUnits: bigint } {
  if (!/^\d{3}$/.test(ethSuffix) || !/^\d{2}$/.test(usdcSuffix))
    throw new Error('MAESTRO_ETH_SUFFIX (3 digits) and MAESTRO_USDC_SUFFIX (2 digits) are missing or malformed.')
  const units = (frac: string, decimals: number) => BigInt(frac.padEnd(decimals, '0'))
  return {
    ethWei: units(`000${ethSuffix}`, ASSETS.ETH.decimals),
    tokenUnits: units(usdcSuffix, ASSETS.USDC.decimals),
  }
}

const feeOf = (r: RpcReceipt) => BigInt(r.gasUsed) * BigInt(r.effectiveGasPrice)

/** The failures of one run (empty = pass). `sent` = the sender's txs from the snapshot block on, in block order. */
export function checkRelease(e: Expected, nonceAfter: number, sent: SentTx[]): string[] {
  const fails: string[] = []
  const delta = nonceAfter - e.nonceBefore
  if (delta !== 2)
    fails.push(
      `sender nonce moved by ${delta}, expected exactly 2 (more: a send was broadcast again; fewer: a send is missing)`,
    )
  if (sent.length !== 2) fails.push(`found ${sent.length} txs of the sender since the snapshot, expected 2`)
  const [eth, token] = sent
  const common = (name: string, s: SentTx, nonce: number) => {
    if (!same(s.tx.from, e.sender)) fails.push(`${name}: sent by another address`)
    if (Number(BigInt(s.tx.nonce)) !== nonce) fails.push(`${name}: nonce ${BigInt(s.tx.nonce)}, expected ${nonce}`)
    if (!s.receipt) {
      fails.push(`${name}: no receipt (not mined)`)
      return
    }
    if (BigInt(s.receipt.status) !== 1n) fails.push(`${name}: receipt status is not 1 (the tx reverted)`)
    if (feeOf(s.receipt) > e.maxFeeWei)
      fails.push(`${name}: fee ${feeOf(s.receipt)} wei is above the cap ${e.maxFeeWei} wei`)
  }
  if (eth) {
    common('ETH send', eth, e.nonceBefore)
    if (!same(eth.tx.to, e.receiver)) fails.push('ETH send: recipient is not the paired wallet')
    if (BigInt(eth.tx.value) !== e.ethWei)
      fails.push(`ETH send: value ${BigInt(eth.tx.value)} wei, expected ${e.ethWei}`)
  }
  if (token) {
    common('USDC send', token, e.nonceBefore + 1)
    if (!same(token.tx.to, e.token)) fails.push('USDC send: the tx does not call the USDC contract')
    if (BigInt(token.tx.value) !== 0n) fails.push('USDC send: the tx also moves ETH')
    if (token.receipt) {
      const transfers = token.receipt.logs.filter((l) => same(l.address, e.token) && l.topics[0] === TRANSFER_TOPIC)
      const right = transfers.filter(
        (l) => l.topics[1] === pad32(e.sender) && l.topics[2] === pad32(e.receiver) && BigInt(l.data) === e.tokenUnits,
      )
      if (right.length !== 1 || transfers.length !== 1)
        fails.push(
          `USDC send: expected one Transfer log of ${e.tokenUnits} units from the sender to the paired wallet, found ${right.length} of ${transfers.length}`,
        )
    }
  }
  return fails
}

/** The sender's txs from `fromBlock` on, in block order, until `count` are found, the chain head is reached or `limit` blocks are read. */
export async function findSenderTxs(
  rpc: Rpc,
  sender: string,
  fromBlock: number,
  count: number,
  limit = SCAN_LIMIT,
): Promise<RpcTx[]> {
  const found: RpcTx[] = []
  for (let n = fromBlock; n < fromBlock + limit && found.length < count; n++) {
    const block = (await rpc('eth_getBlockByNumber', [hex(n), true])) as { transactions: RpcTx[] } | null
    if (!block) break // not mined yet: the head is reached
    for (const tx of block.transactions) if (same(tx.from, sender)) found.push(tx)
  }
  return found
}

/** JSON-RPC over fetch with a few tries: a public node sometimes answers "too fast" or drops a call. */
export function makeRpc(url: string): Rpc {
  return async (method, params) => {
    let last = ''
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)))
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
          signal: AbortSignal.timeout(20_000),
        })
        const body = (await res.json()) as { result?: unknown; error?: { message: string } }
        if (res.ok && !body.error) return body.result
        last = body.error?.message ?? `HTTP ${res.status}`
      } catch (e) {
        last = e instanceof Error ? e.message : String(e)
      }
    }
    throw new Error(`Sepolia RPC ${method} failed: ${last}`)
  }
}

const fail = (msg: string): never => {
  console.error(`::error::${msg}`)
  process.exit(1)
}
const num = (v: unknown) => Number(BigInt(v as string))

async function main(mode: string | undefined, who: string | undefined) {
  if ((mode !== 'snapshot' && mode !== 'verify') || (who !== 'a' && who !== 'b'))
    return fail('usage: release-verify.mts snapshot|verify a|b')
  const wallets = releaseWallets(process.env.E2E_RELEASE_PHRASE?.trim() ?? '')
  if (!wallets) return fail('E2E_RELEASE_PHRASE is missing or not a valid recovery phrase.')
  const [from, to] = who === 'a' ? [wallets.a, wallets.b] : [wallets.b, wallets.a]
  const rpc = makeRpc(process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com')
  const dir = process.env.RUNNER_TEMP ?? tmpdir()
  const snapshotFile = process.env.RELEASE_SNAPSHOT ?? join(dir, `release-snapshot-${who}.json`)

  const nonce = async () => num(await rpc('eth_getTransactionCount', [from.address, 'latest']))
  if (mode === 'snapshot') {
    // The block first: a tx mined between the two reads would then still be at or after the scanned block.
    const block = num(await rpc('eth_blockNumber', []))
    const snapshot = { sender: from.address, block, nonce: await nonce() }
    writeFileSync(snapshotFile, JSON.stringify(snapshot))
    console.log(`Snapshot: sender ${from.address}, nonce ${snapshot.nonce}, block ${snapshot.block}`)
    return
  }

  if (!existsSync(snapshotFile))
    return fail(`no snapshot at ${snapshotFile}: run \`release-verify.mts snapshot ${who}\` before the flows`)
  const snap = JSON.parse(readFileSync(snapshotFile, 'utf8')) as { sender: string; block: number; nonce: number }
  if (!same(snap.sender, from.address)) return fail('the snapshot belongs to another wallet')
  let amounts
  try {
    amounts = expectedAmounts(process.env.MAESTRO_ETH_SUFFIX ?? '', process.env.MAESTRO_USDC_SUFFIX ?? '')
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e))
  }
  const expected: Expected = {
    sender: from.address,
    receiver: to.address,
    token: ASSETS.USDC.address,
    nonceBefore: snap.nonce,
    maxFeeWei: ABS_MAX_FEE_WEI,
    ...amounts,
  }
  const nonceAfter = await nonce()
  const txs = await findSenderTxs(rpc, from.address, snap.block, 2)
  const sent: SentTx[] = []
  for (const tx of txs)
    sent.push({ tx, receipt: (await rpc('eth_getTransactionReceipt', [tx.hash])) as RpcReceipt | null })
  const failures = checkRelease(expected, nonceAfter, sent)

  const run = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null
  const rows = sent.map((s, i) => ({
    asset: i === 0 ? 'ETH' : 'USDC',
    hash: s.tx.hash,
    block: num(s.tx.blockNumber),
    status: s.receipt ? num(s.receipt.status) : null,
    feeWei: s.receipt ? feeOf(s.receipt).toString() : null,
    etherscan: `https://sepolia.etherscan.io/tx/${s.tx.hash}`,
  }))
  const evidence = {
    gate: 'CHAIN-1',
    platform: who === 'a' ? 'ios' : 'android',
    sender: from.address,
    receiver: to.address,
    nonceBefore: snap.nonce,
    nonceAfter,
    maxFeeWei: ABS_MAX_FEE_WEI.toString(),
    txs: rows,
    pass: failures.length === 0,
    failures,
    ref: process.env.GITHUB_REF_NAME ?? null,
    run,
  }
  writeFileSync(
    process.env.RELEASE_EVIDENCE ?? join(dir, `release-verify-${who}.json`),
    JSON.stringify(evidence, null, 2),
  )

  const lines = [
    `Funded sends of ${evidence.platform}: ${from.address} -> ${to.address}, sender nonce ${snap.nonce} -> ${nonceAfter}`,
    ...rows.map((r) => `  ${r.asset}: ${r.etherscan} (block ${r.block}, status ${r.status}, fee ${r.feeWei} wei)`),
  ]
  console.log(lines.join('\n'))
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### Funded sends (${evidence.platform}): ${failures.length ? 'FAILED' : 'passed'}\n${lines.map((l) => `- ${l.trim()}`).join('\n')}\n${failures.map((f) => `- **${f}**`).join('\n')}\n`,
    )
  if (failures.length) return fail(`Funded sends do not match the chain: ${failures.join('; ')}`)
  console.log(
    'Chain check passed: nonce delta 2, both receipts status 1, recipients and amounts exact, fees within the cap.',
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main(process.argv[2], process.argv[3])
