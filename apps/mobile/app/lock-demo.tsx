import { Redirect, useLocalSearchParams } from 'expo-router'
import { LockPage } from '@/pages/lock'

// __DEV__ design capture of B-S90 (the real screen is rendered by LockGate): no OS prompt. `?state=checking|failed` shows the in-progress or the failed state.
export default function Route() {
  const { state } = useLocalSearchParams<{ state?: string }>()
  return __DEV__ ? <LockPage onUnlock={() => undefined} autoPrompt={false} {...(state === 'checking' || state === 'failed' ? { initial: state } : {})} /> : <Redirect href="/" />
}
