# 0007. The app reaches chain data only through our API proxy

Status: Accepted (2026-10-13 derived from the removed requirements-session doc, see git history)
Supersedes/Aliases: Q30 (direct call part), Q32, Q58, Q78, Q36

## Context
Provider keys cannot ship inside an app. Wallets such as MetaMask and Rabby also use their own back end. A proxy sees the address of every user, also users without push.

## Decision
All JSON-RPC and history calls go to our API. The keys exist only as server secrets. The RPC proxy has a method allow-list and no batch. It tries Infura, then Alchemy. History comes from Etherscan V2 (three lists merged, one global call rate), not from Alchemy. The server stores no history and does not log addresses. The app keeps its last history with an update time.

## Consequences
- The privacy notice must say that every address passes through our server.
- If our API is down, the app cannot send or refresh. It shows cached data.
- History has no fallback provider.

<!-- verified: apps/api/src/rpc.ts, apps/api/src/etherscan.ts, apps/api/src/app.ts, apps/mobile/src/shared/api/history.ts, apps/mobile/src/shared/chain/real.ts -->
