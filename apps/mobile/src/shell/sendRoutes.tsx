import type { ComponentType } from 'react'
import { ReviewPage } from '@/pages/review'
import { BackupGate, ScanPage, SendAmountPage, SendPage } from '@/pages/send'
import { SendGuard } from '@/widgets/backup-gate'

// Every send route (deep links too) shows the backup gate (Figma B-S31) until the phrase is backed up.
function guarded(Page: ComponentType) {
  return function GuardedRoute() {
    return (
      <SendGuard gate={<BackupGate />}>
        <Page />
      </SendGuard>
    )
  }
}

export const SendRoute = guarded(SendPage)
export const SendAmountRoute = guarded(SendAmountPage)
export const ScanRoute = guarded(ScanPage)
export const ReviewRoute = guarded(ReviewPage)
