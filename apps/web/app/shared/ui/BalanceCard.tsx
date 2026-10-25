import { AssetIcon } from './AssetIcon'

// Figma: Web/Balance card 759:241 (asset icon, symbol, name, amount; no fiat). Loading: "Skeleton balance" (767:3089),
// the same box in skeleton/bg: the content keeps its place but is hidden, so the size is the final one (CLS 0).
type Props = { asset: 'ETH' | 'USDC'; name: string; amount: string | null }

export function BalanceCard({ asset, name, amount }: Props) {
  const loading = amount === null
  return (
    <div
      aria-hidden={loading || undefined}
      className={`p-card-padding-mobile flex flex-col gap-3 ${loading ? 'bg-skeleton-bg rounded-skeleton-radius' : 'bg-surface-subtle rounded-card-radius'}`}
    >
      <div className={`flex items-center gap-3 ${loading ? 'invisible' : ''}`}>
        <AssetIcon asset={asset} />
        <div className="flex min-w-px flex-1 flex-col">
          <p className="text-product-b-headline text-text-primary">{asset}</p>
          <p className="text-product-b-body-small text-text-tertiary">{name}</p>
        </div>
      </div>
      <p className={`text-product-b-title1 text-text-primary break-all ${loading ? 'invisible' : ''}`}>
        {loading ? '0' : `${amount} ${asset}`}
      </p>
    </div>
  )
}
