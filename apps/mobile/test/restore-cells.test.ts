import { describe, expect, it } from 'vitest'
import {
  applyCellInput,
  emptyWords,
  fromPhrase,
  inspectCells,
  joinWords,
  togglePassphrase,
} from '../src/features/restore/model/cells'
import { clearHeld, holdRestore, restoredWithPassphrase, takeWords } from '../src/features/restore/model/handoff'

// Published BIP39 test vectors only (all-zero entropy). Not wallet phrases.
const VECTOR = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const VECTOR_24 = `${'abandon '.repeat(23)}art`

const set = (words: string[], at: number, w: string) => words.map((x, i) => (i === at ? w : x))

describe('applyCellInput: paste distribution', () => {
  it('a full 12-word phrase pasted into cell 5 fills cells 1-12 and focuses the last', () => {
    const r = applyCellInput(emptyWords(), 12, 4, `  ${VECTOR.toUpperCase()}\n`)
    expect(r.words.slice(0, 12).join(' ')).toBe(VECTOR)
    expect(r.words.slice(12).every((w) => w === '')).toBe(true)
    expect(r.count).toBe(12)
    expect(r.focus).toBe(11)
  })
  it('splits on newlines and tabs, and 24 words switch the count to 24', () => {
    const r = applyCellInput(emptyWords(), 12, 0, VECTOR_24.replace(/ /g, '\n'))
    expect(joinWords(r.words, 24)).toBe(VECTOR_24)
    expect(r.count).toBe(24)
    expect(r.focus).toBe(23)
  })
  it('a partial paste replaces all cells from cell 1 and keeps the count', () => {
    const old = set(emptyWords(), 7, 'zoo')
    const r = applyCellInput(old, 12, 3, 'abandon ability able')
    expect(r.words.slice(0, 4)).toEqual(['abandon', 'ability', 'able', ''])
    expect(r.words[7]).toBe('')
    expect(r.count).toBe(12)
    expect(r.focus).toBe(2)
  })
  it('words past the shown count are cut, 13 to 24 words become 24', () => {
    const r = applyCellInput(emptyWords(), 12, 0, 'abandon '.repeat(15))
    expect(r.count).toBe(24)
    expect(r.words.filter(Boolean)).toHaveLength(15)
  })
})

describe('applyCellInput: typing', () => {
  it('a word with a trailing space is kept and moves to the next cell; the last cell closes the keyboard', () => {
    expect(applyCellInput(emptyWords(), 12, 2, 'able ')).toMatchObject({ focus: 3 })
    expect(applyCellInput(emptyWords(), 12, 11, 'able\n').focus).toBeNull()
    expect(applyCellInput(emptyWords(), 12, 2, 'abl').focus).toBe(2)
    expect(applyCellInput(emptyWords(), 12, 2, 'able ').words[2]).toBe('able')
  })
  it('a lone space does not commit an empty cell', () => {
    expect(applyCellInput(emptyWords(), 12, 2, ' ')).toMatchObject({ focus: 2 })
  })
})

describe('inspectCells: word validation', () => {
  const ready = fromPhrase(VECTOR).words
  it('names only the wrong cell (index), the focused cell is still being typed', () => {
    const w = set(ready, 2, 'abandn')
    expect(inspectCells(w, 12, null).unknown).toEqual([2])
    expect(inspectCells(w, 12, 2).unknown).toEqual([])
    expect(inspectCells(w, 12, null).ready).toBe(false)
    expect(inspectCells(set(ready, 9, 'zzzz'), 12).unknown).toEqual([9])
  })
  it('several wrong cells are all listed, first one gives the message index', () => {
    expect(inspectCells(set(set(ready, 8, 'qqq'), 1, 'xx'), 12).unknown).toEqual([1, 8])
  })
  it('ready needs every shown cell filled with a listed word; a bad checksum is not an unknown word', () => {
    expect(inspectCells(ready, 12)).toEqual({ unknown: [], ready: true, badChecksum: false })
    expect(inspectCells(set(ready, 11, ''), 12).ready).toBe(false)
    expect(inspectCells(set(ready, 11, 'abandon'), 12)).toEqual({ unknown: [], ready: true, badChecksum: true })
  })
})

describe('12 / 24 switch', () => {
  it('keeps every word: 12 hides cells 13-24, 24 shows them again', () => {
    const w = fromPhrase(VECTOR_24).words
    expect(joinWords(w, 12)).toBe(VECTOR_24.split(' ').slice(0, 12).join(' '))
    expect(joinWords(w, 24)).toBe(VECTOR_24)
    expect(w[23]).toBe('art') // still held while hidden
  })
  it('hidden cells do not block 12 words: ready ignores cells 13-24', () => {
    const w = set(fromPhrase(VECTOR).words, 20, 'zzzz')
    expect(inspectCells(w, 12).ready).toBe(true)
    expect(inspectCells(w, 24).unknown).toEqual([20])
  })
})

describe('passphrase row', () => {
  it('collapsing clears the passphrase; opening keeps it', () => {
    expect(togglePassphrase(true, 'TREZOR')).toEqual({ open: false, passphrase: '' })
    expect(togglePassphrase(false, '')).toEqual({ open: true, passphrase: '' })
  })
})

describe('S06 hand-off', () => {
  it('holds words once, never the passphrase, and clears', () => {
    holdRestore(fromPhrase(VECTOR).words, 12, true)
    expect(restoredWithPassphrase()).toBe(true)
    expect(takeWords()?.words.slice(0, 12).join(' ')).toBe(VECTOR)
    expect(takeWords()).toBeNull()
    expect(restoredWithPassphrase()).toBe(false)
    holdRestore(emptyWords(), 12, false)
    clearHeld()
    expect(takeWords()).toBeNull()
  })
})
