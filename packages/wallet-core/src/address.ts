import { getAddress } from 'viem'

/** EIP-55 checksum form of an address, for display. Anything that is not a valid address is returned as is. Storage keeps what it was given. */
export function toChecksumAddress(a: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) return a
  try {
    return getAddress(a)
  } catch {
    return a
  }
}
