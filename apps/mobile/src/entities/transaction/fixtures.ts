import type { ActivityStatus } from '@/shared/ui'

type Tx = { id: string; kind: 'send' | 'receive'; asset: string; amount: string; detail: string; when: 'justNow' | 'oct12' | 'oct11' | 'oct10'; status: ActivityStatus }

// Fixture data only. Minus sign is U+2212, as in Figma.
export const transactions: Tx[] = [
  { id: '1', kind: 'send', asset: 'ETH', amount: '−0.05 ETH', detail: '0x9F3c…41aB', when: 'justNow', status: 'pending' },
  { id: '2', kind: 'receive', asset: 'ETH', amount: '+0.20 ETH', detail: '0x4E21…c90F', when: 'oct12', status: 'confirmed' },
  { id: '3', kind: 'send', asset: 'USDC', amount: '−1.00 USDC', detail: '0x77Ab…0e3D', when: 'oct11', status: 'failed' },
  { id: '4', kind: 'send', asset: 'ETH', amount: '−0.01 ETH', detail: '0x2B5c…9aa1', when: 'oct10', status: 'unknown' },
]

export const review = {
  amount: '0.05 ETH',
  fee: '0.000042 ETH',
  total: '0.050042 ETH',
  checkedAt: '09:41',
  recipient: '0x9F3c7A210bD4e6C855a13F90c2E78d16Ab0441aB',
  // Look-alike of `recipient`: two 4-char chunks differ (0bD5 e6C9). Address-poisoning example, not a real address.
  lookalike: '0x9F3c7A210bD5e6C955a13F90c2E78d16Ab0441aB',
} as const
