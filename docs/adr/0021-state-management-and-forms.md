# 0021. State management and forms: TanStack Query, one Zustand store, derived send status, react-hook-form

Status: Accepted (2026-10-31, issue #287, owner decisions of 2026-10-31). Restores the LLD decisions Q62 and Q65 (approved 2026-10-13, commit 1623a53: the requirements-session record and LLD §2, both removed by PR #106) and changes Q62 ②.
Supersedes/Aliases: Q62, Q65

## Context
Q62 split app state into three kinds, and Q65 chose the form library. Neither was implemented: the app has no TanStack Query, Zustand or react-hook-form, and the `wallet-core` reducer (`reduce`, `canStartDraft`) was used only by its tests. PR #106 moved the design docs into `ARCHITECTURE.md` and ADRs and dropped both decisions as "stale claims (code wins)". No record says that anyone chose to drop them.

## Decision
- Server state (balance, history, fee estimate, transaction receipt facts): TanStack Query. Data that is JSON-safe and not already stored by its own seam is persisted to MMKV (Q63, ADR-0004; today: balances). The web app uses TanStack Query too.
- Send status: a pure derivation from chain facts, `deriveState` in `wallet-core`, not an event reducer. This is the change to Q62 ②. Reasons:
  - Status follows chain facts (ADR-0006). A function of the facts cannot drift. An event reducer drifts when a poll is missed or the app restarts.
  - State holds ground truth, and derived values are computed (vercel-react-native-skills `state-ground-truth`, `react-state-minimize`; vercel-react-best-practices `rerender-derived-state-no-effect`).
  - Send state rules belong in `wallet-core` (Q59: pure TypeScript, no React or React Native).
  - The steps before the network (review, auth, submit) stay one `runSend` call that returns a typed outcome.
- Global UI state (lock, backup done, opt-in notices): one Zustand store, hydrated synchronously from MMKV before the first render (Q63).
- Screen-local input state: component `useState`.
- Forms: react-hook-form with a zod resolver (Q65). The form library owns only input state (touched, error display, focus). Format schemas live in `packages/contracts`. Business rules (balance, Max with the fee cap, native fee shortfall for ERC-20) come from `wallet-core` inside the resolver, so each rule has one source.
- Not used: XState, Redux.

## Consequences
- The work lands in 6 PRs:
  1. This ADR, the move of `deriveState`, and removal of the unused reducer.
  2. The TanStack Query provider and MMKV persister, starting with the balance.
  3. History, fee estimate and receipt polling (`useTrackedTx`).
  4. The Zustand store.
  5. Forms (done, #300: send recipient, send amount, restore, backup word check).
  6. Web viewer server state with TanStack Query in memory only (#291, done).
  PR 3 notes: the receipt poll keeps `startPolling` (15 s, focused screen, stops when final or Unknown) and fetches each check through the query client, not `refetchInterval`. With `refetchInterval` the state would be written when data arrives, and a query shared by several screens could move an Unknown send without a manual re-check (ADR-0006). History, snapshot, review and receipt reads are not persisted (the history seam already stores its page; the others hold bigint or must be fresh).
- Until the last of these PRs merges, the code and this ADR differ on purpose. `ARCHITECTURE.md` says which parts are done.
