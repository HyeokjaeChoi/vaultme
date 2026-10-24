import { expoPort, pushDeps } from './api/notifications'
import { disablePush, enablePush, type EnableResult, type Permission } from './model/push'

export { routeForPush, type EnableResult, type Permission, type PushRoute, type PushTapDeps } from './model/push'
export { usePushBoot } from './model/usePushBoot'
export { PushOptInSheet } from './ui/PushOptInSheet'
export const enableTxPush = (): Promise<EnableResult> => enablePush(pushDeps)
export const disableTxPush = (): Promise<void> => disablePush(pushDeps)
export const readPushPermission = (): Promise<Permission> => expoPort.permission().catch(() => 'undetermined')
