import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Home and the send gates use useTrackedTx; its poll step is checkStored. Hooks and the kv are mocked, the chain is a stub.
let stored: unknown = null
vi.mock('expo-router', () => ({ useFocusEffect: () => undefined }))
// A minimal hook runner for useTrackedTx: no re-render, callbacks run as written.
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
vi.mock('@tanstack/react-query', async (orig) => ({ ...(await orig<object>()), useQueryClient: () => qc }))
vi.mock('react', () => ({
  useState: (init: unknown) => [typeof init === 'function' ? (init as () => unknown)() : init, () => undefined],
  useCallback: (fn: unknown) => fn,
  useEffect: () => undefined,
}))
vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) },
}))
vi.mock('@/shared/storage', () => ({ getPendingTx: () => stored, setPendingTx: (tx: unknown) => void (stored = tx) }))
const net = vi.hoisted(() => ({ receipt: vi.fn() }))
vi.mock('@/shared/chain', () => ({
  chain: {
    broadcasts: true,
    getReceipt: net.receipt,
    getSafeBlock: () => Promise.resolve(10n),
    getSafeNonce: () => Promise.resolve(0n),
  },
}))
vi.mock('../src/features/send/model/useReviewCore', () => ({
  sendFrom: () => '0x1a2b3C4d5e6F7A8B9c0D1e2f3A4B5c6d7e8F9A0B',
}))

import { blocksNewSend } from '../src/features/send/model/runSend'
import { checkStored, stateChanged, useTrackedTx } from '../src/features/send/model/useTrackedTx'
import { readPendingTx } from '../src/entities/transaction/pendingStore'

const tx = {
  hash: '0xabc',
  nonce: 0,
  asset: 'ETH',
  to: '0x9F3C7A210Bd4E6c855A13F90C2E78D16AB0441Ab',
  amount: '0.1',
  createdAt: 1,
  lastCheckedAt: 1,
  state: 'Pending',
}

describe('checkStored (Home poll step)', () => {
  beforeEach(() => {
    stored = { ...tx }
    net.receipt.mockReset().mockResolvedValue({ blockNumber: 5n, status: 'success' })
    qc.clear()
  })

  it('confirms a pending send and unlocks a new send', async () => {
    expect(blocksNewSend(readPendingTx())).toBe(true)
    expect(await checkStored(qc)).toBe('Confirmed')
    expect(blocksNewSend(readPendingTx())).toBe(false)
  })

  it('does nothing when no send is stored', async () => {
    stored = null
    expect(await checkStored(qc)).toBeNull()
  })

  it('a check reads the network every time (an old receipt in the query cache never answers)', async () => {
    net.receipt.mockResolvedValue(null)
    await checkStored(qc)
    await checkStored(qc)
    expect(net.receipt).toHaveBeenCalledTimes(2)
    await new Promise((r) => setTimeout(r, 5)) // gc runs on a timer
    expect(qc.getQueryCache().getAll()).toHaveLength(0) // gcTime 0: nothing is kept
  })

  it('shares one network read between two checks that run at once (Home and S41)', async () => {
    await Promise.all([checkStored(qc), checkStored(qc)])
    expect(net.receipt).toHaveBeenCalledTimes(1)
  })

  it('a failed read throws and keeps the record as it was (the caller shows the error)', async () => {
    net.receipt.mockRejectedValue(new Error('offline'))
    await expect(checkStored(qc)).rejects.toThrow('offline')
    expect(stored).toMatchObject({ state: 'Pending', lastCheckedAt: 1 })
  })

  it('a send that replaced the record while the chain was asked is not overwritten', async () => {
    net.receipt.mockImplementation(() => {
      stored = { ...tx, hash: '0xnew' }
      return Promise.resolve({ blockNumber: 5n, status: 'success' })
    })
    expect(await checkStored(qc)).toBeNull()
    expect(stored).toMatchObject({ hash: '0xnew', state: 'Pending' })
  })
})

describe('stateChanged (Home reloads its list, #269)', () => {
  it('a check that moves the stored send to a new state counts', () => {
    expect(stateChanged({ ...tx, state: 'Pending' } as never, 'Confirmed')).toBe(true)
    expect(stateChanged({ ...tx, state: 'Pending' } as never, 'Included')).toBe(true)
  })
  it('the same state, no check, or no record before does not', () => {
    expect(stateChanged({ ...tx, state: 'Included' } as never, 'Included')).toBe(false)
    expect(stateChanged({ ...tx, state: 'Pending' } as never, null)).toBe(false)
    expect(stateChanged(null, 'Confirmed')).toBe(false)
    expect(stateChanged('corrupt', 'Confirmed')).toBe(false)
  })
})

describe('useTrackedTx calls onStateChange once per state move (#269)', () => {
  beforeEach(() => {
    stored = { ...tx }
    net.receipt.mockReset().mockResolvedValue({ blockNumber: 5n, status: 'success' })
    qc.clear()
  })

  it('Pending -> Confirmed calls it; a later check with no move does not', async () => {
    const onStateChange = vi.fn()
    const { recheck } = useTrackedTx(onStateChange)
    await recheck()
    expect(onStateChange).toHaveBeenCalledTimes(1)
    await recheck()
    expect(onStateChange).toHaveBeenCalledTimes(1)
  })
})
