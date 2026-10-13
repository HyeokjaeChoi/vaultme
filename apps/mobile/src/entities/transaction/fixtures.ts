import type { ActivityStatus } from '@/shared/ui'

type Tx = { id: string; kind: 'send' | 'receive'; asset: string; amount: string; when: 'justNow' | 'oct12' | 'oct11' | 'oct10'; status: ActivityStatus }

export const transactions: Tx[] = [
  { id: '1', kind: 'send', asset: 'ETH', amount: '-0.5', when: 'justNow', status: 'pending' },
  { id: '2', kind: 'receive', asset: 'ETH', amount: '+1.0', when: 'oct12', status: 'confirmed' },
  { id: '3', kind: 'send', asset: 'USDC', amount: '-10.0', when: 'oct11', status: 'failed' },
  { id: '4', kind: 'send', asset: 'ETH', amount: '-0.1', when: 'oct10', status: 'unknown' },
]

export const review = {
  amount: '0.05 ETH',
  fee: '0.000042 ETH',
  total: '0.050042 ETH',
  checkedAt: '09:41',
  recipient: '0x9F3c7A210bD5e6C955a13F90c2E78d16Ab0441aB',
  // Same as `recipient` except two 4-char chunks (0bD4 e6C8): address-poisoning look-alike.
  previous: '0x9F3c7A210bD4e6C855a13F90c2E78d16Ab0441aB',
} as const
