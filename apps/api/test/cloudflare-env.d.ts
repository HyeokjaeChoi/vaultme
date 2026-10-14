// Types the `env` binding bag seen by tests (cloudflare:workers).
declare namespace Cloudflare {
  interface Env {
    MIN_APP_VERSION: string
    DB: D1Database
    TOKEN_SECRET: string
    INSTALL_IP_LIMITER: RateLimit
    INSTALL_LIMITER: RateLimit
    TEST_MIGRATIONS: import('cloudflare:test').D1Migration[]
  }
}
