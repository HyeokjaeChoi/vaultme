import { zodResolver } from '@hookform/resolvers/zod'
import { AddressInput, AmountInput } from '@vaultme/contracts'
import type { AssetId } from '@vaultme/wallet-core'
import { z } from 'zod'
import { exceedsBalance, isZeroAmount } from '@/shared/lib/amount'

// Send forms (ADR-0021, Q65). Shape: contracts. Balance and the Max with the fee cap: wallet-core, through `sendLimits` (the `sendable` string) and `exceedsBalance` (toUnits).

export type RecipientForm = { to: string }
export type AmountForm = { amount: string }

export const recipientResolver = zodResolver(z.object({ to: AddressInput }), undefined, { mode: 'sync' })

/** Issue codes (`message` of the `amount` error). */
export const AMOUNT_ISSUE = { zero: 'zero', insufficient: 'insufficient', feeShort: 'feeShort' } as const

/**
 * `sendable` null = not known yet: no balance check (the keypad works, Review blocks). `feeShort` (USDC only, from `sendLimits`: the ETH balance does not cover the fee cap) is judged here too,
 * but the screen shows it as a warning and keeps 검토 on: Review blocks it. Only `zero`, `insufficient` and format issues disable 검토.
 */
export const amountResolver = (asset: AssetId, sendable: string | null, feeShort = false) =>
  zodResolver(
    z.object({
      amount: AmountInput.superRefine((a, ctx) => {
        if (isZeroAmount(a)) ctx.addIssue({ code: 'custom', message: AMOUNT_ISSUE.zero })
        else if (sendable !== null && exceedsBalance(a, sendable, asset))
          ctx.addIssue({ code: 'custom', message: AMOUNT_ISSUE.insufficient })
        else if (feeShort) ctx.addIssue({ code: 'custom', message: AMOUNT_ISSUE.feeShort })
      }),
    }),
    undefined,
    { mode: 'sync' },
  )

/** True when the only amount issue is the fee shortfall: it warns, 검토 stays on and Review blocks. */
export const isFeeShortOnly = (message: string | undefined): boolean => message === AMOUNT_ISSUE.feeShort
