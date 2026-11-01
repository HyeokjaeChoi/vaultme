import { ESLint } from 'eslint'
import { expect, it } from 'vitest'

// Q59 (#312): the web app must not import the signer subpath.
it('rejects @vaultme/wallet-core/signer in apps/web', async () => {
  const eslint = new ESLint({ cwd: process.cwd(), overrideConfigFile: 'eslint.config.js' })
  const [r] = await eslint.lintText(
    "import { Mnemonic } from '@vaultme/wallet-core/signer'\nexport const m = Mnemonic\n",
    {
      filePath: 'app/shared/lib/address.ts',
    },
  )
  expect(r?.messages.filter((m) => m.ruleId === 'no-restricted-imports')).toHaveLength(1)
}, 60_000)
