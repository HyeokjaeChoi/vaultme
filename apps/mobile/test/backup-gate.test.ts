import { describe, expect, it } from 'vitest'
import { backupGateState, hasDeposit } from '../src/features/backup/model/gate'

const base = { done: false, restored: false, hasIncoming: false, promptShown: false }

describe('backupGateState', () => {
  it('receive is always open; send needs a backup', () => {
    expect(backupGateState(base)).toMatchObject({ backedUp: false, canReceive: true, canSend: false })
    expect(backupGateState({ ...base, done: true })).toMatchObject({ backedUp: true, canReceive: true, canSend: true })
  })
  it('a restored wallet counts as backed up', () => {
    expect(backupGateState({ ...base, restored: true }).canSend).toBe(true)
  })
  it('prompts once after the first deposit while not backed up', () => {
    expect(backupGateState({ ...base, hasIncoming: true }).shouldPromptAfterDeposit).toBe(true)
    expect(backupGateState({ ...base, hasIncoming: true, promptShown: true }).shouldPromptAfterDeposit).toBe(false)
  })
  it('no prompt without a deposit, or when backed up', () => {
    expect(backupGateState(base).shouldPromptAfterDeposit).toBe(false)
    expect(backupGateState({ ...base, hasIncoming: true, done: true }).shouldPromptAfterDeposit).toBe(false)
    expect(backupGateState({ ...base, hasIncoming: true, restored: true }).shouldPromptAfterDeposit).toBe(false)
  })
})

describe('hasDeposit (Q71)', () => {
  it('an incoming zero-value (caution) row is no deposit, a real incoming row is', () => {
    expect(hasDeposit([{ kind: 'receive', caution: true }])).toBe(false)
    expect(hasDeposit([{ kind: 'send' }])).toBe(false)
    expect(hasDeposit([{ kind: 'receive', caution: true }, { kind: 'receive' }])).toBe(true)
  })
})
