import type { PendingTx } from '@/shared/storage'

type Tx = { id: string; kind: 'send' | 'receive'; asset: 'ETH' | 'USDC'; amount: string; at: number; state: 'Pending' | 'Confirmed' | 'Failed' | 'Unknown' }

// Fixture data only (fake adapter). Dates match Figma Activity 404:387 (2026-10-16 is a Friday). `amount` has no sign.
export const transactions: Tx[] = [
  { id: '1', kind: 'send', asset: 'ETH', amount: '0.05', at: new Date(2026, 9, 16, 9, 41).getTime(), state: 'Pending' },
  { id: '2', kind: 'receive', asset: 'USDC', amount: '12.5', at: new Date(2026, 9, 12, 9, 12).getTime(), state: 'Confirmed' },
  { id: '3', kind: 'send', asset: 'ETH', amount: '0.02', at: new Date(2026, 9, 12, 8, 30).getTime(), state: 'Confirmed' },
  { id: '4', kind: 'send', asset: 'USDC', amount: '1', at: new Date(2026, 9, 11, 7, 55).getTime(), state: 'Failed' },
]

export const review = {
  amount: '0.05 ETH',
  fee: '0.000042 ETH',
  // wallet-core fee model: gasLimit 21000 x (2 x base 1.5 gwei + tip 0.5 gwei) = 21000 x 3.5 gwei
  feeCap: '0.0000735 ETH',
  total: '0.050042 ETH',
  checkedAt: '09:41',
  recipient: '0x9F3C7A210Bd4E6c855A13F90C2E78D16AB0441Ab',
  // Look-alike of `recipient`: two 4-char chunks differ (0bD5 e6C9). Address-poisoning example, not a real address.
  lookalike: '0x9f3C7a210bD5e6c955a13f90C2e78d16ab0441aB',
} as const

// Recent recipients for the send flow (fixture, not real addresses). `label` is the i18n key of the row's trailing value.
export const recents = [
  { address: review.recipient, label: 'activity.oct12' },
  { address: '0x4E21Ab7c9d03F5e86B1a2c4d7e90F3B5a6D8C90f', label: 'send.account2' },
] as const

/** __DEV__ design-capture only (`?variant=pending` on Home, `?demo=<state>` on the result screen): a synthetic send in the given state. Never written to kv. */
export const demoTx = (state: PendingTx['state']): PendingTx => ({
  hash: '0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
  nonce: 0,
  asset: 'ETH',
  to: review.recipient,
  amount: '0.05',
  createdAt: Date.now(),
  lastCheckedAt: Date.now(),
  fee: '0.000042',
  state,
})
