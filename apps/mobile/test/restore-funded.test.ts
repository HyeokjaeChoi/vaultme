import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

// Wallet A has no BIP39 passphrase, so release-wallet-env.mts prints MAESTRO_*_PASSPHRASE= (empty). Maestro hands an empty shell value to the
// flow as the text 'undefined' (Android dry run 44232240159: "Inputting text: undefined"), and restore-funded then typed it into the
// passphrase field and restored another wallet (tag run 44225225354). The condition must be false for '' and 'undefined'.
const text = readFileSync(join(__dirname, '..', '.maestro', 'subflows', 'restore-funded.yaml'), 'utf8')
const expr = /^\s*true: \$\{(.+)\}\s*$/m.exec(text)?.[1] ?? ''
const hasPassphrase = (PASSPHRASE: string) => runInNewContext(expr, { PASSPHRASE }) as boolean

describe('restore-funded passphrase condition', () => {
  it('reads the condition from the flow', () => {
    expect(expr).not.toBe('')
  })
  it('is false for no passphrase, empty or undefined', () => {
    expect(hasPassphrase('')).toBe(false)
    expect(hasPassphrase('undefined')).toBe(false)
  })
  it('is true for wallet B passphrase', () => {
    expect(hasPassphrase('vaultme-e2e-b')).toBe(true)
  })
})

// The Android job on Linux ran funded-2-receive before funded-1-send (tag run 44225225354): flows/config.yaml fixes the order.
// Maestro 2.11.0 keys a flow by its `name:` when it has one (the file name only when it has none), so the list holds the names.
describe('flows/config.yaml order', () => {
  const dir = join(__dirname, '..', '.maestro', 'flows')
  const cfg = readFileSync(join(dir, 'config.yaml'), 'utf8')
  const order = [...cfg.matchAll(/^\s+- '(.+)'\s*$/gm)].map((m) => m[1])
  const flows = readdirSync(dir)
    .filter((f) => f.endsWith('.yaml') && f !== 'config.yaml')
    .map((f) => {
      const text = readFileSync(join(dir, f), 'utf8')
      return {
        name: /^name: (.+)$/m.exec(text)?.[1] ?? f.replace(/\.yaml$/, ''),
        file: f,
        tags: /^tags: \[(.*)\]$/m.exec(text)?.[1] ?? '',
      }
    })
  it('lists every flow by its name once', () => {
    expect([...order].sort()).toEqual(flows.map((f) => f.name).sort())
  })
  it('puts the funded flows last, funded-1 before funded-2', () => {
    const nameOf = (file: string) => flows.find((f) => f.file === file)!.name
    expect(order.slice(-2)).toEqual([nameOf('funded-1-send.yaml'), nameOf('funded-2-receive.yaml')])
  })
  // Maestro fails the whole run ("Could not find flows") when the first listed flow is filtered out by the tags of the run.
  it('starts with a flow that every run mode includes', () => {
    const first = flows.find((f) => f.name === order[0])!
    expect(first.tags).toContain('smoke')
    expect(first.tags).toContain('critical')
  })
})
