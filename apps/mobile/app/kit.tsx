import { Redirect } from 'expo-router'
import { KitPage } from '@/pages/kit'

// __DEV__ component kit (no Figma frame): a release build redirects to `/`, so `vaultme://kit` shows nothing there.
export default function Route() {
  return __DEV__ ? <KitPage /> : <Redirect href="/" />
}
