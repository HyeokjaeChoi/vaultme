import { HISTORY_PAGE_SIZE, USDC_SEPOLIA, type HistoryItem, type HistoryResponse } from '@vaultme/contracts'
import { z } from 'zod'
import { InvalidCursorError, UpstreamError } from './errors.ts'
import { at } from './util.ts'

// Merge and paging of the three Etherscan lists. Pure: the caller injects the fetch (ARCHITECTURE.md#history).
export type List = 'txlist' | 'txlistinternal' | 'tokentx'
const LISTS: readonly List[] = ['txlist', 'txlistinternal', 'tokentx']
export type Query = { endblock?: number; page: number; offset: number }
export type FetchList = (list: List, q: Query) => Promise<unknown[]>

// First read is small. A list that is full may hide more rows of its lowest block, so it is read again with
// bigger windows (page 1 replaces, later pages append). 12 upstream calls at most. 3 pages x 1000 << 10000 window.
const ATTEMPTS = [
  { page: 1, offset: 100 },
  { page: 1, offset: 1000 },
  { page: 2, offset: 1000 },
  { page: 3, offset: 1000 },
] as const

const USDC = USDC_SEPOLIA.toLowerCase()
const Num = z.string().regex(/^\d{1,18}$/)
const Addr = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((s) => s.toLowerCase())
const Common = z.object({
  hash: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .transform((s) => s.toLowerCase()),
  blockNumber: Num,
  timeStamp: Num,
  transactionIndex: Num,
  from: Addr,
  to: Addr.or(z.literal('')),
  value: z.string().regex(/^\d+$/),
})
const Row = {
  txlist: Common.extend({ isError: z.string().optional(), txreceipt_status: z.string().optional() }),
  txlistinternal: Common.extend({ traceId: z.string().min(1), isError: z.string().optional() }),
  tokentx: Common.extend({ contractAddress: z.string() }),
}

type Cand = { key: string; order: string; block: number; txIndex: number; item: Omit<HistoryItem, 'id'> }
type Placed = Cand & { seq: number }

const pad = (s: string, n: number) => s.padStart(n, '0')

/** Rows of one list -> candidates. `bottom` = lowest block among ALL rows read (also the ones dropped here). */
function normalize(
  list: List,
  rows: unknown[],
  addr: string,
  sent: ReadonlySet<string>,
): { cands: Cand[]; bottom: number } {
  const cands: Cand[] = []
  const repeats = new Map<string, number>()
  let bottom = Infinity
  rows.forEach((raw) => {
    const p = Row[list].safeParse(raw)
    if (!p.success) throw new UpstreamError('bad row')
    const r = p.data as z.infer<typeof Common> & {
      isError?: string
      txreceipt_status?: string
      traceId?: string
      contractAddress?: string
    }
    const block = Number(r.blockNumber)
    bottom = Math.min(bottom, block)
    // Etherscan puts native ETH moves into tokentx as a fake token (contract 0xff..fe). Only USDC is real.
    if (list === 'tokentx' && r.contractAddress?.toLowerCase() !== USDC) return
    if (r.from !== addr && r.to !== addr) return
    const base = {
      hash: r.hash,
      blockNumber: block,
      txIndex: Number(r.transactionIndex),
      timestamp: Number(r.timeStamp),
      value: r.value,
      from: r.from,
      to: r.to || null,
    }
    const zeroValue = /^0+$/.test(r.value)
    // #53: a zero-value token row is outgoing only when WE sent the tx (txlist `from` = tx sender). A token log `from` == us is
    // not enough: anyone can emit it with transferFrom(us, victim, 0). No txlist row of ours for the hash => unknown => hidden.
    const spoofable = list === 'tokentx' && zeroValue && !sent.has(r.hash)
    const common = { ...base, direction: r.from === addr && !spoofable ? ('out' as const) : ('in' as const), zeroValue }
    const bad = r.isError === '1' || r.txreceipt_status === '0'
    let key: string, order: string, item: Omit<HistoryItem, 'id'>
    if (list === 'txlist') {
      key = `tx:${r.hash}`
      order = '0'
      item = { ...common, kind: 'native', asset: 'ETH', status: bad ? 'failed' : 'ok' }
    } else if (list === 'txlistinternal') {
      if (r.traceId === undefined) throw new UpstreamError('bad row') // Row.txlistinternal requires it
      key = `int:${r.hash}:${r.traceId}`
      order = `1${r.traceId
        .split('_')
        .map((s) => pad(s, 10))
        .join('_')}`
      item = { ...common, kind: 'internal', asset: 'ETH', status: bad ? 'failed' : 'ok' }
    } else {
      // No logIndex: identical rows of one tx are told apart by their count. They are interchangeable, so the
      // response order does not matter, and the in-tx order below does not depend on it either.
      const same = `${r.hash}:${r.from}:${r.to}:${r.value}`
      const n = repeats.get(same) ?? 0
      repeats.set(same, n + 1)
      key = `tok:${r.hash}:${USDC}:${r.from}:${r.to}:${r.value}:${String(n)}`
      order = `2${r.from}:${r.to}:${pad(r.value, 40)}:${pad(String(n), 6)}`
      item = { ...common, kind: 'erc20', asset: 'USDC', status: 'ok' }
    }
    cands.push({ key, order, block, txIndex: item.txIndex, item })
  })
  return { cands, bottom }
}

/** Dedupe, sort newest first, number the rows of each tx. Order inside a tx: native, internal (traceId), erc20. */
function place(cands: Cand[]): Placed[] {
  const seen = new Set<string>()
  const groups = new Map<string, Cand[]>()
  for (const c of cands) {
    if (seen.has(c.key)) continue
    seen.add(c.key)
    const g = `${String(c.block)}:${String(c.txIndex)}`
    groups.set(g, [...(groups.get(g) ?? []), c])
  }
  return [...groups.values()]
    .sort((a, b) => at(b, 0).block - at(a, 0).block || at(b, 0).txIndex - at(a, 0).txIndex)
    .flatMap((g) =>
      g.sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0)).map((c, seq) => ({ ...c, seq })),
    )
}

export async function addressHash(addr: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(addr.toLowerCase()))
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

// Cursor `<h8>:<block>:<txIndex>:<seq>` = position of the last row of the page. Next page = rows strictly after it.
// h8 = first 8 hex of SHA-256(lowercase address). seq = index of the row inside its (block, txIndex) group
// in the merged order above, so it is the same on every read as long as the whole block was read.
// `txIndex = -1` means "the whole block is done" (used to skip a block that cannot be read, see `incomplete`).
type Cursor = { block: number; txIndex: number; seq: number }
const CURSOR = /^([0-9a-f]{8}):(\d{1,12}):(-1|\d{1,9}):(\d{1,9})$/

/** Throws InvalidCursorError. Run before any cache read or upstream call. */
export async function checkCursor(address: string, cursor: string | undefined): Promise<void> {
  if (cursor !== undefined) parseCursor(cursor, (await addressHash(address)).slice(0, 8))
}

function parseCursor(s: string, h8: string): Cursor {
  const m = CURSOR.exec(s)
  if (m?.[1] !== h8) throw new InvalidCursorError()
  return { block: Number(m[2]), txIndex: Number(m[3]), seq: Number(m[4]) }
}
const fmt = (h8: string, block: number, txIndex: number, seq: number) =>
  `${h8}:${String(block)}:${String(txIndex)}:${String(seq)}`
const isAfter = (c: Cursor) => (p: Placed) =>
  p.block < c.block || (p.block === c.block && (p.txIndex < c.txIndex || (p.txIndex === c.txIndex && p.seq > c.seq)))

/**
 * One page (50 rows) of the merged history, newest first.
 *
 * Each list is read `sort=desc` up to `endblock` = the cursor block (inclusive), so the cursor block is read in full
 * and the rows at or before the cursor are filtered out. A list that returned a full window may have more rows in its
 * lowest block `bottom`. So only blocks above H = max(bottom of full lists) are safe to show. If fewer than 50 safe
 * rows exist, the limiting lists are read deeper. When they cannot be (ATTEMPTS used up), the safe rows are returned
 * with `incomplete: true` and a cursor that skips block H: its rows are lost, which is flagged instead of guessed.
 */
export async function loadHistory(fetchList: FetchList, address: string, cursor?: string): Promise<HistoryResponse> {
  const addr = address.toLowerCase()
  const h8 = (await addressHash(addr)).slice(0, 8)
  const cur = cursor === undefined ? null : parseCursor(cursor, h8)
  const endblock = cur ? (cur.txIndex < 0 ? cur.block - 1 : cur.block) : undefined
  if (endblock !== undefined && endblock < 0) return { items: [], nextCursor: null, incomplete: false }

  const st = LISTS.map(() => ({ rows: [] as unknown[], next: 0, full: false }))
  const read = (idx: number[]) =>
    Promise.all(
      idx.map(async (i) => {
        const s = at(st, i)
        const a = at(ATTEMPTS, s.next)
        const got = await fetchList(at(LISTS, i), { ...(endblock === undefined ? {} : { endblock }), ...a })
        s.rows = s.next <= 1 ? got : [...s.rows, ...got]
        s.next++
        s.full = got.length >= a.offset
      }),
    )
  await read([0, 1, 2])

  for (;;) {
    // txlist is first in LISTS. Its rows are complete above H, the only rows that are returned (see below).
    const txPart = normalize('txlist', at(st, 0).rows, addr, new Set())
    const sent = new Set(txPart.cands.filter((c) => c.item.from === addr).map((c) => c.item.hash))
    const parts = LISTS.map((l, i) => (i === 0 ? txPart : normalize(l, at(st, i).rows, addr, sent)))
    const H = Math.max(-1, ...parts.map((p, i) => (at(st, i).full ? p.bottom : -1)))
    const all = place(parts.flatMap((p) => p.cands))
    const placed = cur ? all.filter(isAfter(cur)) : all
    const safe = placed.filter((p) => p.block > H)
    const anyFull = st.some((s) => s.full)
    if (safe.length >= HISTORY_PAGE_SIZE || !anyFull) {
      const page = safe.slice(0, HISTORY_PAGE_SIZE)
      const last = page.at(-1)
      const more = placed.length > HISTORY_PAGE_SIZE || anyFull
      return {
        items: page.map(toItem),
        nextCursor: last && more ? fmt(h8, last.block, last.txIndex, last.seq) : null,
        incomplete: false,
      }
    }
    const limiting = st.flatMap((s, i) => (s.full && at(parts, i).bottom === H ? [i] : []))
    if (limiting.every((i) => at(st, i).next < ATTEMPTS.length)) {
      await read(limiting)
      continue
    }
    return { items: safe.map(toItem), nextCursor: fmt(h8, H, -1, 0), incomplete: true }
  }
}

const toItem = (p: Placed): HistoryItem => ({ id: `${p.item.hash}:${String(p.seq)}`, ...p.item })
