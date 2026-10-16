import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { getPushSetting, getZeroSetting, setPushSetting, setZeroSetting } from '@/shared/storage'

type Setting = readonly [get: () => boolean, set: (v: boolean) => void, fallback: boolean]
const PUSH: Setting = [getPushSetting, setPushSetting, true]
const ZERO: Setting = [getZeroSetting, setZeroSetting, false]

function useSetting([get, set, fallback]: Setting): [boolean, (v: boolean) => void] {
  const read = () => {
    try {
      return get()
    } catch {
      return fallback // kv not open (tests, early render): the default
    }
  }
  const [value, setValue] = useState(read)
  useFocusEffect(useCallback(() => setValue(read()), []))
  return [
    value,
    (v) => {
      setValue(v)
      try {
        set(v)
      } catch {
        // kv unavailable: the toggle still shows, the next read returns the default
      }
    },
  ]
}

/** S62: 거래 알림 받기 (default on). */
export const usePushSetting = () => useSetting(PUSH)
/** S63: 0원 거래 보기 (default off = hidden). */
export const useZeroSetting = () => useSetting(ZERO)
