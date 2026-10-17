import { SendGuard } from '@/features/backup'
import { SendAmountPage } from '@/pages/send/amount'

export default function Route() {
  return (
    <SendGuard>
      <SendAmountPage />
    </SendGuard>
  )
}
