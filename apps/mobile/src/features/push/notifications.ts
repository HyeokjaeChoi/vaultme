import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { api } from '@/shared/api'
import { getAccountAddress, getPushSetting, getPushUnregisterPending, setPushSetting, setPushUnregisterPending } from '@/shared/storage'
import Constants from 'expo-constants'
import type { Permission, PushDeps, PushPort } from './model/push'

const toPermission = (r: Notifications.NotificationPermissionsStatus): Permission => (r.granted ? 'granted' : r.canAskAgain ? 'undetermined' : 'denied')

// Android 13+ needs a channel before the permission prompt can show.
const ensureChannel = () =>
  Platform.OS === 'android' ? Notifications.setNotificationChannelAsync('default', { name: '거래 알림', importance: Notifications.AndroidImportance.DEFAULT }) : Promise.resolve(null)

export const expoPort: PushPort = {
  permission: async () => toPermission(await Notifications.getPermissionsAsync()),
  request: async () => {
    await ensureChannel()
    return toPermission(await Notifications.requestPermissionsAsync())
  },
  token: async (projectId) => (await Notifications.getExpoPushTokenAsync({ projectId })).data,
}

const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined

export const pushDeps: PushDeps = {
  server: api,
  port: expoPort,
  projectId: extra?.eas?.projectId ?? null,
  address: getAccountAddress,
  getSetting: getPushSetting,
  setSetting: setPushSetting,
  getUnregisterPending: getPushUnregisterPending,
  setUnregisterPending: setPushUnregisterPending,
}

/** Foreground pushes show as a banner and in the list, without sound (the lock-screen copy carries no amount or address). */
export function installForegroundHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  })
}
