# 0027. The API client stays hand-written; a test checks its paths against the OpenAPI spec

Status: Accepted (2026-11-02 from issue #350, owner decision of 2026-11-02)
Supersedes/Aliases: Q61 in part (the "generated client" part only; the zod + OpenAPI source and the breaking-change diff stay)

## Context
Q61 asked for a generated client. `packages/api-client` is hand-written on the shared zod schemas of `@vaultme/contracts`, and both `apps/mobile` and `apps/web` use it. The one real gap was drift: a typo in a client path, or a server route that is renamed or removed, was not caught by any check.

## Decision
- Keep the hand-written client. The shared `@vaultme/contracts` schemas give the request body types (history, tx internal and push requests are parsed before they are sent) and a run-time response check. Where that check runs differs per endpoint:
  - In the client: `/v1/installs` (`RegisterResponse`), `/v1/installs/token` (`TokenResponse`), `/v1/rpc` (`RpcResponse`), `/v1/push/subscription` PUT and DELETE (`PushOkResponse`).
  - After the client, on purpose: `history` returns the JSON as is; `parseItems` and `parseNextCursor` in `packages/history` check it item by item, so one unknown item does not fail the page. `txInternal` returns the JSON as is; `readInternalTransfers` (`TxInternalResponse.parse`, in this package) checks it for the apps.
- A generated client (for example openapi-fetch) does no run-time response check and would repeat types that `@vaultme/contracts` already has.
- Close the gap with `packages/api-client/test/openapi-paths.test.ts`. It calls every client method with a stubbed `fetch` and asserts the exact `METHOD path` each one sends (so a swapped method or a redirect to another route fails), and that each such operation is in `docs/openapi/v1.json`. A client method without a row in the test fails it too.

## Consequences
- A path typo or a renamed or removed route turns CI red.
- Request and response bodies are not compared with the spec: the zod schemas are the one source for both.
- Revisit when a non-TypeScript or external consumer of the API appears.

<!-- verified: packages/api-client/test/openapi-paths.test.ts, packages/api-client/src/client.ts, packages/api-client/src/transaction.ts, packages/history/src/items.ts, docs/openapi/v1.json -->
