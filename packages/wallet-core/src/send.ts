import {
  encodeFunctionData,
  erc20Abi,
  isAddress,
  keccak256,
  type Address,
  type Hash,
  type Hex,
} from 'viem'
import { mnemonicToAccount } from 'viem/accounts'
import { toUnits, AmountError } from './amount'
import { ABS_MAX_FEE_WEI, ASSETS, CHAIN, DERIVATION_PATH, type AssetId } from './constants'
import type { Mnemonic } from './mnemonic'
import { recipientRisk, type RecipientRisk } from './risk'

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
  | { kind: 'recipientRisk'; risk: Exclude<RecipientRisk, 'known'> }
  | { kind: 'nativeFeeShortfall'; shortBy: bigint }

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
  | 'invalidAddress'
  | 'invalidAmount'
  | 'tooManyDecimals'
  | 'zeroAmount'
  | 'insufficientFunds'
  | 'overAbsCap'
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

export async function signAndSubmit(
  approved: ApprovedSend,
  latest: ChainSnapshot,
  deps: { mnemonic: Mnemonic; submit: SubmitFn },
): Promise<SubmitResult> {
  const latestCap = fees(latest).feeCap
  if (approved.feeCap > ABS_MAX_FEE_WEI || latestCap > ABS_MAX_FEE_WEI) return { status: 'Blocked' }
  if (latestCap > approved.feeCap) return { status: 'NeedsReview' }

  const asset = ASSETS[approved.asset]
  const account = mnemonicToAccount(deps.mnemonic.reveal(), { path: DERIVATION_PATH })
  const raw = await account.signTransaction({
    type: 'eip1559',
    chainId: CHAIN.id,
    nonce: latest.nonce,
    gas: approved.gasLimit,
    maxFeePerGas: approved.maxFeePerGas,
    maxPriorityFeePerGas: approved.maxPriorityFeePerGas,
    ...(asset.kind === 'native'
      ? { to: approved.to, value: approved.amount }
      : {
          to: asset.address,
          value: 0n,
          data: encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [approved.to, approved.amount] }),
        }),
  })
  const hash = keccak256(raw)

  try {
    const reported = await deps.submit(raw)
    return reported.toLowerCase() === hash
      ? { status: 'Pending', hash }
      : { status: 'Unknown', hash, reason: 'hashMismatch' }
  } catch {
    return { status: 'Unknown', hash, reason: 'submitError' }
  }
}
