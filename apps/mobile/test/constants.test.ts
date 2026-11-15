import { USDC_SEPOLIA } from '@vaultme/contracts'
import { ASSETS, CHAIN } from '@vaultme/wallet-core'
import { describe, expect, it } from 'vitest'

// CHAIN-7: the chain constants of the app and of the API contract agree. No network; the on-chain check
// (`decimals()`, `symbol()`, `eth_chainId`) runs in scripts/release-balance.mts at a release.
describe('chain constants', () => {
  it('the two USDC address literals are equal', () => {
    expect(ASSETS.USDC.address).toBe(USDC_SEPOLIA)
  })
  it('the chain is Sepolia (11155111)', () => {
    expect(CHAIN.id).toBe(11155111)
  })
})
