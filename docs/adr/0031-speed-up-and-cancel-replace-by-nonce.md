# 0031. Speed up and cancel replace a pending send by its nonce

Status: Accepted (2026-11-02 from issue #361, owner decisions D1–D8 of 2026-11-02)
Supersedes/Aliases: ADR-0006 in part ("the app never resends" now means "never on its own"; the state rule gains the replacement hashes), ADR-0030 (the "revisit" consequence is answered: still no `replaced` push)

## Context
A send can stay Pending when its fee is too low. ADR-0006 says the app never resends, so the user can only wait. Other wallets offer speed up and cancel. Both sign a new transaction with the same nonce. The network runs only one of them. Geth and Reth accept a replacement only when both `maxFeePerGas` and `maxPriorityFeePerGas` rise by at least 10 %.

## Decision
- The app resends only when the user asks, from the Pending send screen (S23, S41), after a confirm sheet and the same device authentication as a send.
- **Speed up**: the same transaction with higher fees. **Cancel**: a 0 ETH send to the user's own account, gas 21000, same nonce.
- Each new fee field = max(ceil(latest sent fee × 1.1) + 1 wei, the current market value from the send fee formula). No count limit. When the new maximum fee is more than the ETH balance, the action is disabled with a reason.
- One send stays one record and one row. The record keeps `nonce`, `hashes` (original first, then each replacement) and `kind` of the latest replacement (`speedUp` or `cancel`).
- State (extends ADR-0006): a receipt for any of the record's hashes decides Included, Confirmed or Failed. A mined cancel gives Replaced with cancel copy. Replaced for other reasons only when no own hash has a receipt and the `safe` nonce is above ours. Time alone still never changes a state.
- Etherscan links go to the mined hash, else to the latest sent hash.
- No new push. The existing send push fires once for the mined hash. A mined cancel is a 0-value self-send and sends no push (ADR-0023). There is no `replaced` push (ADR-0030).
- Staged: speed up first, cancel second.

## Consequences
- The record shape changes. Records written before this change have one hash and still read correctly.
- Copy never claims a cancel before the chain shows it: after a cancel is sent the state stays Pending.
- A cancel can fail when the original mines first. The user still pays the fee of whichever transaction mined.
- The state function stays pure and is tested without a network, now with several hashes per record.

<!-- verified: docs/adr/0006-send-status-follows-chain-facts.md, docs/adr/0030-no-replaced-push.md -->
