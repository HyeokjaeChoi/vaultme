import { createApiClient, type ApiClient } from '@vaultme/api-client'
import Constants from 'expo-constants'
import { loadDeviceKey, saveDeviceKey } from '../storage/keychain'
import { getHistoryCache, getInstallId, setHistoryCache, setInstallId } from '../storage/kv'
import { nobleSigner } from './deviceKey'
import { markUpdateRequired } from './updateGate'

export { ApiError, RpcError, isApiError, type ApiClient } from '@vaultme/api-client'
export { apiErrorKey } from './errorCopy'
export { useUpdateRequired } from './updateGate'

/** API base URL. Unset = fake mode (no network). Local `wrangler dev`: http://localhost:8787 (iOS simulator), http://10.0.2.2:8787 (Android emulator). */
const apiUrl = process.env.EXPO_PUBLIC_API_URL // must be read as `process.env.EXPO_PUBLIC_*` so Expo inlines it

export const api: ApiClient | null = apiUrl
  ? createApiClient({
      baseUrl: apiUrl,
      appVersion: Constants.expoConfig?.version ?? '0.0.0',
      // Device key in Keychain (no-auth tier), installId in kv.
      signer: nobleSigner({ loadKey: loadDeviceKey, saveKey: saveDeviceKey, getInstallId, setInstallId }),
      onUpdateRequired: markUpdateRequired,
    })
  : null

/** The one history cache slot (MMKV), read by the S40 list and S41. */
export const historyCache = { get: getHistoryCache, set: setHistoryCache }
