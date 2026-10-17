import { beforeEach, describe, expect, it, vi } from 'vitest'

// Home and the send gates use useTrackedTx; its poll step is checkStored. Hooks and the kv are mocked, the chain is a stub.
let stored: unknown = null
vi.mock('expo-router', () => ({ useFocusEffect: () => undefined }))
vi.mock('react-native', () => ({ AppState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) } }))
vi.mock('@/shared/storage', () => ({ getPendingTx: () => stored, setPendingTx: (tx: unknown) => void (stored = tx) }))
vi.mock('@/shared/chain', () => ({
  chain: {
    broadcasts: true,
    getReceipt: async () => ({ blockNumber: 5n, status: 'success' }),
    getSafeBlock: async () => 10n,
    getSafeNonce: async () => 0n,
  },
}))
vi.mock('../src/features/send/model/useReviewCore', () => ({ sendFrom: () => '0x1a2b3C4d5e6F7A8B9c0D1e2f3A4B5c6d7e8F9A0B' }))

import { blocksNewSend } from '../src/features/send/model/runSend'
import { checkStored } from '../src/features/send/model/useTrackedTx'
import { readPendingTx } from '../src/features/send/model/usePendingTx'

const tx = { hash: '0xabc', nonce: 0, asset: 'ETH', to: '0x9F3C7A210Bd4E6c855A13F90C2E78D16AB0441Ab', amount: '0.1', createdAt: 1, lastCheckedAt: 1, state: 'Pending' }

describe('checkStored (Home poll step)', () => {
  beforeEach(() => void (stored = { ...tx }))

  it('confirms a pending send and unlocks a new send', async () => {
    expect(blocksNewSend(readPendingTx())).toBe(true)
    expect(await checkStored()).toBe('Confirmed')
    expect(blocksNewSend(readPendingTx())).toBe(false)
  })

  it('does nothing when no send is stored', async () => {
    stored = null
    expect(await checkStored()).toBeNull()
  })
})
