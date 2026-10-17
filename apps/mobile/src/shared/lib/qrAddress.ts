import { CHAIN, toChecksumAddress } from '@vaultme/wallet-core'
import { isAddressFormat } from './address'

/**
 * Address QR parser (issue #64 Q8, Q9). Address only: accepts a bare 0x address and the EIP-681 form
 * `ethereum:[pay-]0x...[@chainId][/function][?params]`. Amount and token params are never used; `hadAmount` (an amount param, or the token `transfer` form) only tells the screen to say so.
 * A chain id other than Sepolia is `wrongChain` (no override). Anything else is `notAddress`.
 *
 * Safety: in `ethereum:<token>/transfer?address=<to>&uint256=<n>` the path address is the token contract, not the recipient.
 * Taking it would send funds to the contract, so for `transfer` the recipient is the `address` param; any other function is `notAddress`.
 */
export type QrParse =
  | { ok: true; address: string; chainId: number | null; hadAmount: boolean }
  | { ok: false; error: 'notAddress' }
  | { ok: false; error: 'wrongChain'; chainId: number }

const NOT_ADDRESS = { ok: false, error: 'notAddress' } as const
const AMOUNT_PARAMS = ['value', 'amount', 'uint256']
const PATH = /^(0x[0-9a-fA-F]{40})(?:@([0-9]{1,15}))?(?:\/([A-Za-z_][A-Za-z0-9_]*))?$/

/** Format plus EIP-55: all-lower or all-upper hex carries no checksum; mixed case must match it. */
function validAddress(a: string): boolean {
  if (!isAddressFormat(a)) return false
  const hex = a.slice(2)
  return hex === hex.toLowerCase() || hex === hex.toUpperCase() || toChecksumAddress(a) === a
}

function queryParams(q: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const pair of q.split('&')) {
    if (!pair) continue
    const i = pair.indexOf('=')
    const k = i < 0 ? pair : pair.slice(0, i)
    const v = i < 0 ? '' : pair.slice(i + 1)
    try {
      out.set(decodeURIComponent(k).toLowerCase(), decodeURIComponent(v))
    } catch {
      // a malformed escape: keep the raw text, it never matches an address anyway
      out.set(k.toLowerCase(), v)
    }
  }
  return out
}

export function parseAddressQr(data: string): QrParse {
  const raw = data.trim()
  if (validAddress(raw)) return { ok: true, address: toChecksumAddress(raw), chainId: null, hadAmount: false }
  const m = /^ethereum:(?:pay-)?([^?]*)(?:\?(.*))?$/i.exec(raw)
  if (!m) return NOT_ADDRESS
  const path = PATH.exec(m[1] ?? '')
  if (!path || !validAddress(path[1]!)) return NOT_ADDRESS
  const chainId = path[2] === undefined ? null : Number(path[2])
  const fn = path[3]
  const params = queryParams(m[2] ?? '')
  let address = path[1]!
  if (fn !== undefined) {
    const to = params.get('address')
    if (fn !== 'transfer' || to === undefined || !validAddress(to)) return NOT_ADDRESS
    address = to
  }
  if (chainId !== null && chainId !== CHAIN.id) return { ok: false, error: 'wrongChain', chainId }
  return { ok: true, address: toChecksumAddress(address), chainId, hadAmount: fn !== undefined || AMOUNT_PARAMS.some((k) => params.has(k)) }
}

/** 이에요 / 예요 after a chain id number: a Korean digit name ends in a vowel for 2 (이), 4 (사), 5 (오), 9 (구); every other last digit (and every round number) ends in a consonant. */
export const chainIdCopula = (chainId: number): '이에요' | '예요' => ('2459'.includes(String(chainId).slice(-1)) ? '예요' : '이에요')

const CHAIN_NAMES: Record<number, string> = { 1: 'Ethereum 메인넷', 8453: 'Base', 137: 'Polygon', 42161: 'Arbitrum One', 10: 'OP Mainnet' }
/** Display name of a well-known chain id for the chain-mismatch sheet; null = unknown (the sheet shows the id). */
export const chainName = (chainId: number): string | null => CHAIN_NAMES[chainId] ?? null
