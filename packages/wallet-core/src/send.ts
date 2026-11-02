import { isAddress, keccak256, type Address, type Hash, type Hex } from 'viem'
import { toUnits, AmountError } from './amount'
import { ABS_MAX_FEE_WEI, ASSETS, type AssetId } from './constants'
import { recipientRisk, type RecipientRisk } from './risk'

/** Local tx hash: keccak256 of the signed raw tx (ADR-0005). */
export const txHash = (raw: Hex): Hash => keccak256(raw)
export type { Address, Hash, Hex }

export type SendIntent = {
  asset: AssetId
  to: Address
  /** Decimal string typed by the user, e.g. "1.25". */
  amount: string
  /** Addresses this wallet sent to before. */
  previous: readonly Address[]
}

/** Network facts fetched by the app (through the API proxy). wallet-core does no IO. */
export type ChainSnapshot = {
  nonce: number
  nativeBalance: bigint
  tokenBalance: bigint
  gasLimit: bigint
  baseFeePerGas: bigint
  maxPriorityFeePerGas: bigint
}

export type Warning =
  { kind: 'recipientRisk'; risk: Exclude<RecipientRisk, 'known'> } | { kind: 'nativeFeeShortfall'; shortBy: bigint }

export type Review = {
  asset: AssetId
  to: Address
  amount: bigint
  gasLimit: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  nonce: number
  estimatedFee: bigint
  /** Worst-case fee the user approves: gasLimit * maxFeePerGas. */
  feeCap: bigint
  risk: RecipientRisk
  warnings: Warning[]
}
export type ApprovedSend = Review

export type PrepareError =
  'invalidAddress' | 'invalidAmount' | 'tooManyDecimals' | 'zeroAmount' | 'insufficientFunds' | 'overAbsCap'
export type PrepareResult = { ok: true; review: Review } | { ok: false; error: PrepareError }

/** EIP-1559 rule of thumb: max fee = 2 * base + tip. */
function fees(s: ChainSnapshot) {
  const maxFeePerGas = 2n * s.baseFeePerGas + s.maxPriorityFeePerGas
  return {
    maxFeePerGas,
    estimatedFee: s.gasLimit * (s.baseFeePerGas + s.maxPriorityFeePerGas),
    feeCap: s.gasLimit * maxFeePerGas,
  }
}

/** The market fee fields of a snapshot (the send fee formula: max fee = 2 * base + tip). Speed up never goes below them (ADR-0031). */
export const marketFeesOf = (s: ChainSnapshot): { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint } => ({
  maxFeePerGas: fees(s).maxFeePerGas,
  maxPriorityFeePerGas: s.maxPriorityFeePerGas,
})

/** Worst-case fee (gasLimit x maxFeePerGas) for a snapshot: the cap the user approves. */
export const feeCapOf = (s: ChainSnapshot): bigint => fees(s).feeCap

export function prepare(intent: SendIntent, chain: ChainSnapshot): PrepareResult {
  if (!isAddress(intent.to)) return { ok: false, error: 'invalidAddress' }
  let amount: bigint
  try {
    amount = toUnits(intent.amount, intent.asset)
  } catch (e) {
    if (e instanceof AmountError) return { ok: false, error: e.code === 'format' ? 'invalidAmount' : 'tooManyDecimals' }
    throw e
  }
  if (amount === 0n) return { ok: false, error: 'zeroAmount' }

  const native = ASSETS[intent.asset].kind === 'native'
  if (amount > (native ? chain.nativeBalance : chain.tokenBalance)) return { ok: false, error: 'insufficientFunds' }

  const { maxFeePerGas, estimatedFee, feeCap } = fees(chain)
  if (feeCap > ABS_MAX_FEE_WEI) return { ok: false, error: 'overAbsCap' }

  const risk = recipientRisk(intent.to, intent.previous)
  const warnings: Warning[] = []
  if (risk !== 'known') warnings.push({ kind: 'recipientRisk', risk })
  const needNative = feeCap + (native ? amount : 0n)
  if (needNative > chain.nativeBalance) {
    warnings.push({ kind: 'nativeFeeShortfall', shortBy: needNative - chain.nativeBalance })
  }

  return {
    ok: true,
    review: {
      asset: intent.asset,
      to: intent.to,
      amount,
      gasLimit: chain.gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas: chain.maxPriorityFeePerGas,
      nonce: chain.nonce,
      estimatedFee,
      feeCap,
      risk,
      warnings,
    },
  }
}

/** Sends the signed raw tx. Returns the hash the node reports. */
export type SubmitFn = (rawTx: Hex) => Promise<Hash>

export type SubmitResult =
  | { status: 'NeedsReview' } // fee cap rose above approval -> FEE_CAP_EXCEEDED
  | { status: 'Blocked' } // absolute cap -> ABS_CAP_EXCEEDED
  | { status: 'Pending'; hash: Hash } // SUBMITTED
  | { status: 'Unknown'; hash: Hash; reason: 'hashMismatch' | 'submitError' } // SUBMIT_UNKNOWN (hash = locally computed)
