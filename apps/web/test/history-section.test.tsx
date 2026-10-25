import { webMessages } from '@vaultme/i18n/web'
import type { HistoryItem } from '@vaultme/history'
import { render as rtlRender, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { History } from '../app/shared/api'
import { HistorySection } from '../app/shared/ui/HistorySection'

const A = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const PEER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const now = Date.now()

const item = (n: number, o: Partial<HistoryItem> = {}): HistoryItem => ({
  id: `0x${String(n)}:0`,
  hash: `0x${String(n)}`,
  kind: 'receive',
  asset: 'ETH',
  amount: '0.05',
  counterparty: PEER,
  at: now - n * 3_600_000 * 30, // one row per 30 hours: each on its own day
  status: 'confirmed',
  label: 'activity.confirmed',
  local: false,
  ...o,
})
const ok = (
  items: HistoryItem[],
  nextCursor: string | null = null,
  more: 'idle' | 'loading' | 'failed' = 'idle',
): History => ({
  status: 'ok',
  items,
  nextCursor,
  more,
})

// Rows are links (react-router Link): they need a router.
const render = (ui: ReactElement) => rtlRender(ui, { wrapper: MemoryRouter })

function show(history: History, locale: 'ko' | 'en' = 'ko') {
  const actions = { retry: vi.fn(), more: vi.fn() }
  const r = render(
    <HistorySection t={webMessages[locale]} locale={locale} address={A} history={history} actions={actions} />,
  )
  return { ...r, actions }
}
// Both layouts are in the DOM (CSS shows one); the table is the one with columns.
const table = () => within(screen.getByRole('table'))

describe('HistorySection', () => {
  it('every row opens the transaction page by its hash (one link per row in each layout), in the page language', () => {
    show(ok([item(1), item(2)]))
    const hrefs = screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/tx'))
    expect(hrefs.map((a) => a.getAttribute('href'))).toEqual([
      `/tx#${item(1).hash}`,
      `/tx#${item(2).hash}`,
      `/tx#${item(1).hash}`,
      `/tx#${item(2).hash}`,
    ])
    expect(table().getAllByRole('link')[0]).toHaveAccessibleName(/^확정 · /)
  })
  it('en rows link to /en/tx', () => {
    show(ok([item(1)]), 'en')
    expect(screen.getAllByRole('link').some((a) => a.getAttribute('href') === `/en/tx#${item(1).hash}`)).toBe(true)
  })

  it('loading: a busy region with a status text and no button', () => {
    show({ status: 'loading' })
    expect(screen.getByRole('region', { name: '거래 내역' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('거래 내역을 불러오고 있어요')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('a failed row has no sign in the table, as in the cards', () => {
    show(ok([item(1, { kind: 'send', status: 'failed', asset: 'USDC', amount: '1' })]))
    expect(within(screen.getAllByRole('row')[1]!).getByText('1 USDC')).toBeInTheDocument()
  })

  it('table: status word, direction, short counterparty, signed amount, time, per row', () => {
    show(
      ok([
        item(1),
        item(2, { kind: 'send', amount: '12.5', asset: 'USDC' }),
        item(3, { kind: 'send', status: 'failed', asset: 'USDC', amount: '1', counterparty: '' }),
      ]),
    )
    const rows = table().getAllByRole('row')
    expect(rows).toHaveLength(4) // head + 3
    expect(within(rows[1]!).getByText('확정')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('받음')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('0x7099…79C8')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('+0.05 ETH')).toBeInTheDocument()
    expect(within(rows[2]!).getByText('−12.5 USDC')).toBeInTheDocument()
    expect(within(rows[3]!).getByText('실패')).toBeInTheDocument()
    expect(within(rows[3]!).getByText('—')).toBeInTheDocument() // a contract creation has no counterparty
    expect(
      table()
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual(['상태', '구분', '상대 주소', '수량', '시간'])
  })

  it('cards: titles, asset and clock, a failed send without a sign, one date header per day', () => {
    show(
      ok([item(1), item(2, { kind: 'send', status: 'failed', asset: 'USDC', amount: '1' }), item(3, { kind: 'send' })]),
    )
    const list = within(screen.getByRole('region', { name: '거래 내역' }))
    expect(list.getAllByRole('heading', { level: 3 })).toHaveLength(3)
    expect(list.getByText('받음', { selector: 'p' })).toBeInTheDocument()
    expect(list.getByText('보내기 실패')).toBeInTheDocument()
    expect(list.getByText('1 USDC', { selector: 'p' })).toBeInTheDocument()
    expect(list.getAllByText(/^Sepolia ETH · \d\d:\d\d$/, { selector: 'time' })).toHaveLength(2)
  })

  it('en copy', () => {
    show(ok([item(1)]), 'en')
    expect(screen.getByRole('heading', { level: 2, name: 'Transactions' })).toBeInTheDocument()
    expect(table().getByText('Confirmed')).toBeInTheDocument()
  })

  it('shows 5 rows first; 더 보기 reveals 10 more of the loaded rows without a request', async () => {
    const items = Array.from({ length: 20 }, (_, n) => item(n + 1))
    const { actions } = show(ok(items))
    expect(table().getAllByRole('row')).toHaveLength(6)
    await userEvent.click(screen.getByRole('button', { name: '더 보기' }))
    expect(table().getAllByRole('row')).toHaveLength(16)
    expect(actions.more).not.toHaveBeenCalled()
  })

  it('asks for the next page when the loaded rows run out, and keeps the button while a cursor is left', async () => {
    const { actions } = show(ok([item(1), item(2)], 'p2'))
    await userEvent.click(screen.getByRole('button', { name: '더 보기' }))
    expect(actions.more).toHaveBeenCalledTimes(1)
  })

  it('no button on the last page once everything shows', () => {
    show(ok([item(1), item(2)]))
    expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull()
  })

  it('more loading: the button is disabled and busy; more failed: an alert, the rows stay, the button is the retry', () => {
    const { rerender, actions } = show(ok([item(1)], 'p2', 'loading'))
    expect(screen.getByRole('button', { name: '더 보기' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: '더 보기' })).toHaveAttribute('aria-busy', 'true')
    rerender(
      <HistorySection
        t={webMessages.ko}
        locale="ko"
        address={A}
        history={ok([item(1)], 'p2', 'failed')}
        actions={actions}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('더 불러오지 못했어요')
    expect(screen.getByRole('button', { name: '더 보기' })).toHaveAttribute('aria-disabled', 'false')
    expect(table().getAllByRole('row')).toHaveLength(2)
  })

  it('empty: the faucet link; no Etherscan link', () => {
    show(ok([]))
    expect(screen.getByText('아직 거래가 없어요')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sepolia 파우셋 열기' })).toHaveAttribute(
      'href',
      'https://faucet.quicknode.com/ethereum/sepolia',
    )
    expect(screen.queryByRole('link', { name: 'Etherscan에서 보기' })).toBeNull()
  })

  it('an empty page that still has an older page is a list with 더 보기, not the empty state', () => {
    const { actions } = show(ok([], 'p2'))
    expect(actions.more).toHaveBeenCalled() // it follows the cursor by itself (a mock never leaves 'idle': at most 3 times)
    expect(actions.more.mock.calls.length).toBeLessThanOrEqual(3)
    expect(screen.queryByText('아직 거래가 없어요')).toBeNull()
    expect(screen.getByRole('button', { name: '더 보기' })).toBeInTheDocument()
  })

  it('failed: an alert with a retry button; retry asks again', async () => {
    const { actions } = show({ status: 'failed' })
    expect(screen.getByRole('alert')).toHaveTextContent('내역을 불러오지 못했어요')
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(actions.retry).toHaveBeenCalledTimes(1)
  })

  it('the Etherscan link opens the address on Sepolia Etherscan, safely', () => {
    show(ok([item(1)]))
    const link = screen.getByRole('link', { name: 'Etherscan에서 보기' })
    expect(link).toHaveAttribute('href', `https://sepolia.etherscan.io/address/${A}`)
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('another address starts from the first 5 rows again', async () => {
    const items = Array.from({ length: 20 }, (_, n) => item(n + 1))
    const actions = { retry: vi.fn(), more: vi.fn() }
    const { rerender } = render(
      <HistorySection t={webMessages.ko} locale="ko" address={A} history={ok(items)} actions={actions} />,
    )
    await userEvent.click(screen.getByRole('button', { name: '더 보기' }))
    expect(table().getAllByRole('row')).toHaveLength(16)
    rerender(<HistorySection t={webMessages.ko} locale="ko" address={PEER} history={ok(items)} actions={actions} />)
    expect(table().getAllByRole('row')).toHaveLength(6)
  })
})
