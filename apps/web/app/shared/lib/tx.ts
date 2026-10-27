const TX_HASH = /^0x[0-9a-fA-F]{64}$/

/** A transaction hash from the `/tx#…` fragment: 0x + 64 hex. Returns it lower-case, or null. */
export function parseTxHash(input: string): string | null {
  const h = input.trim()
  return TX_HASH.test(h) ? h.toLowerCase() : null
}

export const etherscanTx = (hash: string) => `https://sepolia.etherscan.io/tx/${hash}`
/** The internal transactions tab of the same page (the rows the capped list leaves out, #255). */
export const etherscanInternal = (hash: string) => `${etherscanTx(hash)}#internal`

/** "2026-10-25 04:12 UTC" (Figma time row): the block time in UTC, to the minute, the same in both languages. */
export const utcTime = (at: number) => `${new Date(at).toISOString().slice(0, 16).replace('T', ' ')} UTC`
