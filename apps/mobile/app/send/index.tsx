import { SendGuard } from '@/features/backup'
import { SendPage } from '@/pages/send'

export default function Route() {
  return (
    <SendGuard>
      <SendPage />
    </SendGuard>
  )
}
