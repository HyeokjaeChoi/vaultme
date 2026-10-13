import { parseEther, type Address } from 'viem'

// Constants are never fetched from a server (LLD Q73).
export const CHAIN = { id: 11155111, name: 'Sepolia' } as const

export const ASSETS = {
  ETH: { kind: 'native', decimals: 18 },
  // Circle docs + on-chain decimals()=6, symbol()=USDC (checked 2026-10-12)
  USDC: { kind: 'erc20', decimals: 6, address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
} as const

export type AssetId = keyof typeof ASSETS

export const DERIVATION_PATH = "m/44'/60'/0'/0/0"

// Testnet-only absolute fee cap (LLD §14).
export const ABS_MAX_FEE_WEI = parseEther('0.005')

export const BURN_ADDRESSES = [
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dEaD',
] as const satisfies readonly Address[]
