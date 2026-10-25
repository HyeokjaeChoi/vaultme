// Figma: Icon / Asset / ETH 137:402, Icon / Asset / USDC 137:429 (32px; 40px in an Activity row)
// Artwork: spothq/cryptocurrency-icons (CC0-1.0), the same files as apps/mobile/assets/artwork. Brand colors stay as drawn.
import eth from '../../assets/eth.svg'
import usdc from '../../assets/usdc.svg'

const src = { ETH: eth, USDC: usdc }

/** `large`: the 40 px logo of an Activity row (Figma 495:413); the default is the 32 px one. */
export function AssetIcon({ asset, large = false }: { asset: 'ETH' | 'USDC'; large?: boolean }) {
  const size = large ? 40 : 32
  return (
    <img
      src={src[asset]}
      alt=""
      width={size}
      height={size}
      className={`${large ? 'size-avatar-md' : 'size-icon-size-asset'} shrink-0`}
    />
  )
}
