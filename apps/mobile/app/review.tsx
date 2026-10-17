import { SendGuard } from '@/features/backup'
import { BackupGate } from '@/pages/send/BackupGate'
import { ReviewPage } from '@/pages/review'

export default function ReviewRoute() {
  return (
    <SendGuard gate={<BackupGate />}>
      <ReviewPage />
    </SendGuard>
  )
}
