// Release gate (#380, #381): both funded E2E wallets (A, and B = same phrase + passphrase, scripts/release-wallets.mts) must hold
// enough Sepolia ETH and USDC. Reads E2E_RELEASE_PHRASE from the env, derives account 1 (m/44'/60'/0'/0/0) of each with wallet-core,
// reads both balances over a public Sepolia RPC (eth_getBalance and ERC-20 balanceOf by eth_call). Prints the addresses and balances
// only, never the phrase (the first tag run shows B's address to fund). Exit 1 on short funds or a bad phrase.
// Env: E2E_RELEASE_PHRASE, MIN_ETH (default 0.01), MIN_USDC (default 1), SEPOLIA_RPC_URL. A dry run does not run this script (release.yml).
import { ASSETS } from '../packages/wallet-core/src/constants.ts'
import { releaseWallets } from './release-wallets.mts'

const fail = (msg: string): never => {
  console.error(`::error::${msg}`)
  process.exit(1)
}
const phrase = process.env.E2E_RELEASE_PHRASE?.trim()
if (!phrase)
  fail('E2E_RELEASE_PHRASE is missing in the GitHub Environment `release`. A tag run needs the funded wallet.')
const wallets = releaseWallets(phrase as string)
if (!wallets) fail('E2E_RELEASE_PHRASE is not a valid recovery phrase (12 or 24 words).')

const rpc = process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com'
const call = async (method: string, params: unknown[]): Promise<bigint> => {
  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(15_000),
    })
    const body = (await res.json()) as { result?: unknown; error?: { message: string } }
    if (!res.ok || typeof body.result !== 'string' || !/^0x[0-9a-f]+$/i.test(body.result))
      return fail(`Sepolia RPC ${method} failed: ${body.error?.message ?? `HTTP ${res.status}`}`)
    return BigInt(body.result)
  } catch (e) {
    return fail(`Sepolia RPC ${method} failed: ${e instanceof Error ? e.message : String(e)}`)
  }
}
const units = (v: string, decimals: number): bigint => {
  const [i = '0', f = ''] = v.split('.')
  return BigInt(i + f.padEnd(decimals, '0').slice(0, decimals))
}
const show = (v: bigint, decimals: number) =>
  `${v / 10n ** BigInt(decimals)}.${(v % 10n ** BigInt(decimals)).toString().padStart(decimals, '0')}`

const minEth = units(process.env.MIN_ETH ?? '0.01', ASSETS.ETH.decimals)
const minUsdc = units(process.env.MIN_USDC ?? '1', ASSETS.USDC.decimals)
const shortOf: string[] = []
for (const [name, { address }] of [
  ['A', wallets!.a],
  ['B', wallets!.b],
] as const) {
  const eth = await call('eth_getBalance', [address, 'latest'])
  const usdc = await call('eth_call', [
    { to: ASSETS.USDC.address, data: `0x70a08231${address.slice(2).toLowerCase().padStart(64, '0')}` },
    'latest',
  ])
  console.log(`Wallet ${name} (account 1): ${address}`)
  console.log(`  ETH:  ${show(eth, 18)} (need ${show(minEth, 18)})`)
  console.log(`  USDC: ${show(usdc, 6)} (need ${show(minUsdc, 6)})`)
  const short = [eth < minEth && 'ETH', usdc < minUsdc && 'USDC'].filter(Boolean)
  if (short.length) shortOf.push(`wallet ${name} ${address} is short of ${short.join(' and ')}`)
}
if (shortOf.length) fail(`Funded wallets on Sepolia: ${shortOf.join('; ')}. Top up, then re-run the release.`)
console.log('Balance check passed.')
