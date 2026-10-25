import 'fake-indexeddb/auto'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import TxPage, { handle } from '../app/routes/tx'

const H = `0x${'8f'.repeat(32)}`
const A = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const B = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'

type Chain = { tx: unknown; receipt: unknown; down: boolean }
const eth = { hash: H, from: B, to: A, value: '0xb1a2bc2ec50000', input: '0x' } // 0.05 ETH
const receipt = { status: '0x1', gasUsed: '0x5208', effectiveGasPrice: '0x3b9aca00', blockNumber: '0x713a27' } // fee 0.000021 ETH
let chain: Chain

beforeEach(() => {
  chain = { tx: eth, receipt, down: false }
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: RequestInit) => {
      const path = new URL(url).pathname
      if (path === '/v1/installs') return Promise.resolve(json(201, { installId: crypto.randomUUID() }))
      if (path === '/v1/installs/token')
        return Promise.resolve(json(200, { token: 'tok', expiresAt: Math.floor(Date.now() / 1000) + 900 }))
      if (chain.down) return Promise.resolve(json(503, { code: 'unavailable', message: 'x', retryable: true }))
      const { id, method } = JSON.parse(init.body as string) as { id: number; method: string }
      const results: Record<string, unknown> = {
        eth_getTransactionByHash: chain.tx,
        eth_getTransactionReceipt: chain.receipt,
        eth_getBlockByNumber: { timestamp: `0x${Math.floor(Date.now() / 1000 - 210).toString(16)}` }, // 3.5 minutes ago: always "3분 전"
      }
      return Promise.resolve(json(200, { jsonrpc: '2.0', id, result: results[method] }))
    }),
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
})
beforeAll(async () => {
  await Promise.all([import('../app/shared/api/client'), import('@vaultme/api-client')])
})

function open(url: string, state?: unknown) {
  const [path = '', fragment = ''] = url.split('#')
  const router = createMemoryRouter(
    [
      { path: '/tx', element: <TxPage />, handle },
      { path: '/en/tx', element: <TxPage />, handle },
    ],
    {
      initialEntries: [{ pathname: path, hash: fragment ? `#${fragment}` : '', state }],
    },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('transaction page', () => {
  it('shows the S41 fields in order: status, amount, from, to, time (relative + UTC), fee, block, hash, Etherscan', async () => {
    open(`/tx#${H}`)
    expect(screen.getByRole('status')).toHaveTextContent('거래를 불러오고 있어요')
    expect(await screen.findByText('확정')).toBeInTheDocument()
    expect(screen.getByText('0.05')).toBeInTheDocument()
    expect(screen.getByText('ETH')).toBeInTheDocument()
    const labels = screen.getAllByRole('term').map((e) => e.textContent)
    expect(labels).toEqual(['보낸 사람', '받는 사람', '시간', '네트워크 수수료', '블록', '거래 해시'])
    const defs = screen.getAllByRole('definition').map((e) => e.textContent)
    expect(defs[0]).toBe(B)
    expect(defs[1]).toBe(A)
    expect(defs[2]).toMatch(/^3분 전 · \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/)
    expect(defs[3]).toBe('0.000021 ETH')
    expect(defs[4]).toBe('#7,420,455')
    expect(defs[5]).toBe(H)
    expect(screen.getByRole('link', { name: 'Etherscan에서 보기' })).toHaveAttribute(
      'href',
      `https://sepolia.etherscan.io/tx/${H}`,
    )
  })

  it('copies an address and the hash', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    open(`/tx#${H}`)
    await userEvent.click(await screen.findByRole('button', { name: '거래 해시 복사' }))
    expect(writeText).toHaveBeenCalledWith(H)
    expect(await screen.findByText('복사했어요')).toBeInTheDocument()
  })

  it('English page: labels and a 12.5 USDC transfer decoded from the call data', async () => {
    chain.tx = {
      ...eth,
      to: USDC.toLowerCase(),
      value: '0x0',
      input: `0xa9059cbb${A.slice(2).toLowerCase().padStart(64, '0')}${12_500_000n.toString(16).padStart(64, '0')}`,
    }
    open(`/en/tx#${H}`)
    expect(await screen.findByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('12.5')).toBeInTheDocument()
    expect(screen.getByText('USDC')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View on Etherscan' })).toBeInTheDocument()
    expect(screen.getAllByRole('definition')[1]).toHaveTextContent(A) // EIP-55, though the node answers in lower case
  })

  it('a reverted transaction says failed; a contract creation has no recipient', async () => {
    chain.receipt = { ...receipt, status: '0x0' }
    chain.tx = { ...eth, to: null }
    open(`/tx#${H}`)
    expect(await screen.findByText('실패')).toBeInTheDocument()
    expect(screen.getAllByRole('definition')[1]).toHaveTextContent('—')
    expect(screen.queryByRole('button', { name: '받는 사람 복사' })).toBeNull()
  })

  it('an unknown hash is the not-found state, and Try again reads it again', async () => {
    chain.tx = null
    open(`/tx#${H}`)
    expect(await screen.findByText('아직 내역에 없어요')).toBeInTheDocument()
    chain.tx = eth
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('확정')).toBeInTheDocument()
  })

  it('an API error is the failed state with an alert; Try again recovers, and the focus stays in the page', async () => {
    chain.down = true
    open(`/tx#${H}`)
    expect(await screen.findByRole('alert')).toHaveTextContent('내역을 불러오지 못했어요')
    chain.down = false
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('확정')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.body).not.toHaveFocus()
    })
  })

  it.each(['', '#0x1234', `#${H}00`])(
    'a missing or bad hash (%j) is the invalid state, with no request',
    async (hash) => {
      open(`/tx${hash}`)
      expect(await screen.findByText('거래 해시가 올바르지 않아요')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '주소 보기' })).toHaveAttribute('href', '/address')
      expect(fetch).not.toHaveBeenCalled()
    },
  )

  it('back goes to the address the row came from; a direct link goes to /address', () => {
    const router = open(`/tx#${H}`, { from: A })
    const back = screen.getByRole('link', { name: '주소로 돌아가기' })
    expect(back).toHaveAttribute('href', `/address#${A}`)
    router.dispose()
    document.body.innerHTML = ''
    open(`/tx#${H}`, { from: 'not an address' })
    expect(screen.getByRole('link', { name: '주소로 돌아가기' })).toHaveAttribute('href', '/address')
  })

  it('English back link stays on /en', () => {
    open(`/en/tx#${H}`, { from: A })
    expect(screen.getByRole('link', { name: 'Back to address' })).toHaveAttribute('href', `/en/address#${A}`)
  })

  it('moves focus to the heading after a client-side navigation', async () => {
    const router = open(`/tx#${H}`)
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus() // the first load (a POP) leaves it
    await router.navigate(`/tx#${H}`.replace('#', '?x=1#'))
    await waitFor(() => {
      expect(within(document.body).getByRole('heading', { level: 1 })).toHaveFocus()
    })
  })
})
