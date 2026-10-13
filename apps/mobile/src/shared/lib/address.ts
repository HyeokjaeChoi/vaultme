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
export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`

/** Format check only (0x + 40 hex). It does not establish ownership or safety. */
export const isAddressFormat = (address: string) => /^0x[0-9a-fA-F]{40}$/.test(address)
