import { runInDurableObject } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { describe, expect, it, vi } from 'vitest'
import {
  BURST,
  DAILY_REFUSE,
  DAILY_WARN,
  MAX_WAIT_MS,
  SAVE_EVERY,
  WINDOW_MS,
  count,
  refused,
  restore,
  secondsToMidnight,
  take,
  utcDay,
  type Bucket,
  type Day,
  type EtherscanBucket,
} from '../src/bucket.ts'

describe('rolling window (3 calls per 1200 ms = 2.5/s, wait <= 2 s)', () => {
  it('lets one history page (3 calls) start at once, then spaces the next burst a window later', () => {
    const b: Bucket = { starts: [] }
    expect(Array.from({ length: 6 }, () => take(b, 0))).toEqual([0, 0, 0, 1200, 1200, 1200])
  })

  it('never puts more than BURST starts in any WINDOW_MS, so never more than 3 in any second', () => {
    const b: Bucket = { starts: [] }
    const starts: number[] = []
    for (let now = 0; now < 20_000; now += 137) {
      const w = take(b, now)
      if (w !== null) starts.push(now + w)
    }
    starts.sort((a, c) => a - c)
    expect(starts.length).toBeGreaterThan(20)
    for (const s of starts) {
      expect(starts.filter((t) => t >= s && t < s + WINDOW_MS).length).toBeLessThanOrEqual(BURST)
      expect(starts.filter((t) => t >= s && t < s + 1000).length).toBeLessThanOrEqual(3)
    }
  })

  it('is free again after the window has passed', () => {
    const b: Bucket = { starts: [] }
    take(b, 0)
    take(b, 0)
    take(b, 0)
    expect(take(b, WINDOW_MS)).toBe(0)
  })

  it('refuses when the wait would be over the limit, without reserving a slot', () => {
    const b: Bucket = { starts: [] }
    const waits = Array.from({ length: 9 }, () => take(b, 0))
    expect(waits.slice(0, 6)).toEqual([0, 0, 0, 1200, 1200, 1200])
    expect(waits.slice(6).every((w) => w === null)).toBe(true)
    expect(waits.every((w) => w === null || w <= MAX_WAIT_MS)).toBe(true)
    const before = [...b.starts]
    expect(take(b, 0)).toBeNull()
    expect(b.starts).toEqual(before)
  })

  it('Durable Object: one instance decides for every caller; another name has its own bucket', async () => {
    const name = crypto.randomUUID()
    const t0 = Date.now()
    const waits = await Promise.all(Array.from({ length: 5 }, () => env.ETHERSCAN_BUCKET.getByName(name).acquire()))
    const elapsed = Date.now() - t0 // the real clock moves while the 5 calls travel; the bound follows it (#583, was a fixed 150 ms margin)
    const sorted = [...(waits as number[])].sort((a, b) => a - b)
    expect(sorted.slice(0, 3).every((w) => w === 0)).toBe(true)
    sorted.slice(3).forEach((w) => {
      expect(w).toBeLessThanOrEqual(WINDOW_MS)
      expect(w).toBeGreaterThanOrEqual(WINDOW_MS - elapsed)
    })
    expect(await env.ETHERSCAN_BUCKET.getByName(crypto.randomUUID()).acquire()).toBe(0)
  })
})

describe('daily budget (API-2: Etherscan blocks the free key at 100,000 calls a day)', () => {
  const T = Date.UTC(2026, 10, 16, 13, 0, 0) // 13:00:00 UTC
  const today = utcDay(T)

  it('warns at 80,000 and refuses at 95,000, under the 100,000 Etherscan limit', () => {
    expect([DAILY_WARN, DAILY_REFUSE]).toEqual([80_000, 95_000])
    expect(refused({ day: today, calls: DAILY_REFUSE - 1 }, T)).toBe(false)
    expect(refused({ day: today, calls: DAILY_REFUSE }, T)).toBe(true)
  })

  it('counts a call and starts again at 00:00 UTC', () => {
    expect(count({ day: today, calls: 5 }, T)).toEqual({ day: today, calls: 6 })
    expect(count({ day: today - 1, calls: 94_999 }, T)).toEqual({ day: today, calls: 1 })
    expect(refused({ day: today - 1, calls: 99_999 }, T)).toBe(false)
  })

  it('gives the seconds to 00:00 UTC: 1 to 86,400', () => {
    expect(secondsToMidnight(T)).toBe(11 * 3600)
    expect(secondsToMidnight(Date.UTC(2026, 10, 16, 0, 0, 0))).toBe(86_400)
    expect(secondsToMidnight(Date.UTC(2026, 10, 16, 23, 59, 59, 999))).toBe(1)
  })

  it('a restart over-counts by at most SAVE_EVERY and never under-counts', () => {
    expect(restore(undefined)).toEqual({ day: 0, calls: 0 })
    expect(restore({ day: today, calls: 600 })).toEqual({ day: today, calls: 600 + SAVE_EVERY })
  })

  const inside = <T>(name: string, f: (o: EtherscanBucket, state: DurableObjectState) => T | Promise<T>) =>
    runInDurableObject(env.ETHERSCAN_BUCKET.getByName(name), f)
  const setDay = (o: EtherscanBucket, d: Day) => void ((o as unknown as { d: Day }).d = d)

  it('Durable Object: the call after the 95,000th is refused with the seconds to 00:00 UTC, and a refusal is not counted', async () => {
    const name = crypto.randomUUID()
    const now = Date.now()
    await inside(name, (o) => setDay(o, { day: utcDay(now), calls: DAILY_REFUSE - 1 }))
    expect(await env.ETHERSCAN_BUCKET.getByName(name).acquire()).toBe(0) // the 95,000th call
    const refusal = await env.ETHERSCAN_BUCKET.getByName(name).acquire()
    const seconds = (refusal as { refusedForSeconds: number }).refusedForSeconds
    expect(Object.keys(refusal as object)).toEqual(['refusedForSeconds'])
    expect(seconds).toBeGreaterThanOrEqual(1)
    expect(seconds).toBeLessThanOrEqual(86_400)
    const windowBefore = await inside(name, (o) => [...(o as unknown as { b: Bucket }).b.starts])
    await env.ETHERSCAN_BUCKET.getByName(name).acquire()
    expect(await inside(name, (o) => (o as unknown as { b: Bucket }).b.starts)).toEqual(windowBefore) // a refusal takes no rate slot
    expect(await inside(name, (o) => (o as unknown as { d: Day }).d.calls)).toBe(DAILY_REFUSE)
  })

  it('Durable Object: a call held back by the rate window is not counted (only reserved calls are)', async () => {
    const name = crypto.randomUUID()
    const waits = await Promise.all(Array.from({ length: 9 }, () => env.ETHERSCAN_BUCKET.getByName(name).acquire()))
    const granted = waits.filter((w) => w !== null).length
    expect(granted).toBe(6) // 3 now, 3 a window later; the other 3 would wait over 2 s
    expect(await inside(name, (o) => (o as unknown as { d: Day }).d.calls)).toBe(granted)
  })

  it('Durable Object: the warn line also comes when a restart jumped over 80,000 (restored count already at it)', async () => {
    const name = crypto.randomUUID()
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      await inside(name, (o) => setDay(o, { day: utcDay(Date.now()), calls: DAILY_WARN }))
      await env.ETHERSCAN_BUCKET.getByName(name).acquire()
      await env.ETHERSCAN_BUCKET.getByName(name).acquire()
      expect(log.mock.calls.filter((c) => String(c[0]).includes('etherscan_daily_budget_warn'))).toHaveLength(1)
    } finally {
      log.mockRestore()
    }
  })

  it('Durable Object: a new instance restores the stored count plus SAVE_EVERY (the constructor reads the storage)', async () => {
    const name = crypto.randomUUID()
    const day = utcDay(Date.now())
    await inside(name, (_o, state) => state.storage.put('day', { day, calls: 600 })) // committed before the reset
    await inside(name, (_o, state) => state.abort('test: start a new instance')).catch(() => undefined) // the next call builds the object again
    await env.ETHERSCAN_BUCKET.getByName(name).acquire()
    expect(await inside(name, (o) => (o as unknown as { d: Day }).d.calls)).toBe(600 + SAVE_EVERY + 1)
  })

  it('Durable Object: the first call of a day is stored, so a restart cannot fall back to the day before', async () => {
    const name = crypto.randomUUID()
    const day = utcDay(Date.now())
    await inside(name, (o) => setDay(o, { day: day - 1, calls: 94_950 }))
    await env.ETHERSCAN_BUCKET.getByName(name).acquire()
    expect(await inside(name, (_o, state) => state.storage.get('day'))).toEqual({ day, calls: 1 })
  })

  it('Durable Object: one warn line when the count reaches 80,000, none after', async () => {
    const name = crypto.randomUUID()
    const log = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    try {
      await inside(name, (o) => setDay(o, { day: utcDay(Date.now()), calls: DAILY_WARN - 2 }))
      for (let i = 0; i < 4; i++) await env.ETHERSCAN_BUCKET.getByName(name).acquire()
      const lines = log.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('etherscan_daily_budget_warn'))
      expect(lines).toHaveLength(1)
    } finally {
      log.mockRestore()
    }
  })

  it('Durable Object: the count is stored every SAVE_EVERY calls, so an eviction loses at most SAVE_EVERY', async () => {
    const name = crypto.randomUUID()
    const day = utcDay(Date.now())
    await inside(name, (o) => setDay(o, { day, calls: SAVE_EVERY - 2 }))
    await env.ETHERSCAN_BUCKET.getByName(name).acquire() // 49 counted: not stored yet
    expect(await inside(name, (_o, state) => state.storage.get('day'))).toBeUndefined()
    await env.ETHERSCAN_BUCKET.getByName(name).acquire() // 50 counted: stored
    expect(await inside(name, (_o, state) => state.storage.get('day'))).toEqual({ day, calls: SAVE_EVERY })
  })
})
