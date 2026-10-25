// Figma: History frames of the Viewer section 765:2183 (list 765:2275 / 765:2877, loading 767:3091 / 767:3383, empty 767:3634,
// error 767:4123), B/Section header 399:95, Load more 765:2966
import type { WebLocale, WebMessages } from '@vaultme/i18n/web'
import { useEffect, useRef, useState } from 'react'
import type { History } from '../api/useHistory'
import { etherscanAddress, FAUCET_URL } from '../lib/history'
import { Button } from './Button'
import { ButtonLink } from './ButtonLink'
import { EmptyState } from './EmptyState'
import { HistoryCards, HistoryTable } from './HistoryRows'
import { HistorySkeleton } from './HistorySkeleton'
import { Notice } from './Notice'

// The 768+ skeleton has 5 rows: the first reveal is 5 too, so the list and its skeleton are the same height (at 375 the cards
// depend on the number of days and the footer is below the fold). 더 보기 reveals
// more (and asks the API for the next page when the loaded rows run out); that growth follows a click, not a load.
const FIRST = 5
const STEP = 10

type Props = {
  t: WebMessages
  locale: WebLocale
  address: string | null
  history: History
  actions: { retry: () => void; more: () => void }
}

export function HistorySection({ t, locale, address, history, actions }: Props) {
  const [limit, setLimit] = useState(FIRST)
  // Another address starts again from the first rows.
  const shownFor = useRef(address)
  useEffect(() => {
    if (shownFor.current !== address) {
      shownFor.current = address
      setLimit(FIRST)
    }
  }, [address])

  // A button that removes itself (Try again, the last 더 보기) must not drop the focus to <body>: it moves to the section.
  const section = useRef<HTMLElement>(null)
  const moveFocus = useRef(false)
  const loadingMore = history.status === 'ok' && history.more === 'loading'
  useEffect(() => {
    if (!moveFocus.current || loadingMore) return // a request is open: the answer decides whether the button stays
    moveFocus.current = false
    const active = document.activeElement
    if (!active || active === document.body || !section.current?.contains(active)) section.current?.focus()
  })

  const ok = history.status === 'ok' ? history : null
  // "3분 전" stays true while the tab is open: `now` is renewed each minute and when rows are revealed.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!ok) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [ok?.items, limit])
  const rows = ok?.items.slice(0, limit) ?? []
  const hasMore = ok !== null && (limit < ok.items.length || ok.nextCursor !== null)

  function showMore() {
    if (!ok || ok.more === 'loading') return
    moveFocus.current = true // the button may go with the last rows: the effect above moves the focus if it is lost
    // Not past the rows that exist plus one step, so failed tries do not pile up a big jump for the one that works.
    setLimit(Math.min(limit, ok.items.length) + STEP)
    if (ok.nextCursor !== null && limit + STEP > ok.items.length) actions.more()
  }

  const showEmpty = ok !== null && ok.items.length === 0 && ok.nextCursor === null
  return (
    <section
      ref={section}
      tabIndex={-1}
      aria-labelledby="history-title"
      aria-busy={history.status === 'loading'}
      className="web-desktop:col-span-2 flex flex-col"
    >
      <div className="px-row-b-padding-x flex items-center gap-2 pt-4 pb-2">
        <h2 id="history-title" className="text-product-b-title2 text-text-primary min-w-px flex-1">
          {t.history.title}
        </h2>
        {ok && !showEmpty && address && (
          <a
            href={etherscanAddress(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-product-b-link text-text-link -m-3 shrink-0 p-3 underline"
          >
            {t.history.etherscan}
          </a>
        )}
      </div>
      <div className="min-h-history-body">
        {history.status === 'loading' && (
          <>
            <HistorySkeleton t={t} />
            <p role="status" className="sr-only">
              {t.history.loading}
            </p>
          </>
        )}
        {history.status === 'failed' && (
          <div role="alert">
            <EmptyState
              icon="cloudCross"
              title={t.history.failed.title}
              body={t.history.failed.body}
              action={
                <Button
                  variant="secondaryMd"
                  onClick={() => {
                    moveFocus.current = true
                    actions.retry()
                  }}
                >
                  {t.history.failed.retry}
                </Button>
              }
            />
          </div>
        )}
        {showEmpty && (
          <EmptyState
            icon="inbox"
            title={t.history.empty.title}
            body={t.history.empty.body}
            action={
              <ButtonLink variant="secondaryMd" href={FAUCET_URL} target="_blank" rel="noopener noreferrer">
                {t.history.empty.faucet}
              </ButtonLink>
            }
          />
        )}
        {ok && !showEmpty && (
          <>
            <HistoryCards items={rows} now={now} t={t} locale={locale} />
            <HistoryTable items={rows} now={now} t={t} locale={locale} />
            {ok.more === 'failed' && (
              <div className="pt-6" role="alert">
                <Notice tone="danger" tier="banner">
                  {t.history.moreFailed}
                </Notice>
              </div>
            )}
            {hasMore && (
              <div className="flex flex-col items-center pt-6">
                <Button
                  variant="secondary"
                  aria-disabled={ok.more === 'loading'}
                  aria-busy={ok.more === 'loading'}
                  className="tablet:w-auto aria-disabled:text-text-disabled w-full"
                  onClick={showMore}
                >
                  {t.history.more}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
