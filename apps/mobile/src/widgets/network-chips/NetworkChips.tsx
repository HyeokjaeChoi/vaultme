import { useTranslation } from 'react-i18next'
import { useTestMode } from '@/shared/chain/useTestMode'
import { StatusChip } from '@/shared/ui'

/** The honesty chips of every wallet screen (Figma B/Status chip 494:1067): "Sepolia 테스트넷" always, "테스트 데이터" while the fake chain adapter is on. */
export function NetworkChips() {
  const { t } = useTranslation()
  const test = useTestMode()
  return (
    <>
      <StatusChip tone="testnet" label={t('chip.testnet')} />
      {test ? <StatusChip tone="testData" label={t('chip.testData')} /> : null}
    </>
  )
}
