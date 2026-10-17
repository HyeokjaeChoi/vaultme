import { SendGuard } from '@/features/backup'
import { BackupGate } from '@/pages/send/BackupGate'
import { SendPage } from '@/pages/send'

export default function Route() {
  return (
    <SendGuard gate={<BackupGate />}>
      <SendPage />
    </SendGuard>
  )
}
