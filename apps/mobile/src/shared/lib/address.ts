import { toChecksumAddress } from '@vaultme/wallet-core'

/** Splits an address into 4-char groups (LLD §12). The "0x" prefix stays attached to the first group, as drawn in Figma ("0x9F3c 7A21 ..."). */
export function groupAddress(address: string): string[] {
  const prefix = address.startsWith('0x') ? '0x' : ''
  const groups = address.slice(prefix.length).match(/.{1,4}/g) ?? []
  return groups.map((g, i) => (i === 0 ? prefix + g : g))
}

/** Screen-reader text: each 4-char group is read as separate characters. */
export const addressA11yLabel = (address: string) =>
  groupAddress(address)
    .map((g) => g.split('').join(' '))
    .join(', ')

/** Indexes of 4-char groups that differ between two addresses (lookalike highlight). Only these chunks are marked. */
export function diffGroups(a: string, b: string): number[] {
  const [ga, gb] = [groupAddress(a), groupAddress(b)]
  return ga.flatMap((g, i) => (g.toLowerCase() === gb[i]?.toLowerCase() ? [] : [i]))
}

/** "0x9F3c…41aB": first 6 and last 4 characters, for summary rows. The full address is always shown on Review. */
export const shortAddress = (address: string) => {
  const a = toChecksumAddress(address) // display form; a tx hash is not an address and stays as is
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

/** 4-char groups of the EIP-55 form, for showing an address. Stored and compared values stay as they are. */
export const displayGroups = (address: string): string[] => groupAddress(toChecksumAddress(address))

/** Format check only (0x + 40 hex). It does not establish ownership or safety. */
export const isAddressFormat = (address: string) => /^0x[0-9a-fA-F]{40}$/.test(address)
