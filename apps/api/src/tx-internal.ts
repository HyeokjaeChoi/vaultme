import type { TxInternalResponse } from '@vaultme/contracts'
import { z } from 'zod'
import { UpstreamError } from './errors.ts'

// Rows of Etherscan `txlistinternal&txhash=` (https://docs.etherscan.io/api-reference/endpoint/txlistinternal-txhash).
// Only the four fields we use are required; the by-hash docs do not list `hash` or `traceId`.
const Addr = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .transform((s) => s.toLowerCase())
const Row = z.object({
  from: Addr,
  to: Addr.or(z.literal('')),
  value: z.string().regex(/^\d+$/),
  isError: z.string().optional(),
})

/** Pure. A row we cannot read -> UpstreamError (503): a wrong amount must not be shown as right. */
export function parseInternalRows(rows: unknown[]): TxInternalResponse {
  return {
    items: rows.map((raw) => {
      const p = Row.safeParse(raw)
      if (!p.success) throw new UpstreamError('bad row')
      const r = p.data
      return { from: r.from, to: r.to || null, value: r.value, ok: r.isError !== '1' }
    }),
  }
}
