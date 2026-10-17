import { SendGuard } from '@/features/backup'
import { ReviewPage } from '@/pages/review'

export default function ReviewRoute() {
  return (
    <SendGuard>
      <ReviewPage />
    </SendGuard>
  )
}
