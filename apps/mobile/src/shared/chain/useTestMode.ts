import { useLocalSearchParams } from 'expo-router'
import { chain } from './adapter'

/**
 * True while the fake chain adapter is on (nothing leaves the device): screens say so with the "테스트 데이터" chip and test copy.
 * `?real=1` is a __DEV__ design-capture override that shows the real-network variant of a frame.
 */
export function useTestMode(): boolean {
  const { real } = useLocalSearchParams<{ real?: string }>()
  return !chain.broadcasts && !(__DEV__ && real === '1')
}
