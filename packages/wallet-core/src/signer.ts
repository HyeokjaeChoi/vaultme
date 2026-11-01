// Signing and key code (Q59, #312). The `@vaultme/wallet-core/signer` subpath: apps/mobile lint allows it only in the send,
// backup and restore slices and shared/storage/keychain.ts, and apps/web never imports it. Address checks and formatting stay in `.`.
import { encodeFunctionData, erc20Abi, keccak256 } from 'viem'
import { ABS_MAX_FEE_WEI, ASSETS, CHAIN } from './constants'
import type { Mnemonic } from './mnemonic'
import { feeCapOf, type ApprovedSend, type ChainSnapshot, type SubmitFn, type SubmitResult } from './send'

export { Mnemonic, deriveAddress, generateMnemonic, toMnemonic } from './mnemonic'

export async function signAndSubmit(
  approved: ApprovedSend,
  latest: ChainSnapshot,
  deps: { mnemonic: Mnemonic; submit: SubmitFn },
): Promise<SubmitResult> {
  const latestCap = feeCapOf(latest)
  if (approved.feeCap > ABS_MAX_FEE_WEI || latestCap > ABS_MAX_FEE_WEI) return { status: 'Blocked' }
  if (latestCap > approved.feeCap) return { status: 'NeedsReview' }
  // The signed tx must match the reviewed model. A new nonce means a new review.
  if (latest.nonce !== approved.nonce) return { status: 'NeedsReview' }

  const asset = ASSETS[approved.asset]
  const account = deps.mnemonic.account()
  const raw = await account.signTransaction({
    type: 'eip1559',
    chainId: CHAIN.id,
    nonce: approved.nonce,
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
