import { spawn } from 'node:child_process'
import { ANVIL_PORT } from './test-reorg/anvil.ts'

const URL = `http://127.0.0.1:${String(ANVIL_PORT)}`
const answers = (): Promise<boolean> =>
  fetch(URL, { method: 'POST', body: '{}' }).then(
    () => true,
    () => false,
  )

/** Vitest globalSetup (Node side): starts one anvil for the reorg tests and stops it after them. Needs `anvil` on PATH (Foundry). */
export default async function setup(): Promise<() => void> {
  // Something else on the port would receive the tests' snapshot, revert and storage calls.
  if (await answers()) throw new Error(`port ${String(ANVIL_PORT)} is already in use`)
  const proc = spawn('anvil', ['--port', String(ANVIL_PORT), '--silent'], { stdio: 'ignore' })
  const failed = new Promise<never>((_, reject) => {
    proc.once('error', reject)
    proc.once('exit', (code) => reject(new Error(`anvil exited early (${String(code)})`)))
  })
  const ready = (async () => {
    for (let i = 0; i < 100; i++) {
      if (await answers()) return
      await new Promise((r) => setTimeout(r, 100))
    }
    throw new Error('anvil did not start')
  })()
  try {
    await Promise.race([ready, failed])
  } catch (e) {
    proc.kill()
    throw e
  }
  failed.catch(() => undefined) // a later exit is the teardown
  return () => void proc.kill()
}
