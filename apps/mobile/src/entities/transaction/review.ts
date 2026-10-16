import { formatDecimal, fromUnits, recipientRisk, toUnits, type RecipientRisk, type Review } from '@vaultme/wallet-core'
import { diffGroups, isAddressFormat } from '../../shared/lib/address'
import { recents, review } from './fixtures'

const FEE = review.fee.replace(' ETH', '')

export type ReviewValues = {
  recipient: string
  /** The recent address the recipient is compared with. Set only for a look-alike. */
  previous: string | null
  /** Full wallet-core result; burn and tokenContract get a warning on Review. */
  risk: RecipientRisk
  amount: string
  fee: string
  feeCap: string
  total: string
  /** Worst case: amount + fee cap. Shown under the total as "최대 …". */
  totalMax: string
}

/** Amount param from the keypad ("5." allowed) -> clean decimal string, or null when it is not a usable ETH amount. */
export function cleanAmount(raw: string | undefined): string | null {
  const a = raw?.replace(/\.$/, '')
  if (!a) return null
  try {
    return toUnits(a, 'ETH') > 0n ? a : null
  } catch {
    return null
  }
}

/**
 * Values shown on Review. Entered `to` and `amount` win; a missing or malformed param falls back to the fixture, so old deep links still work.
 * Look-alike = wallet-core `recipientRisk` against recent addresses. `forceRisk` (?risk=1) marks the fixture look-alike.
 * Total = amount + estimated fee (not the fee cap).
 * `core` = wallet-core `prepare()` result: fee, cap and total come from it. Without it (fixture preview) they come from the Review fixture.
 */
export function resolveReview(to?: string, amount?: string, forceRisk = false, core?: Review): ReviewValues {
  const entered = to && isAddressFormat(to) ? to : null
  const recipient = entered ?? (forceRisk ? review.lookalike : review.recipient)
  const risk: RecipientRisk = forceRisk ? 'lookalike' : recipientRisk(recipient as `0x${string}`, recents.map((r) => r.address as `0x${string}`))
  const lookalike = risk === 'lookalike'
  // Previous = the recent address that differs from the recipient in the fewest (but not zero) 4-char groups.
  const previous = lookalike
    ? ([...recents.map((r) => r.address)]
        .map((a) => ({ a, n: diffGroups(recipient, a).length }))
        .filter((c) => c.n > 0)
        .sort((x, y) => x.n - y.n)[0]?.a ?? review.recipient)
    : null
  const clean = cleanAmount(amount)
  const shown = clean ?? review.amount.replace(' ETH', '')
  const fee = core ? fromUnits(core.estimatedFee, 'ETH') : FEE
  const feeCap = core ? `${fromUnits(core.feeCap, 'ETH')} ETH` : review.feeCap
  const total = fromUnits(toUnits(shown, 'ETH') + toUnits(fee, 'ETH'), 'ETH')
  const totalMax = fromUnits(toUnits(shown, 'ETH') + toUnits(feeCap.replace(' ETH', ''), 'ETH'), 'ETH')
  return { recipient, previous, risk, amount: `${formatDecimal(shown, 'ETH', 'exact')} ETH`, fee: `${fee} ETH`, feeCap, total: `${total} ETH`, totalMax: `${totalMax} ETH` }
}
