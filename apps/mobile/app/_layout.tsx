import '@/shared/lib/crypto-polyfill' // must stay first: wallet-core (via @noble) reads globalThis.crypto at import time
export { RootLayout as default } from '@/shell'
