import { z } from 'zod'

export const Address = z.string().regex(/^0x[0-9a-fA-F]{40}$/)
export type Address = z.infer<typeof Address>

// POST /v1/history body (owner decision 2026-10-14). The response shape is not specified yet.
export const HistoryRequest = z
  .object({ address: Address, cursor: z.string().optional() })
  .meta({ id: 'HistoryRequest' })
export type HistoryRequest = z.infer<typeof HistoryRequest>
