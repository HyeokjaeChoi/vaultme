// Build-time constants (vite.config.ts `define`).
/** The API origin of this build: WEB_API_ORIGIN, default the staging API. scripts/finalize.ts puts the same origin in the CSP. */
declare const __API_ORIGIN__: string
/** apps/web package.json version, sent as X-App-Version and checked against the API's MIN_WEB_VERSION (ADR-0011). */
declare const __WEB_VERSION__: string
/** Cloudflare Web Analytics token of this build (WEB_ANALYTICS_TOKEN); empty means no beacon. */
declare const __ANALYTICS_TOKEN__: string
