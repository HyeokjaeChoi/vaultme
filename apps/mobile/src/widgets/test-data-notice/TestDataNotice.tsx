import { useTranslation } from 'react-i18next'
import { chain } from '@/shared/chain'
import { StatusNotice } from '@/shared/ui'

/** One info StatusNotice (C25) while the chain adapter does not broadcast: balances and history are examples. Renders nothing with a real adapter. */
export function TestDataNotice() {
  const { t } = useTranslation()
  return chain.broadcasts ? null : <StatusNotice tone="info" title={t('testData.title')} body={t('testData.body')} />
}
