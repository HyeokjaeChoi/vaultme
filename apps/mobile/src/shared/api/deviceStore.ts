import { loadDeviceKey, saveDeviceKey } from '../storage/keychain'
import { getInstallId, setInstallId } from '../storage/kv'
import type { DeviceStore } from './client'

/** Device key in Keychain (no-auth tier), installId in kv. */
export const deviceStore: DeviceStore = { loadKey: loadDeviceKey, saveKey: saveDeviceKey, getInstallId, setInstallId }
