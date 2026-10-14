import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { BURST, MAX_WAIT_MS, take } from '../src/bucket.ts'

describe('token bucket (2.5/s, no burst, wait <= 2 s)', () => {
  it('spaces callers 400 ms apart: never more than 3 calls in any second', () => {
    const b = { tokens: BURST, at: 0 }
    expect([take(b, 0), take(b, 0), take(b, 0), take(b, 0)]).toEqual([0, 400, 800, 1200])
  })

  it('refills with time, capped at the burst', () => {
    const b = { tokens: 0, at: 0 }
    expect(take(b, 400)).toBe(0)
    expect(take(b, 400)).toBe(400)
    const idle = { tokens: 0, at: 0 }
    take(idle, 60_000)
    expect(idle.tokens).toBe(BURST - 1) // refilled only up to the cap, then one taken
  })

  it('refuses when the wait would be over the limit, without taking a token', () => {
    const b = { tokens: BURST, at: 0 }
    const waits = Array.from({ length: 12 }, () => take(b, 0))
    expect(waits.slice(0, 6)).toEqual([0, 400, 800, 1200, 1600, 2000])
    expect(waits.slice(6).every((w) => w === null)).toBe(true)
    expect(waits.every((w) => w === null || w <= MAX_WAIT_MS)).toBe(true)
    const before = b.tokens
    expect(take(b, 0)).toBeNull()
    expect(b.tokens).toBe(before)
  })

  it('Durable Object: one instance decides for every caller; another name has its own bucket', async () => {
    const name = crypto.randomUUID()
    const waits = await Promise.all(Array.from({ length: 5 }, () => env.ETHERSCAN_BUCKET.getByName(name).acquire()))
    // the real clock moves between calls, so each wait may be a little under its ideal
    const sorted = [...waits].sort((a, b) => a! - b!)
    sorted.forEach((w, i) => {
      expect(w).toBeLessThanOrEqual(400 * i)
      expect(w).toBeGreaterThan(400 * i - 150)
    })
    expect(await env.ETHERSCAN_BUCKET.getByName(crypto.randomUUID()).acquire()).toBe(0)
  })
})
