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
describe('flows/config.yaml order', () => {
  const cfg = readFileSync(join(__dirname, '..', '.maestro', 'flows', 'config.yaml'), 'utf8')
  const order = [...cfg.matchAll(/^\s+- (\S+)\s*$/gm)].map((m) => m[1])
  it('lists every flow once, with the funded flows last and funded-1 before funded-2', () => {
    const files = readdirSync(join(__dirname, '..', '.maestro', 'flows'))
      .filter((f) => f.endsWith('.yaml') && f !== 'config.yaml')
      .map((f) => f.replace(/\.yaml$/, ''))
    expect([...order].sort()).toEqual([...files].sort())
    expect(order.slice(-2)).toEqual(['funded-1-send', 'funded-2-receive'])
  })
})
