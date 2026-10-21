// PUBLIC TEST VECTORS ONLY. Never use these phrases for real funds (docs/agents/foundation.md rule 4).
import type { Address } from 'viem'

/** viem test suite + Hardhat/Anvil default account 0:
 *  https://github.com/wevm/viem/blob/main/src/accounts/mnemonicToAccount.test.ts */
export const PUBLIC_JUNK_PHRASE = 'test test test test test test test test test test test junk'
export const PUBLIC_JUNK_ADDRESS: Address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

/** BIP39 official vectors (entropy all-zero, 128 and 256 bit):
 *  https://github.com/trezor/python-mnemonic/blob/master/vectors.json */
export const BIP39_12 = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
export const BIP39_24 = `${'abandon '.repeat(23)}art`

export const RECIPIENT: Address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' // Anvil account 1 (public)
export const OTHER: Address = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' // Anvil account 2 (public)

/** BIP39 official vector, passphrase "TREZOR" (same 12 words). Seed from trezor/python-mnemonic vectors.json:
 *  https://github.com/trezor/python-mnemonic/blob/master/vectors.json */
export const TREZOR_PASSPHRASE = 'TREZOR'
export const BIP39_12_TREZOR_SEED =
  'c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04'
/** ETH address at m/44'/60'/0'/0/0 for BIP39_12 + "TREZOR". Computed with viem, cross-checked with an independent
 *  @scure/bip32 + @noble/curves + @noble/hashes keccak derivation (scratch script, 2026-10-17). Not from a published list. */
export const BIP39_12_ADDRESS: Address = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
export const BIP39_12_TREZOR_ADDRESS: Address = '0x9c32f71d4db8fb9e1a58b0a80df79935e7256fa6'
