import { useLocalSearchParams } from 'expo-router'
import { StartPage } from '@/pages/start'

// `?demo=1` is a __DEV__ design-capture override: show Start even when a wallet exists.
export default function Route() {
  const { demo } = useLocalSearchParams<{ demo?: string }>()
  return <StartPage demo={__DEV__ && demo === '1'} />
}
