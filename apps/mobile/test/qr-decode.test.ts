import jsQR from 'jsqr'
import QRCode from 'qrcode'
import { describe, expect, it } from 'vitest'

// Public BIP39 test vector address (scripts/check-repo-rules.sh R10). Same encoder and error correction as the S30 screen (react-native-qrcode-svg uses `qrcode`, level M).
const ADDRESS = '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
const SCALE = 8
const QUIET = 4

/** Rasterize the module matrix to RGBA (dark modules on a white field with a quiet zone) without any native view. */
function raster(value: string) {
  const { size, data } = QRCode.create(value, { errorCorrectionLevel: 'M' }).modules
  const px = (size + QUIET * 2) * SCALE
  const rgba = new Uint8ClampedArray(px * px * 4).fill(255)
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const mx = Math.floor(x / SCALE) - QUIET
      const my = Math.floor(y / SCALE) - QUIET
      if (mx >= 0 && my >= 0 && mx < size && my < size && data[my * size + mx]) {
        const i = (y * px + x) * 4
        rgba[i] = rgba[i + 1] = rgba[i + 2] = 0
      }
    }
  }
  return { rgba, px }
}

describe('receive QR', () => {
  it('decodes to the address', () => {
    const { rgba, px } = raster(ADDRESS)
    expect(jsQR(rgba, px, px)?.data).toBe(ADDRESS)
  })
  it('has a 29-module symbol for a 42-character address', () => {
    expect(QRCode.create(ADDRESS, { errorCorrectionLevel: 'M' }).modules.size).toBe(29)
  })
})
