import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

// Q59 (#312): lints source text as if it were an existing file (type-aware parsing needs a real path) at a given path with the real eslint.config.mjs. The signer subpath is allowed in the
// send, backup and restore slices and shared/storage/keychain.ts only (owner decision 2026-11-01).
const eslint = new ESLint({ cwd: process.cwd(), overrideConfigFile: 'eslint.config.mjs' })
const code = "import { Mnemonic } from '@vaultme/wallet-core/signer'\nexport const m = Mnemonic\n"
const signerErrors = async (filePath: string) => {
  const [r] = await eslint.lintText(code, { filePath })
  return (r?.messages ?? []).filter((m) => m.ruleId === 'no-restricted-imports')
}

// Each lint of a new file type-checks it, so the first runs are slow.
describe('@vaultme/wallet-core/signer import rule', { timeout: 60_000 }, () => {
  it.each([
    'src/features/send/model/runSend.ts',
    'src/features/backup/model/createWallet.ts',
    'src/features/restore/model/restoreWallet.ts',
    'src/shared/storage/keychain.ts',
  ])('allows %s', async (f) => {
    expect(await signerErrors(f)).toEqual([])
  })

  it.each([
    'src/pages/send/amount.tsx',
    'src/widgets/review-panel/ReviewPanel.tsx',
    'src/features/history/model/internal.ts',
    'src/entities/account/model.ts',
    'src/shared/lib/amount.ts',
    'src/shared/storage/kv.ts',
  ])('rejects %s', async (f) => {
    const errors = await signerErrors(f)
    expect(errors).toHaveLength(1)
    expect(errors[0]?.message).toContain('Q59')
  })

  it('keeps the react-native rules in an allowed slice', async () => {
    const [r] = await eslint.lintText("import { Modal } from 'react-native'\nexport const m = Modal\n", {
      filePath: 'src/features/send/model/runSend.ts',
    })
    expect(r?.messages.some((m) => m.ruleId === 'no-restricted-imports')).toBe(true)
  })
})
