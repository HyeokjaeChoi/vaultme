import { createHistory, type HistoryItem } from '@vaultme/history'
import { api, historyCache } from '@/shared/api'
import { appStore } from '@/shared/app-store'
import { getAccountAddress } from '@/shared/storage'

const client = api
/** S63 "수량 0 거래 보기" (default off = hidden, Q71). Read at each parse; it is also part of the query keys, so a flip reloads the views. */
export const showZero = (): boolean => appStore().getState().zeroSetting
/** The one history module: the S40 list and the S41 row lookup share its cached first page (`historyCache`). */
export const history = createHistory({
  fetchPage: (a) => (client ? client.history(a) : Promise.reject(new Error('no history API'))),
  cache: historyCache,
  now: Date.now,
  showZero,
})

/** The account address. Null = kv unreadable. */
export function accountAddress(): string | null {
  try {
    return getAccountAddress()
  } catch {
    return null
  }
}

/** Address for the list: null in test-data mode (no API), so only the local send shows. */
export const listAddress = (): string | null => (client ? accountAddress() : null)

/** The cached history row an S41 route param names (see `history.cachedRow`), for this account only. Null = only a lookup can tell. */
export const findCachedRow = (address: string | null, id: string): HistoryItem | null => history.cachedRow(address, id)
