import { zodResolver } from '@hookform/resolvers/zod'
import { isMnemonicWord, validateMnemonic } from '@vaultme/wallet-core'
import { MnemonicWordInput } from '@vaultme/contracts'
import { z } from 'zod'
import { visibleWords, type WordCount } from './cells'

// S05 form schema (ADR-0021, Q65). Shape of a word: contracts MnemonicWordInput. List membership and checksum: wallet-core (isMnemonicWord, validateMnemonic).
// The values are the user's phrase and passphrase. Messages are fixed codes, never the typed text.

export type RestoreForm = { words: string[]; count: WordCount; passphrase: string }

/** Issue codes (`message` of a field error). `required`/`unknown` sit on `words.<i>`; `checksum` sits on `words` once every shown word is listed. */
export const RESTORE_ISSUE = { required: 'required', unknown: 'unknown', checksum: 'checksum' } as const

const schema = z
  .object({
    words: z.array(z.string()),
    count: z.union([z.literal(12), z.literal(24)]),
    passphrase: z.string(),
  })
  .superRefine((v, ctx) => {
    const shown = visibleWords(v.words, v.count)
    const codes = shown.map((w) =>
      w === ''
        ? RESTORE_ISSUE.required
        : MnemonicWordInput.safeParse(w).success && isMnemonicWord(w)
          ? null
          : RESTORE_ISSUE.unknown,
    )
    codes.forEach((code, i) => {
      if (code) ctx.addIssue({ code: 'custom', path: ['words', i], message: code })
    })
    if (codes.every((c) => c === null) && validateMnemonic(shown.join(' ')).kind === 'badChecksum')
      ctx.addIssue({ code: 'custom', path: ['words'], message: RESTORE_ISSUE.checksum })
  })

export const restoreResolver = zodResolver(schema, undefined, { mode: 'sync' })
