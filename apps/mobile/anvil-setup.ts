import { spawn } from 'node:child_process'
import { ANVIL_PORT } from './test-anvil/anvil.ts'

const URL = `http://127.0.0.1:${String(ANVIL_PORT)}`
const answers = (): Promise<boolean> =>
  fetch(URL, { method: 'POST', body: '{}' }).then(
    () => true,
    () => false,
  )

// Same shape as apps/api/reorg-setup.ts.
// ponytail: two ~35-line copies; extract a shared helper when a third anvil suite appears.
/**
 * Vitest globalSetup (Node side): starts one anvil for the send-lifecycle tests and stops it after them. Needs `anvil` on PATH (Foundry).
 * `--chain-id 11155111`: a tx signed for another chain is refused, like on Sepolia. `--no-mining`: a block exists only when a test
 * mines it. `--slots-in-an-epoch 2`: `safe` = head - 2, so a test reaches Confirmed after 2 more blocks (ADR-0006).
 */
export default async function setup(): Promise<() => void> {
  // Something else on the port would receive the tests' snapshot, revert and mining calls.
  if (await answers()) throw new Error(`port ${String(ANVIL_PORT)} is already in use`)
  const args = [
    '--port',
    String(ANVIL_PORT),
    '--chain-id',
    '11155111',
    '--slots-in-an-epoch',
    '2',
    '--no-mining',
    '--silent',
  ]
  const proc = spawn('anvil', args, { stdio: 'ignore' })
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
