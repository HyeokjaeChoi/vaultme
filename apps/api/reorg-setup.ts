import { spawn } from 'node:child_process'
import { ANVIL_PORT } from './test-reorg/anvil.ts'

/** Vitest globalSetup (Node side): starts one anvil for the reorg tests and stops it after them. Needs `anvil` on PATH (Foundry). */
export default async function setup(): Promise<() => void> {
  const proc = spawn('anvil', ['--port', String(ANVIL_PORT), '--silent'], { stdio: 'ignore' })
  const failed = new Promise<never>((_, reject) => proc.once('error', reject))
  const ready = (async () => {
    for (let i = 0; i < 100; i++) {
      try {
        await fetch(`http://127.0.0.1:${String(ANVIL_PORT)}`, { method: 'POST', body: '{}' })
        return
      } catch {
        await new Promise((r) => setTimeout(r, 100))
      }
    }
    throw new Error('anvil did not start')
  })()
  await Promise.race([ready, failed])
  return () => void proc.kill()
}
