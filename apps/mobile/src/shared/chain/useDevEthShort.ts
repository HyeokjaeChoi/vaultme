import { useLocalSearchParams } from 'expo-router'
import { setEthShort } from './devOverride'

/** `?ethShort=1` turns the fake adapter's low-ETH state on, `?ethShort=0` clears it (__DEV__ only). Set while rendering, so the first snapshot already sees it. */
export function useDevEthShort(): void {
  const { ethShort } = useLocalSearchParams<{ ethShort?: string }>()
  if (ethShort !== undefined) setEthShort(ethShort === '1')
}
