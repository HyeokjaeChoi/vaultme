// Figma: Tx detail · internal transfers (Web page, section 768:4422, #238): capped many 833:968 (375) / 833:1297 (768) / 833:1623 (1280), list 804:35707 (375) / 804:36265 (768) / 804:36827 (1280),
// loading 804:36075 / 804:36635 / 804:37197, error 804:36169 / 804:36730 / 804:37292; rows are Activity row 36:48, header B/Section header
import { capInternal, type InternalTransfer } from '@vaultme/api-client'
import type { WebTxMessages } from '@vaultme/i18n/web-tx'
import { fromUnits, toChecksumAddress } from '@vaultme/wallet-core'
import type { Internal } from '../api'
import { AssetIcon } from './AssetIcon'
import { Button } from './Button'
import { ButtonLink } from './ButtonLink'
import { Notice } from './Notice'
import { RowBadge } from './RowBadge'
import { TxIcon } from './TxIcon'

// First 6 and last 4 characters, as the history rows. A contract creation has no recipient.
const full = (a: string | null) => (a ? toChecksumAddress(a.toLowerCase()) : '—')
const short = (a: string | null) => {
  const c = full(a)
  return a ? `${c.slice(0, 6)}…${c.slice(-4)}` : c
}

type Props = { internal: Internal; retry: () => void; t: WebTxMessages; moreHref: string }

const bar = 'bg-skeleton-bg rounded-skeleton-radius'

function Row({ i, t }: { i: InternalTransfer; t: WebTxMessages }) {
  return (
    <li className="gap-layout-row-gap flex min-h-16 items-center">
      <div className="relative shrink-0">
        <AssetIcon asset="ETH" large />
        {!i.ok && (
          <span className="absolute -right-0-5 -bottom-0-5">
            <RowBadge kind="failed" />
          </span>
        )}
      </div>
      <div className="flex min-w-px flex-1 flex-col">
        <p className="text-product-b-row-title text-text-primary">{i.ok ? t.internal.row : t.internal.rowFailed}</p>
        <p
          className="text-product-b-caption text-text-tertiary"
          translate="no"
          title={`${full(i.from)} → ${full(i.to)}`}
        >
          {short(i.from)} → {short(i.to)}
        </p>
      </div>
      {/* A failed call moved nothing: the amount it named is grey, as in the history rows. */}
      <p
        className={`text-product-b-headline max-w-1/2 text-right break-all ${i.ok ? 'text-text-primary' : 'text-text-tertiary'}`}
      >
        {fromUnits(i.value, 'ETH')} ETH
      </p>
    </li>
  )
}

/**
 * The first `INTERNAL_CAP` internal ETH transfers of the transaction (ADR-0015, `CONTEXT.md` "내부 이동"), below the detail rows, then one
 * link row to Etherscan for the rest (#255). Hidden when there are
 * none (Etherscan can lag a fresh block). A failed read affects only this section: a notice and a retry button.
 */
export function InternalTransfers({ internal, retry, t, moreHref }: Props) {
  if (internal.status === 'ok' && internal.items.length === 0) return null
  const { shown, more } = capInternal(internal.status === 'ok' ? internal.items : [])
  return (
    <section aria-labelledby="internal-title" className="gap-layout-field-gap flex flex-col">
      <h2 id="internal-title" className="text-product-b-title2 text-text-primary pt-4 pb-2">
        {t.internal.title}
      </h2>
      {internal.status === 'loading' && (
        <>
          <div aria-hidden="true" className="gap-layout-field-gap flex flex-col">
            {[0, 1, 2].map((n) => (
              <div key={n} className="tx-row-address tablet:flex-row tablet:gap-6 flex flex-col gap-2 py-3">
                <div className={`${bar} skeleton-line skeleton-label shrink-0`} />
                <div className={`${bar} skeleton-line tablet:flex-1`} />
              </div>
            ))}
          </div>
          <p role="status" className="sr-only">
            {t.internal.loading}
          </p>
        </>
      )}
      {internal.status === 'failed' && (
        <>
          <Notice tone="danger" tier="banner" role="alert">
            {t.internal.failed}
          </Notice>
          <div className="flex">
            {/* The button leaves with the error: `Detail` moves the focus to the page section once the answer is there. */}
            <Button variant="secondaryMd" onClick={retry}>
              {t.internal.retry}
            </Button>
          </div>
        </>
      )}
      {internal.status === 'ok' && (
        <>
          {/* "The ETH moved here" is true only if one of them went through. */}
          {internal.items.some((i) => i.ok) && (
            <p className="text-product-b-body-small text-text-tertiary">{t.internal.note}</p>
          )}
          <ul className="flex flex-col">
            {shown.map((i, n) => (
              <Row key={n} i={i} t={t} />
            ))}
          </ul>
          {more > 0 && (
            <div className="flex">
              <ButtonLink
                variant="secondary"
                href={moreHref}
                target="_blank"
                rel="noopener noreferrer"
                className="tablet:w-fit w-full"
              >
                <TxIcon name="external" className="size-badge" />
                {t.internal.more.replace('{n}', String(more))}
              </ButtonLink>
            </div>
          )}
        </>
      )}
    </section>
  )
}
