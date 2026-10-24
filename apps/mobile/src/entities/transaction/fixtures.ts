import type { PendingTx } from '@/shared/storage'

type Tx = {
  id: string
  kind: 'send' | 'receive'
  asset: 'ETH' | 'USDC'
  amount: string
  at: number
  state: 'Pending' | 'Confirmed' | 'Failed' | 'Unknown'
}

// Fixture data only (fake adapter). Dates match Figma Activity 404:387 (2026-10-16 is a Friday). `amount` has no sign.
export const transactions: Tx[] = [
  { id: '1', kind: 'send', asset: 'ETH', amount: '0.05', at: new Date(2026, 9, 16, 9, 41).getTime(), state: 'Pending' },
  {
    id: '2',
    kind: 'receive',
    asset: 'USDC',
    amount: '12.5',
    at: new Date(2026, 9, 12, 9, 12).getTime(),
    state: 'Confirmed',
  },
  {
    id: '3',
    kind: 'send',
    asset: 'ETH',
    amount: '0.02',
    at: new Date(2026, 9, 12, 8, 30).getTime(),
    state: 'Confirmed',
  },
  { id: '4', kind: 'send', asset: 'USDC', amount: '1', at: new Date(2026, 9, 11, 7, 55).getTime(), state: 'Failed' },
]

export const review = {
  amount: '0.05 ETH',
  fee: '0.000042 ETH',
  // wallet-core fee model: gasLimit 21000 x (2 x base 1.5 gwei + tip 0.5 gwei) = 21000 x 3.5 gwei
  feeCap: '0.0000735 ETH',
  total: '0.050042 ETH',
  checkedAt: '09:41',
  // Figma example addresses (S20a / S22): 0x1234 5678 9abc def0 1234 5678 9abc def0 1234 5678
  recipient: '0x123456789aBCdef0123456789AbCDEF012345678',
  // Look-alike of `recipient`: two 4-char chunks differ (9abd d3f0, de0f). Address-poisoning example, not a real address.
  lookalike: '0x123456789aBdd3F0123456789aBcdE0f12345678',
} as const

export type Recent = { address: string; at: number; asset: string; amount: string }

/** Example recent recipients, shown only while the fake chain adapter is on (the same kind of example rows as the activity fixtures). Real mode lists only what this device sent. */
export const recentExamples: Recent[] = [
  { address: review.recipient, at: new Date(2026, 9, 12, 8, 30).getTime(), asset: 'ETH', amount: '0.02' },
  {
    address: '0x7c3a91d2e5f04b88a1c603d95e72bb149f206A1D',
    at: new Date(2026, 9, 3, 10, 5).getTime(),
    asset: 'ETH',
    amount: '0.1',
  },
  {
    address: '0x2F9E0C418d73B6A5E91247Cd3a08F5B16c2E91d4',
    at: new Date(2026, 8, 28, 15, 20).getTime(),
    asset: 'USDC',
    amount: '1',
  },
]

/** __DEV__ design-capture only (`?variant=pending` on Home, `?demo=<state>` on the result screen): a synthetic send in the given state. Never written to kv. */
export const demoTx = (state: PendingTx['state']): PendingTx => ({
  hash: '0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
  nonce: 0,
  asset: 'ETH',
  to: review.recipient,
  amount: '0.05',
  createdAt: new Date(2026, 9, 16, 9, 41).getTime(),
  lastCheckedAt: Date.now(),
  fee: '0.000042',
  blockNumber: 5812044, // Figma S41 realchain example
  from: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94', // public test vector first account (entities/account fixtures)
  accountIndex: 0,
  state,
})
