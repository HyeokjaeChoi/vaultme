# 0025. Deployment environments and chain networks are separate axes; production is created at the first public release

Status: Accepted (2026-11-01 from issue #316, owner decision of 2026-11-01)
Supersedes/Aliases: Q52 in part (production environment, EAS production channel), Q53 in part (gradual deploy), Q55 in part (release tag, manual approval, gradual deploy)

## Context
Q52 asks for local, staging and production, all on Sepolia. Q53 and Q55 ask for a release tag, a manual approval and a gradual deploy. Only staging is deployed today: `api-staging.yml` and `web-staging.yml`. The EAS profile `development` points at staging. `apps/api/wrangler.jsonc` has a `production` env block that no workflow uses. The owner asked how dev, staging and production map to testnet and mainnet.

Common pairing (general practice, not a cited source):

| Deployment environment | Usual chain network |
|---|---|
| dev (local machine) | local chain or testnet |
| staging | testnet |
| production | mainnet, sometimes with a testnet toggle |

## Decision
- Two separate axes.
  - Deployment environment (dev = local machine, staging, production): which code version runs and who uses it.
  - Chain network (local chain, Sepolia, mainnet): where funds and data live.
- Each environment allows a set of networks. No per-environment network config exists yet: Sepolia is fixed in code (`packages/wallet-core/src/constants.ts`) and every environment allows Sepolia only. A mainnet ADR adds the config.
- Staging is the only deployed environment. It is the live service for the testnet portfolio.
- The production deployment environment is created at the first public release. Then the production parts of Q52 and Q55 are built: release tag, manual approval, gradual Workers deploy, EAS production channel, GitHub Environments.
- Allowing mainnet is a separate future ADR. It is never bundled with creating production. Prerequisites:
  - security audit
  - key-handling review
  - real-asset copy and warnings
  - legal review
  - incident response runbook
  - a change of the project's testnet-only rule (`AGENTS.md`, intro)

## Consequences
- The production-only parts of Q52, Q53 (gradual deploy) and Q55 (release tag, approval, gradual deploy) are superseded until the first public release. The other parts of Q53 and Q55 stay open in #316 and are decided one by one.
- The unused `production` block in `apps/api/wrangler.jsonc` stays. No workflow deploys it; it is the starting point for the first public release.
- Creating production does not allow mainnet. A mainnet change needs its own ADR.

<!-- verified: apps/api/wrangler.jsonc, .github/workflows/api-staging.yml, .github/workflows/web-staging.yml, apps/mobile/eas.json -->
