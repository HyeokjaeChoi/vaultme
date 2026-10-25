// Figma: Web/Table head 759:258 + Web/Table row 759:269 (768 / 1280), Activity row 36:48 with B/Date header 403:165 (375)
import type { WebLocale, WebMessages } from '@vaultme/i18n/web'
import type { HistoryItem } from '@vaultme/history'
import { Link } from 'react-router'
import { clock, dayHeader, relativeTime, signed } from '../lib/history'
import { txPath } from '../lib/locale'
import { AssetIcon } from './AssetIcon'
import { RowBadge } from './RowBadge'

type Props = { items: HistoryItem[]; now: number; t: WebMessages; locale: WebLocale; address: string | null }

/** A row opens the transaction page (#197). The viewer's address goes in the router state (memory, not the URL), for the page's back link. */
const txLink = (i: HistoryItem, locale: WebLocale, address: string | null) => ({
  to: { pathname: txPath(locale), hash: `#${i.hash}` },
  state: { from: address },
})

// First 6 and last 4 characters, as mobile shortAddress. A contract creation has no counterparty.
const short = (a: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—')
const failed = (i: HistoryItem) => i.status === 'failed'
const assetKey = (i: HistoryItem) => (i.asset === 'USDC' ? 'USDC' : 'ETH')

/** 768 px and wider: one real table. Columns as Figma (status 140, direction 80, counterparty rest, amount 140, time 88). */
export function HistoryTable({ items, now, t, locale, address }: Props) {
  const th = 'text-product-b-caption text-text-tertiary px-1-5 py-2 font-normal'
  return (
    <table className="tablet:table hidden w-full table-fixed border-collapse">
      <caption className="sr-only">{t.history.title}</caption>
      <colgroup>
        <col className="w-col-status" />
        <col className="w-col-direction" />
        <col />
        <col className="w-col-amount" />
        <col className="w-col-time" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col" className={`${th} pl-row-b-padding-x text-left`}>
            {t.history.columns.status}
          </th>
          <th scope="col" className={`${th} text-left`}>
            {t.history.columns.direction}
          </th>
          <th scope="col" className={`${th} text-left`}>
            {t.history.columns.counterparty}
          </th>
          <th scope="col" className={`${th} text-right`}>
            {t.history.columns.amount}
          </th>
          <th scope="col" className={`${th} pr-row-b-padding-x text-right`}>
            {t.history.columns.time}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((i) => (
          <tr key={i.id} className="h-row-b-height relative">
            <td className="pl-row-b-padding-x px-1-5">
              {/* The link covers the whole row (::after). Its name starts with the visible status and adds what the other cells say. */}
              <Link
                {...txLink(i, locale, address)}
                aria-label={`${failed(i) ? t.history.status.failed : t.history.status.confirmed} · ${i.kind === 'send' ? t.history.direction.send : t.history.direction.receive} ${failed(i) ? `${i.amount} ${i.asset}` : signed(i)}`}
                className="min-h-touch-min flex items-center gap-2 after:absolute after:inset-0"
              >
                <RowBadge kind={failed(i) ? 'failed' : 'confirmed'} />
                <span className="text-product-b-label text-text-primary">
                  {failed(i) ? t.history.status.failed : t.history.status.confirmed}
                </span>
              </Link>
            </td>
            <td className="text-product-b-label text-text-primary px-1-5">
              {i.kind === 'send' ? t.history.direction.send : t.history.direction.receive}
            </td>
            <td className="px-1-5">
              <code
                className="text-address-m text-text-secondary whitespace-nowrap"
                translate="no"
                title={i.counterparty}
              >
                {short(i.counterparty)}
              </code>
            </td>
            <td
              className={`text-product-b-row-title px-1-5 text-right break-all ${failed(i) ? 'text-text-tertiary' : 'text-text-primary'}`}
            >
              {/* A failed transaction moved no value: no sign, as the cards and the mobile row. */}
              {failed(i) ? `${i.amount} ${i.asset}` : signed(i)}
            </td>
            <td className="text-product-b-body-small text-text-tertiary pr-row-b-padding-x px-1-5 text-right">
              <time dateTime={new Date(i.at).toISOString()}>{relativeTime(i.at, now, locale)}</time>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Below 768 px: Activity rows under date headers. */
export function HistoryCards({ items, now, t, locale, address }: Props) {
  const days: { key: string; at: number; rows: HistoryItem[] }[] = []
  for (const i of items) {
    const key = new Date(i.at).toDateString() // the day, not its label: the same date of two years is two groups
    const last = days[days.length - 1]
    if (last?.key === key) last.rows.push(i)
    else days.push({ key, at: i.at, rows: [i] })
  }
  return (
    <div className="tablet:hidden">
      {days.map((d) => (
        <section key={d.key}>
          <h3 className="text-product-b-label text-text-tertiary px-row-b-padding-x pt-6 pb-2">
            {dayHeader(d.at, locale, now)}
          </h3>
          <ul>
            {d.rows.map((i) => {
              const title = failed(i)
                ? i.kind === 'send'
                  ? t.history.cardTitle.sendFailed
                  : t.history.cardTitle.receiveFailed
                : i.kind === 'send'
                  ? t.history.cardTitle.send
                  : t.history.cardTitle.receive
              return (
                <li key={i.id}>
                  <Link
                    {...txLink(i, locale, address)}
                    className="min-h-row-b-height px-row-b-padding-x flex items-center gap-3 py-2"
                  >
                    <div className="relative shrink-0">
                      <AssetIcon asset={assetKey(i)} large />
                      <span className="absolute -right-0-5 -bottom-0-5">
                        <RowBadge kind={failed(i) ? 'failed' : i.kind === 'send' ? 'sent' : 'received'} />
                      </span>
                    </div>
                    <div className="flex min-w-px flex-1 flex-col">
                      <p className="text-product-b-row-title text-text-primary">{title}</p>
                      <p className="text-product-b-caption text-text-tertiary">
                        <time dateTime={new Date(i.at).toISOString()}>
                          {i.asset === 'USDC' ? t.viewer.usdc : t.viewer.eth} · {clock(i.at, locale)}
                        </time>
                      </p>
                    </div>
                    <p
                      className={`text-product-b-headline max-w-1/2 text-right break-all ${failed(i) ? 'text-text-tertiary' : 'text-text-primary'}`}
                    >
                      {failed(i) ? `${i.amount} ${i.asset}` : signed(i)}
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
