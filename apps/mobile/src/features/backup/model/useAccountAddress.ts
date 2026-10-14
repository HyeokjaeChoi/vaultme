import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { getAccountAddress } from '@/shared/storage'

const read = () => {
  try {
    return getAccountAddress()
  } catch {
    return null // kv not open: no wallet to show
  }
}

/** The wallet's own first-account address from kv (public value), or null when no wallet was created on this install. */
export function useAccountAddress(): string | null {
  const [address, setAddress] = useState(read)
  useFocusEffect(useCallback(() => setAddress(read()), []))
  return address
}
