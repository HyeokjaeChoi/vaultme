import { describe, expect, it } from 'vitest'
import { cautionOf, detailRoute, hashOfId, localRecordMatches, rowCopy } from '../src/features/history/model/detail'
import { explorerUrl } from '../src/shared/chain/port'

// The row lookup (cache, fresh page, poisoning filter) is tested in packages/history.
const H = '0x' + '1'.repeat(64)

describe('local record (S41)', () => {
  it('the local own-send record wins for its own hash', () => {
    expect(localRecordMatches(H, H)).toBe(true)
    expect(localRecordMatches(H.toUpperCase().replace('0X', '0x'), H)).toBe(true)
    expect(localRecordMatches(H, `${H}:1`)).toBe(true)
    expect(localRecordMatches(undefined, H)).toBe(false)
    expect(localRecordMatches('0x' + '3'.repeat(64), H)).toBe(false)
  })
})

describe('rowCopy', () => {
  const k = (kind: 'send' | 'receive', status: 'confirmed' | 'failed' | 'pending') => rowCopy({ kind, status })
  it('incoming ok: 보낸 사람, 받은 계정, 성공, no "확정"', () => {
    expect(k('receive', 'confirmed')).toEqual({
      counterpartyTitle: 'detail.senderTitle',
      accountLabel: 'detail.receivedAccount',
      badge: 'confirmed',
      title: 'detail.received',
      body: 'detail.success.body',
      statusWord: 'detail.state.success',
    })
  })
  it('outgoing without record: 받는 사람, 보낸 계정, 성공', () => {
    expect(k('send', 'confirmed')).toMatchObject({
      counterpartyTitle: 'detail.recipientWho',
      accountLabel: 'detail.sender',
      title: 'result.sent',
      body: 'detail.success.body',
      statusWord: 'detail.state.success',
    })
  })
  it('failed uses the existing failure copy; incoming claims no fee', () => {
    expect(k('send', 'failed')).toMatchObject({
      badge: 'failed',
      title: 'result.failedTitle',
      body: 'detail.failed.body',
      statusWord: 'activity.failed',
    })
    expect(k('receive', 'failed')).toMatchObject({ badge: 'failed', title: 'detail.failed.title', body: null })
  })
  it('never uses the confirmed words', () => {
    for (const kind of ['send', 'receive'] as const)
      for (const status of ['confirmed', 'failed', 'pending'] as const) {
        const c = k(kind, status)
        expect(JSON.stringify(c)).not.toMatch(/detail\.confirmed|activity\.confirmed|state\.confirmed/)
      }
  })
})

describe('routes and links', () => {
  it('every row id opens /activity/[hash]; the hash prefix is recoverable', () => {
    expect(detailRoute({ id: `${H}:1` })).toEqual({ pathname: '/activity/[hash]', params: { hash: `${H}:1` } })
    expect(hashOfId(`${H}:1`)).toBe(H)
    expect(hashOfId(H)).toBe(H)
  })
  it('Etherscan row: link on a broadcasting chain, hidden (null) in test-data mode', () => {
    expect(explorerUrl({ broadcasts: true }, H)).toBe(`https://sepolia.etherscan.io/tx/${H}`)
    expect(explorerUrl({ broadcasts: false }, H)).toBeNull()
  })
})

// S41 State caution (Figma 883:4375, Q71, #334): an incoming zero-value row opened from S40 with the S63 switch on.
describe('cautionOf', () => {
  const A = '0x' + 'a'.repeat(40)
  const B = '0x' + 'b'.repeat(40)
  const row = (o: { caution?: true; counterparty?: string } = {}) => ({ counterparty: A, ...o })
  it('no caution flag: no caution state', () => {
    expect(cautionOf(row(), [])).toBeNull()
  })
  it('a sender this wallet never sent to is new', () => {
    expect(cautionOf(row({ caution: true }), [])).toEqual({ newSender: true })
    expect(cautionOf(row({ caution: true }), [B])).toEqual({ newSender: true })
  })
  it('a sender among the known recipients is not called new (any case)', () => {
    expect(cautionOf(row({ caution: true }), [B, A.toUpperCase().replace('0X', '0x')])).toEqual({ newSender: false })
  })
  it('no sender address: the notice stays, no claim about the sender', () => {
    expect(cautionOf(row({ caution: true, counterparty: '' }), [])).toEqual({ newSender: false })
  })
})

describe('rowCopy with caution', () => {
  it('the hero keeps 받았어요 and the success badge but drops the success sentence', () => {
    expect(rowCopy({ kind: 'receive', status: 'confirmed', caution: true })).toMatchObject({
      badge: 'confirmed',
      title: 'detail.received',
      body: null,
      statusWord: 'detail.state.success',
    })
  })
})
