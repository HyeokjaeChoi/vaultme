// Figma: Icon / Asset / ETH 137:402, Icon / Asset / USDC 137:429 (original artwork, CC0-1.0; no authenticity claim)
import { SvgXml } from 'react-native-svg'
import { ethSvg, usdcSvg } from './artwork'

const ART = { ETH: ethSvg, USDC: usdcSvg } as const
export type AssetSymbol = keyof typeof ART

/** Asset or network artwork at an exact token size (icon.asset.size 32, icon.network.size 16). */
export function AssetIcon({ symbol, size }: { symbol: AssetSymbol; size: number }) {
  return <SvgXml xml={ART[symbol]} width={size} height={size} accessible={false} importantForAccessibility="no-hide-descendants" />
}
