import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { beforeAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AddressPage, { handle } from '../app/routes/address'

const A = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'

// The API at HTTP level (https://api.test, vitest.config.ts): install, token, then JSON-RPC.
type Rpc = 'ok' | 'down' | 'old'
function stubApi() {
  const api = { rpc: 'ok' as Rpc, headers: [] as Headers[] }
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init: RequestInit) => {
      const path = new URL(url).pathname
      api.headers.push(new Headers(init.headers))
      if (path === '/v1/installs') return Promise.resolve(json(201, { installId: crypto.randomUUID() }))
      if (path === '/v1/installs/token')
        return Promise.resolve(json(200, { token: 'tok', expiresAt: Math.floor(Date.now() / 1000) + 900 }))
      if (path === '/v1/history') return Promise.resolve(json(200, { items: [], nextCursor: null, incomplete: false })) // the history has its own tests (use-history, history-section)
      if (api.rpc === 'down') return Promise.resolve(json(503, { code: 'unavailable', message: 'x', retryable: true }))
      if (api.rpc === 'old')
        return Promise.resolve(json(426, { code: 'update_required', message: 'x', retryable: false }))
      const { id, method } = JSON.parse(init.body as string) as { id: number; method: string }
      const result = method === 'eth_getBalance' ? '0x11d448f27b93c000' : '0xbebc20' // 1.284732 ETH, 12.5 USDC
      return Promise.resolve(json(200, { jsonrpc: '2.0', id, result }))
    }),
  )
  return api
}

function open(url: string) {
  const router = createMemoryRouter([{ path: '/address', element: <AddressPage />, handle }], {
    initialEntries: [url],
  })
  render(<RouterProvider router={router} />)
  return router
}

let api: ReturnType<typeof stubApi>
beforeEach(() => {
  api = stubApi()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

// useBalances imports the API client on first read; the first transform of it takes over a second in CI, longer than
// a findBy* waits. Load it once here, as the browser has it cached after the first read.
beforeAll(async () => {
  await Promise.all([import('../app/shared/api/client'), import('@vaultme/api-client')])
})

describe('address input', () => {
  it('shows an inline alert for an invalid address and stays on the form', async () => {
    const router = open('/address')
    await userEvent.type(screen.getByLabelText('Sepolia 주소'), '0x1234abcd')
    await userEvent.click(screen.getByRole('button', { name: '주소 보기' }))
    expect(screen.getByRole('alert')).toHaveTextContent('올바른 주소가 아니에요')
    expect(screen.getByLabelText('Sepolia 주소')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Sepolia 주소')).toHaveFocus()
    expect(router.state.location.hash).toBe('')
    await userEvent.type(screen.getByLabelText('Sepolia 주소'), 'e')
    expect(screen.queryByRole('alert')).toBeNull() // editing clears the error
  })

  it('has a meta description (Lighthouse SEO)', () => {
    open('/address')
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Sepolia 테스트넷 주소의 잔액과 거래 내역을 볼 수 있어요.',
    )
  })

  // ADR-0014: the header chip states the network, the viewer chip states read-only; the page repeats neither.
  it('has no trust banner, ENS note or second network chip', async () => {
    open('/address')
    expect(screen.queryByText(/ENS|로그인이 없어요/)).toBeNull()
    await userEvent.type(screen.getByLabelText('Sepolia 주소'), A)
    await userEvent.click(screen.getByRole('button', { name: '주소 보기' }))
    expect(await screen.findByText('1.284732 ETH')).toBeInTheDocument()
    expect(screen.getAllByText('조회 전용')).toHaveLength(1)
    expect(screen.queryByText(/테스트넷/)).toBeNull()
  })

  it('opens the viewer at /address#<EIP-55 address>, never in the path or query', async () => {
    const router = open('/address')
    await userEvent.type(screen.getByLabelText('Sepolia 주소'), ` ${A.toLowerCase()} `)
    await userEvent.click(screen.getByRole('button', { name: '주소 보기' }))
    expect(router.state.location).toMatchObject({ pathname: '/address', search: '', hash: `#${A}` })
    expect(await screen.findByText('1.284732 ETH')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '조회한 주소' })).toHaveFocus()
  })

  it('an example chip opens the public test address', async () => {
    const router = open('/address')
    await userEvent.click(screen.getByRole('button', { name: '0x9858…da94' }))
    expect(router.state.location.hash).toBe(`#${A}`)
  })

  it('a fragment that is not valid percent-encoding opens the form with its error, not a crash', () => {
    open('/address#%E0%A4%A')
    expect(screen.getByRole('alert')).toHaveTextContent('올바른 주소가 아니에요')
  })

  it('a link with a bad address opens the form with that text and its error', () => {
    open('/address#0x1234')
    expect(screen.getByLabelText('Sepolia 주소')).toHaveValue('0x1234')
    expect(screen.getByRole('alert')).toHaveTextContent('올바른 주소가 아니에요')
  })
})

describe('viewer', () => {
  it('shows ETH and Sepolia USDC through the API as the web client, with no fiat', async () => {
    open(`/address#${A}`)
    expect(screen.getByRole('region', { name: '잔액' })).toHaveAttribute('aria-busy', 'true') // skeleton
    expect(await screen.findByText('1.284732 ETH')).toBeInTheDocument()
    expect(screen.getByText('12.5 USDC')).toBeInTheDocument()
    expect(screen.queryByText(/[$₩€]/)).toBeNull()
    expect(screen.getByRole('region', { name: '잔액' })).toHaveAttribute('aria-busy', 'false')
    for (const h of api.headers) {
      expect(h.get('X-Client')).toBe('web')
      expect(h.get('X-App-Version')).toBe('0.1.0')
    }
  })

  it('a failed load shows an alert with retry, and retry loads the balances', async () => {
    api.rpc = 'down'
    open(`/address#${A}`)
    expect(await screen.findByRole('alert')).toHaveTextContent('잔액을 불러오지 못했어요')
    api.rpc = 'ok'
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(screen.getByRole('region', { name: '잔액' })).toHaveFocus() // focus does not fall back to <body>
    expect(await screen.findByText('12.5 USDC')).toBeInTheDocument()
  })

  it('426 from the API asks for a refresh (a stale cached build)', async () => {
    api.rpc = 'old'
    open(`/address#${A}`)
    expect(await screen.findByRole('alert')).toHaveTextContent('새로고침해 주세요')
    expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument()
  })

  it('"다른 주소 보기" goes back to the form', async () => {
    const router = open(`/address#${A}`)
    await userEvent.click(screen.getByRole('link', { name: '다른 주소 보기' }))
    await waitFor(() => expect(router.state.location.hash).toBe(''))
    expect(screen.getByRole('heading', { level: 1, name: '주소를 넣어 보세요' })).toHaveFocus()
  })

  it('copies the full address', async () => {
    const user = userEvent.setup()
    open(`/address#${A}`)
    await user.click(screen.getByRole('button', { name: '주소 복사' }))
    expect(await navigator.clipboard.readText()).toBe(A)
    expect(await screen.findByText('복사했어요')).toBeInTheDocument()
  })

  it('a browser with no Clipboard API (http, old browser) does not throw on copy; the address stays on screen', async () => {
    const errors: unknown[] = []
    const onError = (e: ErrorEvent) => errors.push(e.error)
    window.addEventListener('error', onError)
    open(`/address#${A}`)
    vi.stubGlobal('navigator', Object.create(navigator, { clipboard: { value: undefined } }))
    screen.getByRole('button', { name: '주소 복사' }).click()
    await new Promise((r) => setTimeout(r, 0))
    window.removeEventListener('error', onError)
    expect(errors).toEqual([])
    expect(screen.queryByText('복사했어요')).toBeNull()
  })
})
