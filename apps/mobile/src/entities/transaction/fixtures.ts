import type { ActivityStatus } from '@/shared/ui'

type Tx = { id: string; kind: 'send' | 'receive'; asset: string; amount: string; detail: string; when: 'today' | 'oct12' | 'oct11'; time: string; status: ActivityStatus }

// Fixture data only. Minus sign is U+2212, as in Figma.
export const transactions: Tx[] = [
  { id: '1', kind: 'send', asset: 'ETH', amount: '−0.05 ETH', detail: '0x9F3c…41aB', when: 'today', time: '09:41', status: 'pending' },
  { id: '2', kind: 'receive', asset: 'ETH', amount: '+0.20 ETH', detail: '0x4E21…c90F', when: 'oct12', time: '18:20', status: 'confirmed' },
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
  recipient: '0x9F3c7A210bD4e6C855a13F90c2E78d16Ab0441aB',
  // Look-alike of `recipient`: two 4-char chunks differ (0bD5 e6C9). Address-poisoning example, not a real address.
  lookalike: '0x9F3c7A210bD5e6C955a13F90c2E78d16Ab0441aB',
} as const

// Recent recipients for the send flow (fixture, not real addresses). `label` is the i18n key of the row's trailing value.
export const recents = [
  { address: review.recipient, label: 'activity.oct12' },
  { address: '0x4E21aB7c9D03F5e86B1a2C4d7E90F3b5a6d8c90F', label: 'send.account2' },
] as const
