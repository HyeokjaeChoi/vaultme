import { z } from 'zod'
import { Address } from './history.ts'

// POST /v1/tx/internal body (owner decision 2026-10-26, ADR-0015). `hash` is a 32-byte transaction hash.
export const TxInternalRequest = z
  .object({ hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) })
  .meta({ id: 'TxInternalRequest' })
export type TxInternalRequest = z.infer<typeof TxInternalRequest>

// One ETH move that a contract made while the transaction ran. Addresses are lowercase.
const TxInternalItem = z
  .object({
    from: Address,
    to: Address.nullable().describe('Null for a contract creation.'),
    value: z.string().regex(/^\d+$/).describe('Wei, decimal string.'),
    ok: z.boolean().describe('`false`: the call failed and the value did not move.'),
  })
  .meta({ id: 'TxInternalItem' })
type TxInternalItem = z.infer<typeof TxInternalItem>

export const TxInternalResponse = z
  .object({
    items: z
      .array(TxInternalItem)
      .describe('Etherscan order. Empty: none, or Etherscan has not indexed the block yet.'),
  })
  .meta({ id: 'TxInternalResponse' })
export type TxInternalResponse = z.infer<typeof TxInternalResponse>
