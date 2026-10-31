import { createFormControl } from 'react-hook-form'
import { describe, expect, it } from 'vitest'
import { WRONG_ANSWER, answersFilled, checkResolver } from '../src/features/backup/model/form'
import { emptyWords, fromPhrase } from '../src/features/restore/model/cells'
import { RESTORE_ISSUE, restoreResolver, type RestoreForm } from '../src/features/restore/model/form'
import { AMOUNT_ISSUE, amountResolver, recipientResolver } from '../src/features/send/model/forms'

// Published BIP39 test vectors only (all-zero entropy) and the zero address. Not wallet phrases.
const VECTOR = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const opts = { fields: {}, shouldUseNativeValidation: false } as never
// Resolvers return nested error objects ({ words: [ , , { message } ] }); read them as plain data.
const run = async (r: (...a: never[]) => unknown, values: unknown) =>
  (await r(values as never, undefined as never, opts)) as { errors: Record<string, unknown> }
/** `message` of the error at a path of the nested error object, or undefined. */
const msg = (errors: unknown, ...path: (string | number)[]): string | undefined => {
  let cur = errors
  for (const k of path) cur = (cur as Record<string | number, unknown> | undefined)?.[k]
  return (cur as { message?: string } | undefined)?.message
}

describe('recipient resolver (contracts AddressInput)', () => {
  it('accepts 0x + 40 hex and rejects the rest', async () => {
    expect((await run(recipientResolver, { to: '0x' + '0'.repeat(40) })).errors).toEqual({})
    expect((await run(recipientResolver, { to: '0x12' })).errors.to).toBeDefined()
    expect((await run(recipientResolver, { to: '' })).errors.to).toBeDefined()
  })
})

describe('amount resolver (contracts AmountInput + wallet-core balance)', () => {
  const eth = amountResolver('ETH', '1.5')
  const code = async (r: typeof eth, amount: string) => msg((await run(r, { amount })).errors, 'amount')
  it('format errors come from the contracts shape', async () => {
    expect(await code(eth, '')).toBeDefined()
    expect(await code(eth, '1.2.3')).toBeDefined()
  })
  it('zero (also "0." and "0.00") is an error; a typed trailing dot is fine', async () => {
    for (const a of ['0', '0.', '0.000']) expect(await code(eth, a)).toBe(AMOUNT_ISSUE.zero)
    expect(await code(eth, '1.')).toBeUndefined()
  })
  it('above sendable is insufficient; equal to sendable is fine (wallet-core toUnits)', async () => {
    expect(await code(eth, '1.5')).toBeUndefined()
    expect(await code(eth, '1.500000000000000001')).toBe(AMOUNT_ISSUE.insufficient)
    expect(await code(amountResolver('USDC', '25.5'), '25.500001')).toBe(AMOUNT_ISSUE.insufficient)
    expect(await code(amountResolver('USDC', '25.5'), '25.5')).toBeUndefined()
  })
  it('sendable unknown (null): no balance check', async () => {
    expect(await code(amountResolver('ETH', null), '999999')).toBeUndefined()
    expect(await code(amountResolver('ETH', null), '0')).toBe(AMOUNT_ISSUE.zero)
  })
})

describe('restore resolver (contracts word shape + wallet-core list and checksum)', () => {
  const form = (words: string[], count: 12 | 24 = 12, passphrase = ''): RestoreForm => ({ words, count, passphrase })
  const ready = fromPhrase(VECTOR).words
  const set = (w: string[], i: number, v: string) => w.map((x, j) => (j === i ? v : x))
  const issues = async (v: RestoreForm, ...path: number[]) =>
    msg((await run(restoreResolver, v)).errors, 'words', ...path)
  it('a valid phrase, with or without a passphrase, has no errors', async () => {
    expect((await run(restoreResolver, form(ready))).errors).toEqual({})
    expect((await run(restoreResolver, form(ready, 12, 'TREZOR'))).errors).toEqual({})
  })
  it('empty cells are required, unknown or malformed words are unknown (per index)', async () => {
    const w = form(set(set(ready, 1, ''), 4, 'abandn'))
    expect(await issues(w, 1)).toBe(RESTORE_ISSUE.required)
    expect(await issues(w, 4)).toBe(RESTORE_ISSUE.unknown)
    expect(await issues(w, 0)).toBeUndefined()
    expect(await issues(form(set(ready, 2, 'Abandon')), 2)).toBe(RESTORE_ISSUE.unknown)
    expect(await issues(form(set(ready, 2, 'ab')), 2)).toBe(RESTORE_ISSUE.unknown)
  })
  it('a bad checksum is reported on the phrase only when every word is listed', async () => {
    expect(await issues(form(set(ready, 11, 'abandon')))).toBe(RESTORE_ISSUE.checksum)
    expect(await issues(form(set(set(ready, 11, 'abandon'), 3, 'zzzz')))).toBeUndefined()
  })
  it('hidden cells (13-24) are ignored at 12 and judged at 24', async () => {
    const w = set(ready, 20, 'zzzz')
    expect((await run(restoreResolver, form(w, 12))).errors).toEqual({})
    expect(await issues(form(w, 24), 20)).toBe(RESTORE_ISSUE.unknown)
    expect(await issues(form(emptyWords(), 24), 23)).toBe(RESTORE_ISSUE.required)
  })
  it('error messages are codes: no typed word appears in any error', async () => {
    const r = await run(restoreResolver, form(set(ready, 5, 'qwertyuiop')))
    expect(JSON.stringify(r.errors)).not.toContain('qwertyuiop')
  })
})

describe('backup check resolver (contracts shape + wrongIndexes)', () => {
  const r = checkResolver(['about', 'zoo', 'art'])
  it('marks only the wrong answers, ignoring case and spaces', async () => {
    expect((await run(r, { answers: [' About ', 'ZOO', 'art'] })).errors).toEqual({})
    const { errors } = await run(r, { answers: ['about', 'zoo2', 'ARC'] })
    expect(msg(errors, 'answers', 0)).toBeUndefined()
    expect(msg(errors, 'answers', 1)).toBe(WRONG_ANSWER)
    expect(msg(errors, 'answers', 2)).toBe(WRONG_ANSWER)
  })
  it('answersFilled: every answer not blank', () => {
    expect(answersFilled(['a', 'b', 'c'])).toBe(true)
    expect(answersFilled(['a', ' ', 'c'])).toBe(false)
    expect(answersFilled(['', '', ''])).toBe(false)
  })
})

describe('secrets: react-hook-form keeps no copy after reset (restore screen clearAll)', () => {
  it('reset to empty values drops phrase and passphrase from values, defaults and errors', async () => {
    const fc = createFormControl<RestoreForm>({
      defaultValues: { ...fromPhrase(VECTOR), passphrase: 'TREZOR' },
      resolver: restoreResolver,
    })
    fc.setValue('words', set12('qwertyuiop'))
    fc.setValue('passphrase', 'SECRETPASS')
    await fc.trigger()
    expect(JSON.stringify(fc.control._formValues)).toContain('SECRETPASS') // the probe sees the values before reset
    fc.reset({ words: emptyWords(), count: 12, passphrase: '' })
    const dump = JSON.stringify([fc.control._formValues, fc.control._defaultValues, fc.control._formState.errors])
    for (const s of ['abandon', 'qwertyuiop', 'TREZOR', 'SECRETPASS']) expect(dump).not.toContain(s)
  })
})
const set12 = (w: string) => emptyWords().map((_, i) => (i === 0 ? w : 'abandon'))
