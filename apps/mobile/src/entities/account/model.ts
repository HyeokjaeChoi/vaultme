import { DERIVATION_PATH } from '@vaultme/wallet-core'

/** Index of the account the wallet signs with: the last segment of its one derivation path (ADR-0002). "계정 1" = index 0. */
export const ACCOUNT_INDEX = Number(DERIVATION_PATH.split('/').at(-1))
