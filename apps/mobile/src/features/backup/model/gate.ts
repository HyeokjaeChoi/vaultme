/** Receive is open before backup; the first send needs a backup. Pure decisions, no I/O. */
export type BackupGateState = {
  backedUp: boolean
  canReceive: true
  canSend: boolean
  /** First incoming deposit seen, not backed up, and the sheet was not shown yet. */
  shouldPromptAfterDeposit: boolean
}

/** A real deposit: an incoming row that is not an incoming zero-value transfer (`caution`, Q71: address poisoning, nothing was deposited). */
export const hasDeposit = (items: { kind: string; caution?: true }[]): boolean =>
  items.some((i) => i.kind === 'receive' && !i.caution)

/** `backedUp` = backup done or wallet restored (the user already holds the phrase; this is not proof of backup). */
export function backupGateState(i: {
  done: boolean
  restored: boolean
  hasIncoming: boolean
  promptShown: boolean
}): BackupGateState {
  const backedUp = i.done || i.restored
  return {
    backedUp,
    canReceive: true,
    canSend: backedUp,
    shouldPromptAfterDeposit: !backedUp && i.hasIncoming && !i.promptShown,
  }
}
