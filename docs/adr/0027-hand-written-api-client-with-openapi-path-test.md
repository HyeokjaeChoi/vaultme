# 0027. The API client stays hand-written; a test checks its paths against the OpenAPI spec

Status: Accepted (2026-11-02 from issue #350, owner decision of 2026-11-02)
Supersedes/Aliases: Q61 in part (the "generated client" part only; the zod + OpenAPI source and the breaking-change diff stay)

## Context
Q61 asked for a generated client. `packages/api-client` is hand-written on the shared zod schemas of `@vaultme/contracts`, and both `apps/mobile` and `apps/web` use it. The one real gap was drift: a typo in a client path, or a server route that is renamed or removed, was not caught by any check.

## Decision
- Keep the hand-written client. The shared `@vaultme/contracts` schemas give the request body types and check each response at run time.
- A generated client (for example openapi-fetch) does no run-time response check and would repeat types that `@vaultme/contracts` already has.
- Close the gap with `packages/api-client/test/openapi-paths.test.ts`. It calls every client method with a stubbed `fetch`, records each method and path, and fails when one is not in `docs/openapi/v1.json`. A client method without a row in the test fails it too.

## Consequences
- A path typo or a renamed or removed route turns CI red.
- Request and response bodies are not compared with the spec: the zod schemas are the one source for both.
- Revisit when a non-TypeScript or external consumer of the API appears.

<!-- verified: packages/api-client/test/openapi-paths.test.ts, packages/api-client/src/client.ts, docs/openapi/v1.json -->
