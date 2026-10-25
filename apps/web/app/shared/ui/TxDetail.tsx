// Figma: Tx detail columns (Web page, section 768:4422: 768:4443 at 375, 768:4617 at 768, 768:4764 at 1280) and the loading frames (768:33109 ..)
import type { TxDetail as Tx } from '@vaultme/api-client'
import type { WebLocale } from '@vaultme/i18n/web'
import type { WebTxMessages } from '@vaultme/i18n/web-tx'
import { fromUnits, toChecksumAddress } from '@vaultme/wallet-core'
import { etherscanTx, utcTime } from '../lib/tx'
import { relativeTime } from '../lib/history'
import { ButtonLink } from './ButtonLink'
import { DefinitionRow } from './DefinitionRow'
import { TxIcon } from './TxIcon'
import { StatusBadge } from './StatusBadge'

// The node answers in lower case; the viewer and the app show EIP-55.
const eip55 = (a: string) => toChecksumAddress(a.toLowerCase())

type Props = { tx: Tx; now: number; t: WebTxMessages; locale: WebLocale }

/** Status and amount, the six rows in the S41 order (from, to, time, fee, block, hash) and the Etherscan link. */
export function TxDetail({ tx, now, t, locale }: Props) {
  const copy = (text: string, label: string) => ({ text, label, copied: t.copied })
  const from = eip55(tx.from)
  const to = tx.to ? eip55(tx.to) : null
  return (
    <>
      <div className="flex flex-col items-start gap-3">
        <StatusBadge kind={tx.ok ? 'confirmed' : 'failed'} label={tx.ok ? t.status.confirmed : t.status.failed} />
        <p className="flex items-end gap-2 break-all">
          {/* A reverted call moved nothing: the amount it asked for is grey, as in the history rows. */}
          <span className={`text-product-b-figure ${tx.ok ? 'text-text-primary' : 'text-text-tertiary'}`}>
            {fromUnits(tx.amount, tx.asset)}
          </span>
          <span className="text-product-b-figure-unit text-text-secondary">{tx.asset}</span>
        </p>
      </div>
      <dl className="flex flex-col">
        <DefinitionRow label={t.from} mono copy={copy(from, t.copyFrom)}>
          {from}
        </DefinitionRow>
        {to ? (
          <DefinitionRow label={t.to} mono copy={copy(to, t.copyTo)}>
            {to}
          </DefinitionRow>
        ) : (
          <DefinitionRow label={t.to}>—</DefinitionRow>
        )}
        <DefinitionRow label={t.time}>
          {relativeTime(tx.at, now, locale)} · {utcTime(tx.at)}
        </DefinitionRow>
        <DefinitionRow label={t.fee}>{fromUnits(tx.fee, 'ETH')} ETH</DefinitionRow>
        <DefinitionRow label={t.block}>#{tx.block.toLocaleString(locale)}</DefinitionRow>
        <DefinitionRow label={t.hash} mono copy={copy(tx.hash, t.copyHash)}>
          {tx.hash}
        </DefinitionRow>
      </dl>
      <div className="pt-2">
        <ButtonLink
          variant="secondary"
          href={etherscanTx(tx.hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="tablet:w-fit w-full"
        >
          <TxIcon name="external" className="size-badge" />
          {t.etherscan}
        </ButtonLink>
      </div>
    </>
  )
}

const bar = 'bg-skeleton-bg rounded-skeleton-radius'
// Row heights of the loaded rows (app.css): the two address rows, the three one-line rows and the hash row.
const rows = ['tx-row-address', 'tx-row-address', 'tx-row-line', 'tx-row-line', 'tx-row-line', 'tx-row-hash']

/** The same boxes as the detail (status badge, figure, six rows, button), so the answer moves nothing (CLS 0). */
export function TxSkeleton({ t }: { t: WebTxMessages }) {
  return (
    <>
      <div aria-hidden="true" className="flex flex-col items-start gap-3">
        <div className={`${bar} skeleton-badge`} />
        <div className={`${bar} skeleton-figure`} />
      </div>
      <div aria-hidden="true" className="flex flex-col">
        {rows.map((height, i) => (
          <div key={i} className={`${height} tablet:flex-row tablet:gap-6 flex flex-col gap-2 py-3`}>
            <div className={`${bar} skeleton-line skeleton-label shrink-0`} />
            <div className={`${bar} skeleton-line tablet:flex-1`} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="pt-2">
        <div className={`${bar} h-button-b-height-lg tablet:skeleton-button w-full`} />
      </div>
      <p role="status" className="sr-only">
        {t.loading}
      </p>
    </>
  )
}
