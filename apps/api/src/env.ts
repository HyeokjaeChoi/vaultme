import type { EtherscanBucket } from './bucket.ts'

export type Env = {
  Bindings: {
    MIN_APP_VERSION: string
    MIN_WEB_VERSION: string // X-Client: web minimum (ADR-0011)
    WEB_ORIGINS?: string // optional: unset = no browser; comma-separated allowed browser origins (ADR-0011); a var, not a secret
    DB: D1Database
    TOKEN_SECRET: string // wrangler secret; .dev.vars locally
    INSTALL_IP_LIMITER: RateLimit // POST /v1/installs, keyed by IP (coarse)
    INFURA_KEY: string // wrangler secret; primary RPC upstream
    ALCHEMY_KEY: string // wrangler secret; fallback RPC upstream
    RPC_IP_LIMITER: RateLimit // /v1/rpc, keyed by IP (coarse, 300/60s)
    ETHERSCAN_API_KEY: string // wrangler secret; Etherscan V2 (history)
    ETHERSCAN_BUCKET: DurableObjectNamespace<EtherscanBucket> // global, 3 calls per 1.2 s (ARCHITECTURE.md#history)
    HISTORY_IP_LIMITER: RateLimit // /v1/history and /v1/tx/internal share it, keyed by IP (coarse, 300/60s)
    INSTALL_LIMITER: RateLimit // authenticated routes, keyed by install id
    ALCHEMY_WEBHOOK_ID: string // wrangler secret; Notify address-activity webhook (Sepolia)
    ALCHEMY_SIGNING_KEY: string // wrangler secret; verifies X-Alchemy-Signature
    ALCHEMY_NOTIFY_TOKEN: string // wrangler secret; edits the webhook address list
    EXPO_ACCESS_TOKEN: string // wrangler secret; Expo Push Service
  }
  Variables: { installId: string }
}
