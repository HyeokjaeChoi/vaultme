import { describe, expect, it } from 'vitest'
import { setScanResult, takeScanResult } from '../src/features/send/model/scanResult'

describe('scan result hand-off', () => {
  it('is handed over once, then empty', () => {
    expect(takeScanResult()).toBeNull()
    setScanResult({ to: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94', fromQr: true, hadAmount: true })
    expect(takeScanResult()).toEqual({
      to: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
      fromQr: true,
      hadAmount: true,
    })
    expect(takeScanResult()).toBeNull()
  })
})
