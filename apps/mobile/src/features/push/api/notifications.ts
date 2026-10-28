import * as Application from 'expo-application'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { PUSH_CHANNEL_ID } from '@vaultme/contracts'
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
    ? Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
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
    // The simulator's token is always sandbox, but its APNs environment reads as null (no provisioning profile), so expo-notifications
    // falls back to production APNs, which answers BadDeviceToken (#265). Not the null itself: an App Store build has no profile either.
    const sandbox =
      Platform.OS === 'ios' &&
      (await Application.getIosApplicationReleaseTypeAsync()) === Application.ApplicationReleaseType.SIMULATOR
    return (await Notifications.getExpoPushTokenAsync(sandbox ? { projectId, development: true } : { projectId })).data
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

/**
 * Calls `open` for the push that cold-started the app, then for every later tap. Each response is handled once: cleared after use, and a
 * response with the same notification identifier as the previous one is ignored (the cold-start read and the listener can both deliver it).
 */
export function onPushTap(open: (data: unknown) => void): () => void {
  let handled: string | null = null
  const handle = (r: Notifications.NotificationResponse) => {
    Notifications.clearLastNotificationResponse()
    const id = r.notification.request.identifier
    if (id === handled) return
    handled = id
    open(r.notification.request.content.data)
  }
  const last = Notifications.getLastNotificationResponse()
  if (last) handle(last)
  const sub = Notifications.addNotificationResponseReceivedListener(handle)
  return () => sub.remove()
}
