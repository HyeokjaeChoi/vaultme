import { disablePush, enablePush, type EnableResult, type Permission } from './model/push'
import { expoPort, pushDeps } from './notifications'

export { routeForPush, type EnableResult, type Permission } from './model/push'
export const enableTxPush = (): Promise<EnableResult> => enablePush(pushDeps)
export const disableTxPush = (): Promise<void> => disablePush(pushDeps)
export const readPushPermission = (): Promise<Permission> => expoPort.permission().catch(() => 'undetermined')
export { usePushBoot } from './usePushBoot'
