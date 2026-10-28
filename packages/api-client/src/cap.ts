/** A disperse or airdrop can have hundreds of internal transfers: the apps show the first ones and point to Etherscan for the rest (#255). */
export const INTERNAL_CAP = 10

/** The rows to draw and how many are left out. */
export const capInternal = <T>(items: readonly T[]): { shown: T[]; more: number } => ({
  shown: items.slice(0, INTERNAL_CAP),
  more: Math.max(0, items.length - INTERNAL_CAP),
})
