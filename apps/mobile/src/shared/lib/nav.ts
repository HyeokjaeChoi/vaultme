import { router, type Href } from 'expo-router'

// Back with a fallback: a deep link opens a screen with no history, and router.back() would do nothing.
export function goBack(fallback: Href = '/home') {
  if (router.canGoBack()) router.back()
  else router.replace(fallback)
}
