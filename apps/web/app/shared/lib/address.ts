import { toChecksumAddress } from '@vaultme/wallet-core'

const HEX_ADDRESS = /^0x[0-9a-fA-F]{40}$/

/**
 * What the viewer accepts: 0x + 40 hex, and a matching EIP-55 checksum when the letters are mixed case
 * (all-lowercase and all-uppercase carry no checksum). Returns the EIP-55 form, or null. ENS names are not supported (ADR-0012).
 */
export function parseAddress(input: string): string | null {
  const a = input.trim()
  if (!HEX_ADDRESS.test(a)) return null
  const body = a.slice(2)
  const checksummed = toChecksumAddress(a.toLowerCase())
  const mixedCase = body !== body.toLowerCase() && body !== body.toUpperCase()
  return mixedCase && a !== checksummed ? null : checksummed
}
