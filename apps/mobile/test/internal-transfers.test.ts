import { afterEach, describe, expect, it, vi } from 'vitest'
import { INTERNAL_DEADLINE_MS, internalRow, loadInternal, wantsInternal } from '../src/features/history/model/internal'

const H = '0x' + '1'.repeat(64)
const A = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8'
const B = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc'
const item = (value: string, ok = true) => ({ from: A, to: B, value, ok })

afterEach(() => vi.useRealTimers())

describe('loadInternal', () => {
  it('reads the items of the hash as bigint wei', async () => {
    const read = vi.fn().mockResolvedValue({ items: [item('50000000000000000'), item('1', false)] })
    const s = await loadInternal(read, H)
    expect(read).toHaveBeenCalledWith(H)
    expect(s).toEqual({
      status: 'ok',
      items: [
        { from: A, to: B, value: 50000000000000000n, ok: true },
        { from: A, to: B, value: 1n, ok: false },
      ],
    })
  })

  it('no items is an ok list (the section hides itself)', async () => {
    expect(await loadInternal(() => Promise.resolve({ items: [] }), H)).toEqual({ status: 'ok', items: [] })
  })

  it('a failed or misshapen read fails only the section, it never throws', async () => {
    expect(await loadInternal(() => Promise.reject(new Error('offline')), H)).toEqual({ status: 'failed' })
    expect(await loadInternal(() => Promise.resolve({ items: 'x' }), H)).toEqual({ status: 'failed' })
  })

  it('a read that never answers fails the section after the deadline', async () => {
    vi.useFakeTimers()
    const p = loadInternal(() => new Promise(() => undefined), H)
    await vi.advanceTimersByTimeAsync(INTERNAL_DEADLINE_MS)
    expect(await p).toEqual({ status: 'failed' })
  })
})

describe('wantsInternal', () => {
  it('only a real transaction hash is read', () => {
    expect(wantsInternal(H)).toBe(true)
    expect(wantsInternal('dev:0')).toBe(false)
    expect(wantsInternal('1')).toBe(false)
  })
})

describe('internalRow', () => {
  it('ok: plain title, short from → to, amount in ETH', () => {
    expect(internalRow({ from: A, to: B, value: 50000000000000000n, ok: true })).toEqual({
      title: 'detail.internal.row',
      detail: '0x7099…79C8 → 0x3C44…93BC',
      amount: '0.05 ETH',
      ok: true,
    })
  })
  it('failed: failed title; a contract creation has no recipient', () => {
    expect(internalRow({ from: A, to: null, value: 1n, ok: false })).toMatchObject({
      title: 'detail.internal.rowFailed',
      detail: '0x7099…79C8 → —',
      ok: false,
    })
  })
})
