// Fixture data: the public test vector (abandon ... about, first account). Not a real wallet.
import { CHAIN } from '@vaultme/wallet-core'

export const account = {
  name: '계정 1',
  network: 'Sepolia',
  chainId: CHAIN.id,
  address: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
} as const

/** Mono Fact line of the network (Product B/Fact): "Sepolia · 11155111". */
export const networkFact = `${account.network} · ${String(account.chainId)}`
