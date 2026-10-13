import type { Address } from 'viem'
import { ASSETS, BURN_ADDRESSES } from './constants'

export type RecipientRisk = 'known' | 'first' | 'lookalike' | 'burn' | 'tokenContract'

const norm = (a: string) => a.toLowerCase()
const ends = (a: string) => `${norm(a).slice(2, 6)}${norm(a).slice(-4)}`

const TOKEN_CONTRACTS = Object.values(ASSETS).flatMap((a) => ('address' in a ? [norm(a.address)] : []))

// Priority: burn > tokenContract > lookalike > first > known. Case-insensitive.
export function recipientRisk(to: Address, previous: readonly Address[]): RecipientRisk {
  const t = norm(to)
  if (BURN_ADDRESSES.some((b) => norm(b) === t)) return 'burn'
  if (TOKEN_CONTRACTS.includes(t)) return 'tokenContract'
  if (previous.some((p) => norm(p) !== t && ends(p) === ends(to))) return 'lookalike'
  return previous.some((p) => norm(p) === t) ? 'known' : 'first'
}
