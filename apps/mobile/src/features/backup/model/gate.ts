/** Q14 (redesign-b §9.3): receive is open before backup; the first send needs a backup. Pure decisions, no I/O. */
export type BackupGateState = {
  backedUp: boolean
  canReceive: true
  canSend: boolean
  /** First incoming deposit seen, not backed up, and the sheet was not shown yet. */
  shouldPromptAfterDeposit: boolean
}

/** `backedUp` = backup done or wallet restored (Q16: the user already holds the phrase). */
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
