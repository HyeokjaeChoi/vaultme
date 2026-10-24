import { parseEther, type Address } from 'viem'

// Constants are never fetched from a server (ADR-0005).
export const CHAIN = { id: 11155111, name: 'Sepolia' } as const

export const ASSETS = {
  // `display` is presentation only (formatAmount): fraction digits shown. It never changes what is stored, parsed or sent.
  ETH: { kind: 'native', decimals: 18, display: { minFraction: 0, maxFraction: 6 } },
  // Circle docs + on-chain decimals()=6, symbol()=USDC (checked 2026-10-12)
  USDC: {
    kind: 'erc20',
    decimals: 6,
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    display: { minFraction: 0, maxFraction: 2 },
  },
} as const

export type AssetId = keyof typeof ASSETS

export const DERIVATION_PATH = "m/44'/60'/0'/0/0"

// Testnet-only absolute fee cap (ARCHITECTURE.md#invariants).
export const ABS_MAX_FEE_WEI = parseEther('0.005')

export const BURN_ADDRESSES = [
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dEaD',
] as const satisfies readonly Address[]
