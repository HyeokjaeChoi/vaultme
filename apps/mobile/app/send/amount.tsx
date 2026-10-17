import { SendGuard } from '@/features/backup'
import { BackupGate } from '@/pages/send/BackupGate'
import { SendAmountPage } from '@/pages/send/amount'

export default function Route() {
  return (
    <SendGuard gate={<BackupGate />}>
      <SendAmountPage />
    </SendGuard>
  )
}
