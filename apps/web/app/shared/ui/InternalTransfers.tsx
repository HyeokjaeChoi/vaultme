// Figma: Tx detail · internal transfers (Web page, section 768:4422, #238): list 804:35707 (375) / 804:36265 (768) / 804:36827 (1280),
// loading 804:36075 / 804:36635 / 804:37197, error 804:36169 / 804:36730 / 804:37292; rows are Activity row 36:48, header B/Section header
import { useRef } from 'react'
import type { InternalTransfer } from '@vaultme/api-client'
import type { WebTxMessages } from '@vaultme/i18n/web-tx'
import { fromUnits, toChecksumAddress } from '@vaultme/wallet-core'
import type { Internal } from '../api'
import { AssetIcon } from './AssetIcon'
import { Button } from './Button'
import { Notice } from './Notice'
import { RowBadge } from './RowBadge'

// First 6 and last 4 characters, as the history rows. A contract creation has no recipient.
const short = (a: string | null) => {
  if (!a) return '—'
  const c = toChecksumAddress(a.toLowerCase())
  return `${c.slice(0, 6)}…${c.slice(-4)}`
}

type Props = { internal: Internal; retry: () => void; t: WebTxMessages }

const bar = 'bg-skeleton-bg rounded-skeleton-radius'

function Row({ i, t }: { i: InternalTransfer; t: WebTxMessages }) {
  return (
    <li className="gap-layout-row-gap flex h-16 items-center">
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
        <p className="text-product-b-caption text-text-tertiary" translate="no">
          {short(i.from)} → {short(i.to)}
        </p>
      </div>
      {/* A failed call moved nothing: the amount it named is grey, as in the history rows. */}
      <p className={`text-product-b-headline shrink-0 text-right ${i.ok ? 'text-text-primary' : 'text-text-tertiary'}`}>
        {fromUnits(i.value, 'ETH')} ETH
      </p>
    </li>
  )
}

/**
 * Every internal ETH transfer of the transaction (ADR-0015, `CONTEXT.md` "내부 이동"), below the detail rows. Hidden when there are
 * none (Etherscan can lag a fresh block). A failed read affects only this section: a notice and a retry button.
 */
export function InternalTransfers({ internal, retry, t }: Props) {
  const section = useRef<HTMLElement>(null)
  if (internal.status === 'ok' && internal.items.length === 0) return null
  return (
    <section
      ref={section}
      tabIndex={-1}
      aria-labelledby="internal-title"
      className="gap-layout-field-gap flex flex-col"
    >
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
            {/* The button leaves with the error: the focus moves to the section, not to <body>. */}
            <Button
              variant="secondaryMd"
              onClick={() => {
                retry()
                section.current?.focus()
              }}
            >
              {t.internal.retry}
            </Button>
          </div>
        </>
      )}
      {internal.status === 'ok' && (
        <>
          <p className="text-product-b-body-small text-text-tertiary">{t.internal.note}</p>
          <ul className="flex flex-col">
            {internal.items.map((i, n) => (
              <Row key={n} i={i} t={t} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
