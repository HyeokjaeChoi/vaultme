import { ASSETS, ABS_MAX_FEE_WEI, type AssetId } from './constants'

export type FeeFields = { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }

/** ceil(v * 1.1) + 1 wei: Geth and Reth accept a same-nonce replacement only when both fee fields rise by at least 10 % (ADR-0031). */
const bump = (v: bigint): bigint => (v * 11n + 9n) / 10n + 1n

/** Each fee field of a replacement = max(bump of the latest sent value, the market value) (ADR-0031 D2). */
const replacementFees = (latestSent: FeeFields, market: FeeFields): FeeFields => ({
  maxFeePerGas: max(bump(latestSent.maxFeePerGas), market.maxFeePerGas),
  maxPriorityFeePerGas: max(bump(latestSent.maxPriorityFeePerGas), market.maxPriorityFeePerGas),
})
const max = (a: bigint, b: bigint) => (a > b ? a : b)

export type SpeedUpPlan = FeeFields & {
  gasLimit: bigint
  /** gasLimit x maxFeePerGas of the latest sent tx and of the replacement (worst case, in wei). */
  currentFeeCap: bigint
  newFeeCap: bigint
  /** newFeeCap - currentFeeCap: "지금보다 N ETH 많아요". */
  extra: bigint
  /** ETH the account must hold for the replacement: newFeeCap, plus the amount for an ETH send. */
  needed: bigint
  /** needed - ETH balance, 0n when covered. > 0 disables the action (ADR-0031). */
  shortBy: bigint
  /** newFeeCap is above the absolute fee cap: the signer refuses it. */
  overAbsCap: boolean
}

/** Pure fee math of a speed up. `amount` is the send amount in base units of `asset`; only an ETH send needs it in the ETH balance. */
export function planSpeedUp(i: {
  latestSent: FeeFields
  market: FeeFields
  gasLimit: bigint
  asset: AssetId
  amount: bigint
  nativeBalance: bigint
}): SpeedUpPlan {
  const fees = replacementFees(i.latestSent, i.market)
  const newFeeCap = i.gasLimit * fees.maxFeePerGas
  const currentFeeCap = i.gasLimit * i.latestSent.maxFeePerGas
  const needed = newFeeCap + (ASSETS[i.asset].kind === 'native' ? i.amount : 0n)
  return {
    ...fees,
    gasLimit: i.gasLimit,
    currentFeeCap,
    newFeeCap,
    extra: newFeeCap - currentFeeCap,
    needed,
    shortBy: needed > i.nativeBalance ? needed - i.nativeBalance : 0n,
    overAbsCap: newFeeCap > ABS_MAX_FEE_WEI,
  }
}

/** A cancel is a 0 ETH send to the user's own account: a plain transfer (ADR-0031). */
const CANCEL_GAS = 21_000n

/** Fee plan of a cancel: the speed-up fee rule, gas 21000, no amount. `needed` = the new fee cap only. */
export const planCancel = (i: { latestSent: FeeFields; market: FeeFields; nativeBalance: bigint }): SpeedUpPlan =>
  planSpeedUp({ ...i, gasLimit: CANCEL_GAS, asset: 'ETH', amount: 0n })
