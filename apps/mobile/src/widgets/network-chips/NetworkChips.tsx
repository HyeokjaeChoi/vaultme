import { useTranslation } from 'react-i18next'
import { useTestMode } from '@/shared/chain'
import { StatusChip } from '@/shared/ui'

/** The honesty chip of every wallet screen (Figma B/Status chip 494:1067): one neutral chip, "Sepolia", or "Sepolia · 테스트 데이터" while the fake chain adapter is on. Home passes `onPress` to open the explainer sheet. */
export function NetworkChips({ onPress }: { onPress?: (testData: boolean) => void }) {
  const { t } = useTranslation()
  const test = useTestMode()
  return (
    <StatusChip
      label={test ? t('chip.testData') : t('chip.network')}
      {...(onPress ? { onPress: () => onPress(test) } : {})}
    />
  )
}
