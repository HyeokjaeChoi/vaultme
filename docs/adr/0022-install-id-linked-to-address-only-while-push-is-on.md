# 0022. The install ID is linked to a wallet address only while push is on

Status: Accepted (2026-11-01, issue #317, owner decision)
Supersedes in part: [0008](0008-anonymous-install-identity.md) (the sentence "The install ID is never linked to a wallet address"; requirements Q57) and the matching line in [0011](0011-web-client-api-access.md) ("no link between install ID and wallet address").

## Context
ADR-0008 and ADR-0011 say the install ID is never linked to a wallet address. Push ([0010](0010-push-from-alchemy-webhook.md)) breaks this: `push_subscriptions` stores `install_id` and `address` in one row. A decision audit (#317) found the gap. The owner chose to record the real behaviour. No schema change.

## Decision
- The install ID is linked to a wallet address only while push is on. The link is the `push_subscriptions` row (one row per install).
- The link is deleted on opt-out (`DELETE /v1/push/subscription`) or after 30 days of inactivity (ADR-0010).
- Without push, no link exists. No other table or log joins an install ID to an address.
- The rest of ADR-0008 and ADR-0011 still binds.

## Consequences
- Privacy text must say push stores the address until opt-out (app privacy notice, #311).
- The 90-day purge of idle `installs` rows (Q31) removes the install and its nonces; the push link is already gone by then.
