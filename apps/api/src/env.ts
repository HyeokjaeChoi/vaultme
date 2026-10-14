export type Env = {
  Bindings: {
    MIN_APP_VERSION: string
    DB: D1Database
    TOKEN_SECRET: string // wrangler secret; .dev.vars locally
    INSTALL_IP_LIMITER: RateLimit // POST /v1/installs, keyed by IP (coarse)
    INSTALL_LIMITER: RateLimit // authenticated routes, keyed by install id
  }
  Variables: { installId: string }
}
