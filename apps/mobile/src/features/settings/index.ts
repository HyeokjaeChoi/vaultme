import { appStore, useAppStore } from '@/shared/app-store'

type Key = 'pushSetting' | 'zeroSetting'
const SET = { pushSetting: 'setPushSetting', zeroSetting: 'setZeroSetting' } as const

function useSetting(key: Key): [boolean, (v: boolean) => void] {
  const value = useAppStore((s) => s[key])
  return [
    value,
    (v) => {
      try {
        appStore().getState()[SET[key]](v) // the store changes only once the value is stored: a failed write leaves the previous value on screen
      } catch {
        // kv unavailable: nothing was saved, so the switch keeps showing the stored value
      }
    },
  ]
}

/** S62: 거래 알림 받기 (default off: on only after the opt-in and the OS permission, #67). */
export const usePushSetting = () => useSetting('pushSetting')
/** S63: 0원 거래 보기 (default off = hidden). */
export const useZeroSetting = () => useSetting('zeroSetting')
