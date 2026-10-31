import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { BURST, MAX_WAIT_MS, WINDOW_MS, take, type Bucket } from '../src/bucket.ts'

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
    const waits = await Promise.all(Array.from({ length: 5 }, () => env.ETHERSCAN_BUCKET.getByName(name).acquire()))
    const sorted = [...waits].sort((a, b) => a! - b!)
    expect(sorted.slice(0, 3).every((w) => w === 0)).toBe(true)
    // the real clock moves between calls, so the second burst may be a little under the window
    sorted.slice(3).forEach((w) => {
      expect(w).toBeLessThanOrEqual(WINDOW_MS)
      expect(w).toBeGreaterThan(WINDOW_MS - 150)
    })
    expect(await env.ETHERSCAN_BUCKET.getByName(crypto.randomUUID()).acquire()).toBe(0)
  })
})
