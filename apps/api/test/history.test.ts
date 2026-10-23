import { HISTORY_PAGE_SIZE, USDC_SEPOLIA } from '@vaultme/contracts'
import type { HistoryItem } from '@vaultme/contracts'
import { describe, expect, it } from 'vitest'
import { InvalidCursorError, UpstreamError } from '../src/errors.ts'
import { addressHash, loadHistory, type FetchList, type List, type Query } from '../src/history.ts'

const ME = '0x' + 'a'.repeat(40)
const OTHER = '0x' + 'b'.repeat(40)
const FAKE_ETH = '0xfffffffffffffffffffffffffffffffffffffffe'
type Row = Record<string, string>
const hash = (n: number) => '0x' + n.toString(16).padStart(64, '0')

let n = 0
const base = (block: number, txIndex: number, o: Row = {}): Row => ({
  hash: hash(++n),
  blockNumber: String(block),
  timeStamp: String(1_700_000_000 + block),
  transactionIndex: String(txIndex),
  from: OTHER,
  to: ME,
  value: '1000',
  ...o,
})
const tx = (block: number, txIndex = 0, o: Row = {}) =>
  base(block, txIndex, { isError: '0', txreceipt_status: '1', ...o })
const internal = (block: number, txIndex: number, traceId: string, o: Row = {}) =>
  base(block, txIndex, { traceId, isError: '0', ...o })
const token = (block: number, txIndex: number, o: Row = {}) =>
  base(block, txIndex, { contractAddress: USDC_SEPOLIA.toLowerCase(), ...o })

/** In-memory Etherscan: sort=desc, endblock inclusive, page x offset, the 10000 window. `flip` reverses the order inside a block. */
function sim(data: Partial<Record<List, Row[]>>, flip = false) {
  const calls: Array<[List, Query]> = []
  const f: FetchList = async (list, q) => {
    calls.push([list, q])
    if (q.page * q.offset > 10000) throw new Error('window too large')
    const rows = (data[list] ?? []).filter((r) => q.endblock === undefined || Number(r.blockNumber) <= q.endblock)
    const sorted = (flip ? [...rows].reverse() : rows).sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))
    return sorted.slice((q.page - 1) * q.offset, q.page * q.offset)
  }
  return { f, calls }
}

async function walk(f: FetchList, address = ME) {
  const pages: Awaited<ReturnType<typeof loadHistory>>[] = []
  let cursor: string | undefined
  do {
    const p = await loadHistory(f, address, cursor)
    pages.push(p)
    cursor = p.nextCursor ?? undefined
  } while (cursor && pages.length < 200)
  return pages
}
const ids = (items: HistoryItem[]) => items.map((i) => i.id)

describe('loadHistory merge', () => {
  it('normalizes the three lists, drops the fake ETH token row, orders a tx native -> internal -> erc20', async () => {
    const h = hash(9999)
    const { f } = sim({
      txlist: [
        tx(100, 3, { hash: h, from: ME, to: OTHER, value: '5' }),
        tx(90, 0, { isError: '1', txreceipt_status: '0' }),
        tx(80, 0, { value: '0' }),
      ],
      txlistinternal: [
        internal(100, 3, '0_1_2', { hash: h, value: '7' }),
        internal(100, 3, '0_1_10', { hash: h, value: '8' }),
        internal(70, 0, '0', { isError: '1' }),
      ],
      tokentx: [
        token(100, 3, { hash: h, value: '9' }),
        token(100, 3, { hash: h, value: '99', contractAddress: FAKE_ETH }),
      ],
    })
    const r = await loadHistory(f, ME.toUpperCase().replace('0X', '0x'))
    expect(r.incomplete).toBe(false)
    expect(r.nextCursor).toBeNull()
    expect(r.items.map((i) => [i.blockNumber, i.kind, i.value])).toEqual([
      [100, 'native', '5'],
      [100, 'internal', '7'],
      [100, 'internal', '8'],
      [100, 'erc20', '9'],
      [90, 'native', '1000'],
      [80, 'native', '0'],
      [70, 'internal', '1000'],
    ])
    expect(r.items.slice(0, 4).map((i) => i.id)).toEqual([0, 1, 2, 3].map((q) => `${h}:${q}`))
    expect(r.items[0]).toMatchObject({
      direction: 'out',
      asset: 'ETH',
      from: ME,
      to: OTHER,
      status: 'ok',
      zeroValue: false,
      txIndex: 3,
    })
    expect(r.items[3]).toMatchObject({ direction: 'in', asset: 'USDC', status: 'ok' })
    expect(r.items.map((i) => i.status)).toEqual(['ok', 'ok', 'ok', 'ok', 'failed', 'ok', 'failed'])
    expect(r.items[5]!.zeroValue).toBe(true)
  })

  it('empty history', async () => {
    expect(await loadHistory(sim({}).f, ME)).toEqual({ items: [], nextCursor: null, incomplete: false })
  })

  it('self transfer is out; contract creation has no `to`', async () => {
    const { f } = sim({ txlist: [tx(5, 0, { from: ME, to: ME }), tx(4, 0, { from: ME, to: '' })] })
    const r = await loadHistory(f, ME)
    expect(r.items.map((i) => [i.direction, i.to])).toEqual([
      ['out', ME],
      ['out', null],
    ])
  })

  it('zero-value token row with log from == me but tx sender != me (transferFrom spoof) is not outgoing (#53)', async () => {
    const h = hash(7001)
    const { f } = sim({
      txlist: [tx(10, 0, { hash: h, from: OTHER, to: USDC_SEPOLIA.toLowerCase(), value: '0' })], // attacker is the tx sender
      tokentx: [token(10, 0, { hash: h, from: ME, to: '0x' + 'c'.repeat(40), value: '0' })],
    })
    const r = await loadHistory(f, ME)
    const t = r.items.find((i) => i.kind === 'erc20')!
    expect(t).toMatchObject({ zeroValue: true, direction: 'in' })
  })

  it('zero-value token row from me with no txlist row of mine in the data is classified conservatively (not outgoing)', async () => {
    const { f } = sim({ tokentx: [token(10, 0, { from: ME, to: OTHER, value: '0' })] })
    expect((await loadHistory(f, ME)).items[0]).toMatchObject({ zeroValue: true, direction: 'in' })
  })

  it('genuine user-sent zero-value token call (tx sender == me) stays outgoing; non-zero transferFrom keeps log direction', async () => {
    const h = hash(7002)
    const { f } = sim({
      txlist: [tx(10, 0, { hash: h, from: ME, to: USDC_SEPOLIA.toLowerCase(), value: '0' })],
      tokentx: [
        token(10, 0, { hash: h, from: ME, to: OTHER, value: '0' }),
        token(9, 0, { from: ME, to: OTHER, value: '5' }),
      ],
    })
    const r = await loadHistory(f, ME)
    expect(r.items.filter((i) => i.kind === 'erc20').map((i) => [i.value, i.direction])).toEqual([
      ['0', 'out'],
      ['5', 'out'],
    ])
  })

  it('malformed upstream row is an UpstreamError', async () => {
    await expect(loadHistory(sim({ txlist: [{ hash: 'x' }] }).f, ME)).rejects.toBeInstanceOf(UpstreamError)
  })

  it('dedupes a repeated tx row; keeps identical erc20 rows of one tx (no logIndex)', async () => {
    const t = tx(10, 0)
    const k = token(10, 1, { value: '5' })
    const { f } = sim({ txlist: [t, { ...t }], tokentx: [k, { ...k }, { ...k }] })
    const r = await loadHistory(f, ME)
    expect(r.items.map((i) => i.kind)).toEqual(['erc20', 'erc20', 'erc20', 'native'])
    expect(r.items).toHaveLength(4)
    expect(new Set(ids(r.items)).size).toBe(4)
  })
})

describe('loadHistory paging', () => {
  it('last page: exactly 50 rows -> no cursor; 51 -> cursor, then 1 row, then null', async () => {
    const mk = (count: number) => Array.from({ length: count }, (_, i) => tx(1000 - i))
    const exact = await loadHistory(sim({ txlist: mk(50) }).f, ME)
    expect(exact.items).toHaveLength(50)
    expect(exact.nextCursor).toBeNull()
    const pages = await walk(sim({ txlist: mk(51) }).f)
    expect(pages.map((p) => p.items.length)).toEqual([50, 1])
    expect(pages[0]!.nextCursor).not.toBeNull()
    expect(pages[1]!.nextCursor).toBeNull()
  })

  it('page boundary inside one tx: native | internal | erc20 of the same (block, txIndex) split across pages', async () => {
    const filler = Array.from({ length: 48 }, (_, i) => tx(2000 - i))
    const h = hash(5555)
    const data = {
      txlist: [...filler, tx(1900, 4, { hash: h })],
      txlistinternal: [internal(1900, 4, '0_1', { hash: h }), internal(1900, 4, '0_2', { hash: h })],
      tokentx: [token(1900, 4, { hash: h }), token(1850, 0)],
    }
    for (const flip of [false, true]) {
      const pages = await walk(sim(data, flip).f)
      expect(pages.map((p) => p.items.length)).toEqual([50, 3])
      const all = pages.flatMap((p) => p.items)
      expect(all.slice(48, 52).map((i) => i.kind)).toEqual(['native', 'internal', 'internal', 'erc20'])
      expect(new Set(ids(all)).size).toBe(all.length)
    }
  })

  it('more than one page of rows in a single block (internal list), read through deeper windows', async () => {
    const data = {
      txlist: [tx(500, 0), tx(300, 0)],
      txlistinternal: Array.from({ length: 130 }, (_, i) => internal(400, 7, `0_${i}`)),
    }
    const { f, calls } = sim(data)
    const pages = await walk(f)
    const all = pages.flatMap((p) => p.items)
    expect(all).toHaveLength(132)
    expect(pages.every((p) => !p.incomplete)).toBe(true)
    expect(all.map((i) => i.blockNumber)).toEqual([500, ...Array(130).fill(400), 300])
    // within the block rows are numbered by traceId, numerically (0_2 before 0_10)
    expect(all.filter((i) => i.blockNumber === 400).map((i) => i.id.split(':')[1])).toEqual(
      Array.from({ length: 130 }, (_, i) => String(i)),
    )
    expect(calls.length).toBeLessThanOrEqual(12 * pages.length)
  })

  it('same row stream with different in-block upstream order gives the same pages', async () => {
    const data = {
      txlist: Array.from({ length: 60 }, (_, i) => tx(900 - Math.floor(i / 3), i % 3)),
      tokentx: Array.from({ length: 60 }, (_, i) => token(900 - Math.floor(i / 2), i % 3, { value: String(i % 4) })),
    }
    const a = (await walk(sim(data, false).f)).flatMap((p) => p.items)
    const b = (await walk(sim(data, true).f)).flatMap((p) => p.items)
    expect(a.map((i) => [i.blockNumber, i.txIndex, i.kind, i.value])).toEqual(
      b.map((i) => [i.blockNumber, i.txIndex, i.kind, i.value]),
    )
  })

  it('randomized walk: ties across lists and blocks, no gap, no duplicate, no reorder', async () => {
    let s = 12345
    const rnd = (m: number) => ((s = (s * 1103515245 + 12345) & 0x7fffffff), s % m)
    const data: Record<List, Row[]> = { txlist: [], txlistinternal: [], tokentx: [] }
    let total = 0
    for (let i = 0; i < 400; i++) {
      const block = 10_000 - rnd(40) // 40 blocks, ~10 rows each: lots of same-block rows
      const ti = rnd(3)
      const h = hash(100_000 + i)
      const pick = rnd(3)
      if (pick === 0) data.txlist.push(tx(block, ti, { hash: h }))
      else if (pick === 1) data.txlistinternal.push(internal(block, ti, `0_${rnd(5)}_${i}`, { hash: h }))
      else data.tokentx.push(token(block, ti, { hash: h, value: String(rnd(3)) }))
      total++
      if (rnd(10) === 0) data.tokentx.push(token(block, ti, { hash: h, contractAddress: FAKE_ETH }))
    }
    const pages = await walk(sim(data, true).f)
    const all = pages.flatMap((p) => p.items)
    expect(all).toHaveLength(total)
    expect(new Set(ids(all)).size).toBe(total)
    expect(pages.every((p) => !p.incomplete && p.items.length <= HISTORY_PAGE_SIZE)).toBe(true)
    for (let i = 1; i < all.length; i++) {
      const [p, c] = [all[i - 1]!, all[i]!]
      expect(p.blockNumber > c.blockNumber || (p.blockNumber === c.blockNumber && p.txIndex >= c.txIndex)).toBe(true)
    }
    expect(pages.slice(0, -1).every((p) => p.items.length === HISTORY_PAGE_SIZE)).toBe(true)
  })

  it('a block that cannot be read in full: safe rows + incomplete, cursor skips that block and paging goes on', async () => {
    const data = {
      txlist: [tx(900, 0), tx(100, 0)],
      txlistinternal: Array.from({ length: 3500 }, (_, i) => internal(500, 1, `0_${i}`)),
    }
    const pages = await walk(sim(data).f)
    expect(pages[0]).toMatchObject({ incomplete: true })
    expect(pages[0]!.items.map((i) => i.blockNumber)).toEqual([900])
    expect(pages[0]!.nextCursor).toMatch(/^[0-9a-f]{8}:500:-1:0$/)
    expect(pages[1]!.items.map((i) => i.blockNumber)).toEqual([100])
    expect(pages[1]!.incomplete).toBe(false)
    expect(pages[1]!.nextCursor).toBeNull()
  })
})

describe('cursor', () => {
  it('is bound to the address (hash prefix) and rejects garbage', async () => {
    const data = { txlist: Array.from({ length: 60 }, (_, i) => tx(1000 - i)) }
    const p = await loadHistory(sim(data).f, ME)
    const cursor = p.nextCursor!
    expect(cursor.startsWith((await addressHash(ME)).slice(0, 8) + ':')).toBe(true)
    expect(cursor).not.toContain(ME.slice(2, 12))
    await expect(loadHistory(sim(data).f, OTHER, cursor)).rejects.toBeInstanceOf(InvalidCursorError)
    for (const bad of ['', 'x', cursor + ':1', cursor.replace(/:\d+$/, ':-2'), cursor.toUpperCase(), '12345678:1:2']) {
      await expect(loadHistory(sim(data).f, ME, bad)).rejects.toBeInstanceOf(InvalidCursorError)
    }
  })

  it('does not call upstream before the cursor is validated', async () => {
    const { f, calls } = sim({})
    await expect(loadHistory(f, ME, 'nope')).rejects.toBeInstanceOf(InvalidCursorError)
    expect(calls).toHaveLength(0)
  })

  it('asks upstream for endblock = cursor block (deep pages do not use page numbers)', async () => {
    const data = { txlist: Array.from({ length: 60 }, (_, i) => tx(1000 - i)) }
    const p = await loadHistory(sim(data).f, ME)
    const { f, calls } = sim(data)
    await loadHistory(f, ME, p.nextCursor!)
    expect(calls.map(([, q]) => q)).toEqual(Array(3).fill({ endblock: 951, page: 1, offset: 100 }))
  })
})
