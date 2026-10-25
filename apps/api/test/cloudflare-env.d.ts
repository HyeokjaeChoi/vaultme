// Types the `env` binding bag seen by tests (cloudflare:workers).
declare namespace Cloudflare {
  interface Env {
    MIN_APP_VERSION: string
    MIN_WEB_VERSION: string
    WEB_ORIGINS: string
    DB: D1Database
    TOKEN_SECRET: string
    INSTALL_IP_LIMITER: RateLimit
    INSTALL_LIMITER: RateLimit
    RPC_IP_LIMITER: RateLimit
    HISTORY_IP_LIMITER: RateLimit
    ETHERSCAN_API_KEY: string
    ETHERSCAN_BUCKET: DurableObjectNamespace<import('../src/bucket.ts').EtherscanBucket>
    INFURA_KEY: string
    ALCHEMY_KEY: string
    ALCHEMY_WEBHOOK_ID: string
    ALCHEMY_SIGNING_KEY: string
    ALCHEMY_NOTIFY_TOKEN: string
    EXPO_ACCESS_TOKEN: string
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[]
  }
}
