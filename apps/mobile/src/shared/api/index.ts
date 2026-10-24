import Constants from 'expo-constants'
import { getHistoryCache, setHistoryCache } from '../storage/kv'
import { createApiClient, type ApiClient } from './client'
import { deviceStore } from './deviceStore'
import { createHistory } from './history'
import { markUpdateRequired } from './updateGate'

export { ApiError, RpcError, isApiError } from './errors'
export type { ApiClient } from './client'
export { apiErrorKey } from './errorCopy'
export { useUpdateRequired } from './updateGate'

/** API base URL. Unset = fake mode (no network). Local `wrangler dev`: http://localhost:8787 (iOS simulator), http://10.0.2.2:8787 (Android emulator). */
const apiUrl = process.env.EXPO_PUBLIC_API_URL // must be read as `process.env.EXPO_PUBLIC_*` so Expo inlines it

export const api: ApiClient | null = apiUrl
  ? createApiClient({
      baseUrl: apiUrl,
      appVersion: Constants.expoConfig?.version ?? '0.0.0',
      store: deviceStore,
      onUpdateRequired: markUpdateRequired,
    })
  : null

export { createHistory }
export const historyCache = { get: getHistoryCache, set: setHistoryCache }
export type { HistoryResult } from './history'
