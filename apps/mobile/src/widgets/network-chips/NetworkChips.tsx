import { useTranslation } from 'react-i18next'
import { useTestMode } from '@/shared/chain/useTestMode'
import { StatusChip } from '@/shared/ui'

type Props = { /** Activity and Settings show the Testnet chip only; "테스트 데이터" sits on the first date header there. Default true. */ testData?: boolean; /** Home only: the chips open their explainer sheets. */ onTestnetPress?: () => void; onTestDataPress?: () => void }

/** The honesty chips of every wallet screen (Figma B/Status chip 494:1067): "Sepolia 테스트넷" always, "테스트 데이터" while the fake chain adapter is on. */
export function NetworkChips({ testData = true, onTestnetPress, onTestDataPress }: Props) {
  const { t } = useTranslation()
  const test = useTestMode()
  return (
    <>
      <StatusChip tone="testnet" label={t('chip.testnet')} {...(onTestnetPress ? { onPress: onTestnetPress } : {})} />
      {test && testData ? <StatusChip tone="testData" label={t('chip.testData')} {...(onTestDataPress ? { onPress: onTestDataPress } : {})} /> : null}
    </>
  )
}
