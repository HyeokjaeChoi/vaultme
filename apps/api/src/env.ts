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
    ETHERSCAN_BUCKET: DurableObjectNamespace<EtherscanBucket> // global 2.5 calls/s (LLD §5.1)
    HISTORY_IP_LIMITER: RateLimit // /v1/history, keyed by IP (coarse, 300/60s)
    INSTALL_LIMITER: RateLimit // authenticated routes, keyed by install id
  }
  Variables: { installId: string }
}
