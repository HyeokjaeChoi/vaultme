import { type ApiClient, createApiClient } from '@vaultme/api-client'
import { webSigner } from './webSigner'

let client: ApiClient | null = null

/** The browser's API client (ADR-0011): made on first use, because IndexedDB and WebCrypto exist only in the browser, not at prerender. */
export function api(): ApiClient {
  client ??= createApiClient({
    baseUrl: __API_ORIGIN__,
    appVersion: __WEB_VERSION__,
    client: 'web',
    signer: webSigner(),
  })
  return client
}
