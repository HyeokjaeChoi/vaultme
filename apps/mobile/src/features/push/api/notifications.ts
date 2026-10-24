import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { ko } from '@vaultme/i18n'
import { api } from '@/shared/api'
import {
  getAccountAddress,
  getPushSetting,
  getPushUnregisterPending,
  setPushSetting,
  setPushUnregisterPending,
} from '@/shared/storage'
import type { Permission, PushDeps, PushPort } from '../model/push'

const toPermission = (r: Notifications.NotificationPermissionsStatus): Permission =>
  r.granted ? 'granted' : r.canAskAgain ? 'undetermined' : 'denied'

// Android 13+: the permission prompt and the push token both need a channel first (expo-notifications 58 docs, Permissions > Android).
const ensureChannel = () =>
  Platform.OS === 'android'
    ? Notifications.setNotificationChannelAsync('default', {
        name: ko.settings.pushScreen.title,
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    : Promise.resolve(null)

export const expoPort: PushPort = {
  permission: async () => toPermission(await Notifications.getPermissionsAsync()),
  request: async () => {
    await ensureChannel()
    return toPermission(await Notifications.requestPermissionsAsync())
  },
  token: async (projectId) => {
    await ensureChannel()
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data
  },
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
    handleNotification: () =>
      Promise.resolve({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  })
}

/** Calls `open` for the push that cold-started the app, then for every later tap. Each response is handled once (cleared after use). */
export function onPushTap(open: (data: unknown) => void): () => void {
  const handle = (r: Notifications.NotificationResponse) => {
    Notifications.clearLastNotificationResponse()
    open(r.notification.request.content.data)
  }
  const last = Notifications.getLastNotificationResponse()
  if (last) handle(last)
  const sub = Notifications.addNotificationResponseReceivedListener(handle)
  return () => sub.remove()
}
