// Figma: Icon / Asset / ETH 137:402, Icon / Asset / USDC 137:429 (32px)
// Artwork: spothq/cryptocurrency-icons (CC0-1.0), the same files as apps/mobile/assets/artwork. Brand colors stay as drawn.
import eth from '../../assets/eth.svg'
import usdc from '../../assets/usdc.svg'

const src = { ETH: eth, USDC: usdc }

export function AssetIcon({ asset }: { asset: 'ETH' | 'USDC' }) {
  return <img src={src[asset]} alt="" width="32" height="32" className="size-icon-size-asset shrink-0" />
}
