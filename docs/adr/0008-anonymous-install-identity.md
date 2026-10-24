# 0008. Install identity is a device key, not an account

Status: Accepted (2026-10-14 derived from the removed LLD, see git history)
Supersedes/Aliases: Q57

## Context
The proxy needs to limit abuse, but the app has no user accounts. Device attestation is out of scope. The only client is a native app.

## Decision
On first start the app makes an ECDSA P-256 key pair. It is not the wallet key. The app registers the public key and gets an install ID. A signed request (timestamp, one-time nonce, canonical string) gets a 15-minute HMAC token. The token is stateless. Other routes need the token and the `X-App-Version` header; the server rejects an app below the minimum version. The install ID is never linked to a wallet address. The server rejects any request that has an `Origin` header and sends no CORS headers.

## Consequences
- This raises the cost of abuse. It is not strong defense: anyone can make a new install.
- Rate limits use the install ID. The IP limit is coarse because mobile networks share IPs.
- A browser client cannot use the API.

<!-- verified: apps/api/src/auth.ts, apps/api/src/app.ts, apps/mobile/src/shared/api/client.ts, apps/mobile/src/shared/api/deviceKey.ts, apps/mobile/src/shared/storage/keychain.ts, apps/api/migrations/0001_installs.sql -->
