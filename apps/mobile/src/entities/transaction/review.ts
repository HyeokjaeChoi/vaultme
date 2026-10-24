import {
  formatDecimal,
  fromUnits,
  recipientRisk,
  toUnits,
  type AssetId,
  type RecipientRisk,
  type Review,
} from '@vaultme/wallet-core'
import { diffGroups, isAddressFormat } from '../../shared/lib/address'
import { review } from './fixtures'

const FEE = review.fee.replace(' ETH', '')

export type ReviewValues = {
  recipient: string
  /** The recent address the recipient is compared with. Set only for a look-alike. */
  previous: string | null
  /** Full wallet-core result; burn and tokenContract get a warning on Review. */
  risk: RecipientRisk
  asset: AssetId
  amount: string
  /** Always ETH (the fee is paid in ETH for every asset). */
  fee: string
  feeCap: string
  /** ETH only: amount + estimated fee. null for a token: the fee is never added to the token amount (owner decision 2026-10-17). */
  total: string | null
  /** ETH only: worst case, amount + fee cap. Shown under the total as "최대 …". */
  totalMax: string | null
}

/** Amount param from the keypad ("5." allowed) -> clean decimal string, or null when it is not a usable amount of `asset`. */
export function cleanAmount(raw: string | undefined, asset: AssetId = 'ETH'): string | null {
  const a = raw?.replace(/\.$/, '')
  if (!a) return null
  try {
    return toUnits(a, asset) > 0n ? a : null
  } catch {
    return null
  }
}

/**
 * Values shown on Review. Entered `to` and `amount` win; a missing or malformed param falls back to the fixture, so old deep links still work.
 * Look-alike = wallet-core `recipientRisk` against recent addresses. `forceRisk` (?risk=1) marks the fixture look-alike.
 * ETH total = amount + estimated fee (not the fee cap); a token has no total.
 * `recentAddresses` = recipients this device sent to (look-alike check). `core` = wallet-core `prepare()` result: fee, cap and total come from it. Without it (fixture preview) they come from the Review fixture.
 */
export function resolveReview(
  to?: string,
  amount?: string,
  forceRisk = false,
  core?: Review,
  recentAddresses: readonly string[] = [review.recipient],
  asset: AssetId = core?.asset ?? 'ETH',
): ReviewValues {
  const entered = to && isAddressFormat(to) ? to : null
  const recipient = entered ?? (forceRisk ? review.lookalike : review.recipient)
  const risk: RecipientRisk = forceRisk
    ? 'lookalike'
    : recipientRisk(
        recipient as `0x${string}`,
        recentAddresses.map((a) => a as `0x${string}`),
      )
  const lookalike = risk === 'lookalike'
  // Previous = the recent address that differs from the recipient in the fewest (but not zero) 4-char groups.
  const previous = lookalike
    ? (recentAddresses
        .map((a) => ({ a, n: diffGroups(recipient, a).length }))
        .filter((c) => c.n > 0)
        .reduce<{ a: string; n: number } | undefined>((best, c) => (best && best.n <= c.n ? best : c), undefined)?.a ??
      review.recipient)
    : null
  const clean = cleanAmount(amount, asset)
  const shown = clean ?? review.amount.replace(' ETH', '')
  const fee = core ? fromUnits(core.estimatedFee, 'ETH') : FEE
  const feeCap = core ? `${fromUnits(core.feeCap, 'ETH')} ETH` : review.feeCap
  const eth = asset === 'ETH'
  const total = eth ? `${fromUnits(toUnits(shown, 'ETH') + toUnits(fee, 'ETH'), 'ETH')} ETH` : null
  const totalMax = eth
    ? `${fromUnits(toUnits(shown, 'ETH') + toUnits(feeCap.replace(' ETH', ''), 'ETH'), 'ETH')} ETH`
    : null
  return {
    recipient,
    previous,
    risk,
    asset,
    amount: `${formatDecimal(shown, asset, 'exact')} ${asset}`,
    fee: `${fee} ETH`,
    feeCap,
    total,
    totalMax,
  }
}
