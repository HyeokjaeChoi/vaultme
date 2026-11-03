// Release gate (#380): the funded E2E wallet must hold enough Sepolia ETH and USDC. Reads E2E_RELEASE_PHRASE from the env,
// derives account 1 (m/44'/60'/0'/0/0) with wallet-core, reads both balances over a public Sepolia RPC (eth_getBalance and
// ERC-20 balanceOf by eth_call). Prints the address and balances only, never the phrase. Exit 1 on short funds or a bad phrase.
// Env: E2E_RELEASE_PHRASE, MIN_ETH (default 0.01), MIN_USDC (default 1), SEPOLIA_RPC_URL. A dry run does not run this script (release.yml).
import { ASSETS } from '../packages/wallet-core/src/constants.ts'
import { deriveAddress, toMnemonic } from '../packages/wallet-core/src/mnemonic.ts'

const fail = (msg: string): never => {
  console.error(`::error::${msg}`)
  process.exit(1)
}
const phrase = process.env.E2E_RELEASE_PHRASE?.trim()
if (!phrase)
  fail('E2E_RELEASE_PHRASE is missing in the GitHub Environment `release`. A tag run needs the funded wallet.')
const mnemonic = toMnemonic(phrase as string)
if (!mnemonic) fail('E2E_RELEASE_PHRASE is not a valid recovery phrase (12 or 24 words).')
const address = deriveAddress(mnemonic!)
console.log(`Funded wallet (account 1): ${address}`)

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
const eth = await call('eth_getBalance', [address, 'latest'])
const usdc = await call('eth_call', [
  { to: ASSETS.USDC.address, data: `0x70a08231${address.slice(2).toLowerCase().padStart(64, '0')}` },
  'latest',
])
console.log(`ETH:  ${show(eth, 18)} (need ${show(minEth, 18)})`)
console.log(`USDC: ${show(usdc, 6)} (need ${show(minUsdc, 6)})`)
const short = [eth < minEth && 'ETH', usdc < minUsdc && 'USDC'].filter(Boolean)
if (short.length)
  fail(`Funded wallet ${address} is short of ${short.join(' and ')} on Sepolia. Top it up, then re-run the release.`)
console.log('Balance check passed.')
