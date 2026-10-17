import { Redirect } from 'expo-router'
import { UpdateRequiredPage } from '@/pages/update-required'

// __DEV__ design capture of B-S91 (the real screen replaces the app on API 426).
export default function Route() {
  return __DEV__ ? <UpdateRequiredPage /> : <Redirect href="/" />
}
