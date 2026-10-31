import { zodResolver } from '@hookform/resolvers/zod'
import { BackupAnswerInput } from '@vaultme/contracts'
import { z } from 'zod'
import { wrongIndexes } from './check'

// S04 word-check form (ADR-0021, Q65). Shape: contracts BackupAnswerInput. Whether an answer matches its word: `wrongIndexes` (same rule as before).
// The expected words are the user's phrase words: they stay in the check hand-off and are only read here, never put in a message.

export type CheckForm = { answers: string[] }

/** Issue code (`message` of an `answers.<i>` error) for an answer that differs from its word. */
export const WRONG_ANSWER = 'wrong'

/** True when no answer is blank. Drives the 확인 button before any judging. */
export const answersFilled = (answers: readonly string[]): boolean =>
  answers.every((a) => BackupAnswerInput.safeParse(a).success)

export const checkResolver = (expected: readonly string[]) =>
  zodResolver(
    z.object({ answers: z.array(BackupAnswerInput) }).superRefine((v, ctx) => {
      for (const i of wrongIndexes(expected, v.answers))
        ctx.addIssue({ code: 'custom', path: ['answers', i], message: WRONG_ANSWER })
    }),
    undefined,
    { mode: 'sync' },
  )
