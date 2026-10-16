import type { ActivityStatus } from '@/shared/ui'
import type { PendingTx } from '@/shared/storage'

type Tx = { id: string; kind: 'send' | 'receive'; asset: string; amount: string; detail: string; when: 'today' | 'oct12' | 'oct11'; time: string; status: ActivityStatus }

// Fixture data only. Minus sign is U+2212, as in Figma.
export const transactions: Tx[] = [
  { id: '1', kind: 'send', asset: 'ETH', amount: '−0.05 ETH', detail: '0x9F3C…41Ab', when: 'today', time: '09:41', status: 'pending' },
  { id: '2', kind: 'receive', asset: 'ETH', amount: '+0.20 ETH', detail: '0x4E21…c90f', when: 'oct12', time: '18:20', status: 'confirmed' },
  { id: '3', kind: 'send', asset: 'USDC', amount: '−1.00 USDC', detail: '0x77Ab…0e3D', when: 'oct12', time: '14:05', status: 'failed' },
  { id: '4', kind: 'send', asset: 'ETH', amount: '−0.01 ETH', detail: '0x2B5c…9aa1', when: 'oct11', time: '21:12', status: 'unknown' },
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
