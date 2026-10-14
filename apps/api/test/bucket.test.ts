import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { BURST, MAX_WAIT_MS, take } from '../src/bucket.ts'

describe('token bucket (2.5/s, burst 3, wait <= 2 s)', () => {
  it('serves a burst, then makes callers wait 400 ms apart', () => {
    const b = { tokens: BURST, at: 0 }
    expect([take(b, 0), take(b, 0), take(b, 0)]).toEqual([0, 0, 0])
    expect(take(b, 0)).toBe(400)
    expect(take(b, 0)).toBe(800)
  })

  it('refills with time, capped at the burst', () => {
    const b = { tokens: 0, at: 0 }
    expect(take(b, 400)).toBe(0)
    expect(take(b, 400)).toBe(400)
    const idle = { tokens: 0, at: 0 }
    take(idle, 60_000)
    expect(idle.tokens).toBeLessThanOrEqual(BURST - 1)
  })

  it('refuses when the wait would be over the limit, without taking a token', () => {
    const b = { tokens: BURST, at: 0 }
    const waits = Array.from({ length: 12 }, () => take(b, 0))
    expect(waits.slice(0, 3)).toEqual([0, 0, 0])
    expect(waits.filter((w) => w !== null && w > 0).every((w) => w! <= MAX_WAIT_MS)).toBe(true)
    expect(waits.at(-1)).toBeNull()
    const before = b.tokens
    expect(take(b, 0)).toBeNull()
    expect(b.tokens).toBe(before)
  })

  it('Durable Object: one instance decides for every caller; another name has its own bucket', async () => {
    const name = crypto.randomUUID()
    const waits = await Promise.all(Array.from({ length: 5 }, () => env.ETHERSCAN_BUCKET.getByName(name).acquire()))
    expect(waits.filter((w) => w === 0)).toHaveLength(3)
    expect(waits.filter((w) => w !== null && w > 0)).toHaveLength(2)
    expect(await env.ETHERSCAN_BUCKET.getByName(crypto.randomUUID()).acquire()).toBe(0)
  })
})
