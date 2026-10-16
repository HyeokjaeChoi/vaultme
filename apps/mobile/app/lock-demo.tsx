import { Redirect } from 'expo-router'
import { LockPage } from '@/pages/lock'

// __DEV__ design capture of B-S90 (the real screen is rendered by LockGate): no OS prompt.
export default function Route() {
  return __DEV__ ? <LockPage onUnlock={() => undefined} autoPrompt={false} /> : <Redirect href="/" />
}
