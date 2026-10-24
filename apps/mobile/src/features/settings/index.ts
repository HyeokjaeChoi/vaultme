import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { getPushSetting, getZeroSetting, setPushSetting, setZeroSetting } from '@/shared/storage'

type Setting = readonly [get: () => boolean, set: (v: boolean) => void, fallback: boolean]
const PUSH: Setting = [getPushSetting, setPushSetting, true]
const ZERO: Setting = [getZeroSetting, setZeroSetting, false]

function read([get, , fallback]: Setting): boolean {
  try {
    return get()
  } catch {
    return fallback // kv not open (tests, early render): the default
  }
}

function useSetting(setting: Setting): [boolean, (v: boolean) => void] {
  const [, set] = setting
  const [value, setValue] = useState(() => read(setting))
  useFocusEffect(useCallback(() => setValue(read(setting)), [setting]))
  return [
    value,
    (v) => {
      try {
        set(v)
        setValue(v) // shown only once stored: a failed write leaves the previous value on screen
      } catch {
        // kv unavailable: nothing was saved, so the switch keeps showing what the next read returns
      }
    },
  ]
}

/** S62: 거래 알림 받기 (default on). */
export const usePushSetting = () => useSetting(PUSH)
/** S63: 0원 거래 보기 (default off = hidden). */
export const useZeroSetting = () => useSetting(ZERO)
