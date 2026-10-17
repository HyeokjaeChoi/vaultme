import { txHash } from '@vaultme/wallet-core'
import { describe, expect, it } from 'vitest'
import { explorerUrl } from '../src/shared/chain/port'
import { createFakeChain } from '../src/shared/chain/fake'

const TO = '0x9F3C7A210Bd4E6c855A13F90C2E78D16AB0441Ab'
const mem = () => {
  let n = 0
  return { get: () => n, set: (v: number) => void (n = v) }
}

describe('fake chain', () => {
  it('does not broadcast and hides the explorer link', () => {
    const c = createFakeChain(mem())
    expect(c.broadcasts).toBe(false)
    expect(explorerUrl(c, '0xabc')).toBeNull()
    expect(explorerUrl({ broadcasts: true }, '0xabc')).toBe('https://sepolia.etherscan.io/tx/0xabc')
  })
  it('snapshot: fixture balances and the Review fixture fee numbers', async () => {
    const s = await createFakeChain(mem()).getSnapshot(TO, 'ETH', TO, '0.05')
    expect(s.nativeBalance).toBe(1_284_732_000_000_000_000n)
    expect(s.tokenBalance).toBe(12_500_000n)
    expect(s.gasLimit * (s.baseFeePerGas + s.maxPriorityFeePerGas)).toBe(42_000_000_000_000n) // 0.000042 ETH
    expect(s.gasLimit * (2n * s.baseFeePerGas + s.maxPriorityFeePerGas)).toBe(73_500_000_000_000n) // 0.0000735 ETH
  })
  it('submit returns keccak256(raw) and bumps the nonce', async () => {
    const store = mem()
    const c = createFakeChain(store)
    expect((await c.getSnapshot(TO, 'ETH', TO, '1')).nonce).toBe(0)
    expect(await c.submit('0x02f8')).toBe(txHash('0x02f8'))
    expect((await c.getSnapshot(TO, 'ETH', TO, '1')).nonce).toBe(1)
  })
})
