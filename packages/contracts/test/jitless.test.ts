import { describe, expect, it, vi } from 'vitest'

// #515: zod probes `Function('')` when it builds its first schema; under a CSP without 'unsafe-eval' that is a violation.
// The entry must set `jitless` before any schema of this package exists.
describe('jitless', () => {
  it('is on once the entry is imported, before its first schema is parsed', async () => {
    vi.resetModules()
    const { config: fresh } = await import('zod/v4/core') // the zod copy the fresh entry will use
    expect(fresh().jitless).not.toBe(true)
    await import('../src/index.ts')
    expect(fresh().jitless).toBe(true)
  })
})
