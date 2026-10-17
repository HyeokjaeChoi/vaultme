import { useLocalSearchParams } from 'expo-router'
import { ReceivePage } from '@/pages/receive'

// `key` re-mounts the page when the __DEV__ capture param `copied` changes, so the Copied preset applies on a reused screen.
export default function ReceiveRoute() {
  const { copied } = useLocalSearchParams<{ copied?: string }>()
  return <ReceivePage key={copied ?? ''} />
}
