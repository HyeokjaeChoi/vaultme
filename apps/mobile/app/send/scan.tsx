import { SendGuard } from '@/features/backup'
import { BackupGate } from '@/pages/send/BackupGate'
import { ScanPage } from '@/pages/send/scan'

export default function Route() {
  return (
    <SendGuard gate={<BackupGate />}>
      <ScanPage />
    </SendGuard>
  )
}
