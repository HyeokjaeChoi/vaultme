import type { EtherscanBucket } from './bucket.ts'

export type Env = {
  Bindings: {
    MIN_APP_VERSION: string
    DB: D1Database
    TOKEN_SECRET: string // wrangler secret; .dev.vars locally
    INSTALL_IP_LIMITER: RateLimit // POST /v1/installs, keyed by IP (coarse)
    INFURA_KEY: string // wrangler secret; primary RPC upstream
    ALCHEMY_KEY: string // wrangler secret; fallback RPC upstream
    RPC_IP_LIMITER: RateLimit // /v1/rpc, keyed by IP (coarse, 300/60s)
    ETHERSCAN_API_KEY: string // wrangler secret; Etherscan V2 (history)
    ETHERSCAN_BUCKET: DurableObjectNamespace<EtherscanBucket> // global 2.5 calls/s (ARCHITECTURE.md#history)
    HISTORY_IP_LIMITER: RateLimit // /v1/history, keyed by IP (coarse, 300/60s)
    INSTALL_LIMITER: RateLimit // authenticated routes, keyed by install id
    ALCHEMY_WEBHOOK_ID: string // wrangler secret; Notify address-activity webhook (Sepolia)
    ALCHEMY_SIGNING_KEY: string // wrangler secret; verifies X-Alchemy-Signature
    ALCHEMY_NOTIFY_TOKEN: string // wrangler secret; edits the webhook address list
    EXPO_ACCESS_TOKEN: string // wrangler secret; Expo Push Service
  }
  Variables: { installId: string }
}
