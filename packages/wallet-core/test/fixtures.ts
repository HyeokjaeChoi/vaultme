// PUBLIC TEST VECTORS ONLY. Never use these phrases for real funds (AGENTS.md rule 4).
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
