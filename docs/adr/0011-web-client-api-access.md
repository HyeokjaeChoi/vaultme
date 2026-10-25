# 0011. The web client reaches the API with an origin allow-list and a WebCrypto install key

Status: Accepted (2026-10-25, spec issue #186, owner grilling Q2, Q12). Target state: the API code is changed in issue #191; until then it still rejects `Origin`.
Supersedes: the "no browser client" part of [0008](0008-anonymous-install-identity.md) (Origin rejection, no CORS headers, "A browser client cannot use the API").

## Context
ADR-0008 had one client, the native app, so the API rejected every request with an `Origin` header. The web app (`apps/web`, see [0012](0012-web-scope-and-quality-bars.md)) runs in a browser and must call the same API. The abuse limits must apply to the web too. The API must not become open to every site.

## Decision
- CORS allow-list of exactly two origins: `https://vaultme.stack-line.dev` and `https://vaultme-staging.stack-line.dev`. A request from any other origin is still rejected.
- The browser makes a non-extractable ECDSA P-256 key with WebCrypto and keeps it in IndexedDB. Same protocol as mobile: register the public key, get an install ID, sign a request, get a 15-minute HMAC token.
- Wire format: raw 65-byte public key and 64-byte `r||s` signature. WebCrypto output matches the input of the server's `crypto.subtle.verify`, so the server auth code needs no change.
- The web sends `X-Client: web` and its build version. The API has a separate `MIN_WEB_VERSION`. A mobile minimum-version bump does not break the web. On 426 the web shows "새로고침해 주세요" (a stale cached build).
- Mobile and web share one install-identity module behind a device-signer seam (see issue #186).
- Everything else in ADR-0008 stays: no link between install ID and wallet address, stateless token, rate limits by install ID.

## Consequences
- The API accepts browsers from two origins only. A new web origin needs a new ADR or an amendment.
- A non-extractable key stops key theft by script, not abuse: anyone can still make a new install (same as ADR-0008).
- The web and mobile minimum versions move separately.
- The privacy notice must say that every address the viewer opens passes through our server (ADR-0007). The address stays in the URL fragment, so it does not reach the web host, logs or analytics.
