import { z } from 'zod'

export const Address = z.string().regex(/^0x[0-9a-fA-F]{40}$/)
export type Address = z.infer<typeof Address>

export const HISTORY_PAGE_SIZE = 50

// POST /v1/history body (owner decision 2026-10-14). `cursor` is the opaque `nextCursor` of the previous page (LLD §4.2).
// Its format is checked by the server (`400 invalid_cursor`), not here, so the client never depends on it.
export const HistoryRequest = z
  .object({ address: Address, cursor: z.string().max(100).optional() })
  .meta({ id: 'HistoryRequest' })
export type HistoryRequest = z.infer<typeof HistoryRequest>

// One movement of value relative to the requested address (LLD §4.2). Addresses are lowercase.
export const HistoryItem = z
  .object({
    id: z.string().describe('Unique within a response: `<hash>:<seq>`.'),
    kind: z.enum(['native', 'internal', 'erc20']),
    hash: z.string(),
    blockNumber: z.number().int().nonnegative(),
    txIndex: z.number().int().nonnegative(),
    timestamp: z.number().int().nonnegative().describe('Unix seconds.'),
    direction: z.enum(['in', 'out']).describe('Relative to the address. A transfer to itself is `out`, except that a zero-value erc20 row is `out` only if the tx sender is the address (#53).'),
    asset: z.enum(['ETH', 'USDC']),
    value: z.string().regex(/^\d+$/).describe('Raw units (wei, or USDC with 6 decimals), decimal string.'),
    from: Address,
    to: Address.nullable().describe('Null for a contract creation.'),
    status: z.enum(['ok', 'failed']).describe('`failed`: the value did not move.'),
    zeroValue: z.boolean().describe('value is 0 (contract call, or an address-poisoning transfer, Q71).'),
  })
  .meta({ id: 'HistoryItem' })
export type HistoryItem = z.infer<typeof HistoryItem>

export const HistoryResponse = z
  .object({
    items: z.array(HistoryItem).max(HISTORY_PAGE_SIZE).describe('Newest first.'),
    nextCursor: z.string().nullable().describe('Null on the last page.'),
    incomplete: z
      .boolean()
      .describe('One block had more rows than the server can read for one address. Its rows are missing; `nextCursor` continues below it.'),
  })
  .meta({ id: 'HistoryResponse' })
export type HistoryResponse = z.infer<typeof HistoryResponse>
