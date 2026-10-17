import { describe, expect, it } from 'vitest'
import { backupGateState, sendHref } from '../src/features/backup/model/gate'

const base = { done: false, restored: false, hasIncoming: false, promptShown: false }

describe('backupGateState (Q14)', () => {
  it('receive is always open; send needs a backup', () => {
    expect(backupGateState(base)).toMatchObject({ backedUp: false, canReceive: true, canSend: false })
    expect(backupGateState({ ...base, done: true })).toMatchObject({ backedUp: true, canReceive: true, canSend: true })
  })
  it('a restored wallet counts as backed up (Q16)', () => {
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

describe('sendHref', () => {
  it('routes to the send flow or the backup gate', () => {
    expect(sendHref(true)).toBe('/send')
    expect(sendHref(false)).toBe('/backup')
  })
})
