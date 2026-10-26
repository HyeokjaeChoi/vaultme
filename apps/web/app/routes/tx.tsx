import { type WebLocale, webMessages } from '@vaultme/i18n/web'
import { type WebTxMessages, webTx } from '@vaultme/i18n/web-tx'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, NavigationType, useLocation, useNavigationType } from 'react-router'
import { useInternalTransfers, useTransaction } from '../shared/api'
import { parseAddress } from '../shared/lib/address'
import { localeOf, viewerPath } from '../shared/lib/locale'
import { parseTxHash } from '../shared/lib/tx'
import { Button } from '../shared/ui/Button'
import { ButtonLink, buttonClass } from '../shared/ui/ButtonLink'
import { EmptyState } from '../shared/ui/EmptyState'
import { TxIcon } from '../shared/ui/TxIcon'
import { TxDetail, TxSkeleton } from '../shared/ui/TxDetail'

// Figma: Tx detail · 375 / 768 / 1280 · Light + Dark (page "Web", section 768:4422; loading, load failed, not found, invalid hash)
// One prerendered page per locale (ADR-0012): the hash is in the URL fragment (/tx#0x...), so it never reaches the web host, its
// logs or analytics. The transaction comes from the API by hash alone (a shared link has no address).
export const handle = { hydrate: true }

// Runs while the page is parsed, before first paint: a link with a valid hash paints the skeleton, any other the invalid-hash
// state, so the first paint already has the final layout (CLS 0). Same attribute and CSS as /address (app.css).
// Decoded and trimmed as decodeFragment + parseTxHash do after hydration.
const BOOT_SCRIPT = `(function(){var h;try{h=decodeURIComponent(location.hash.slice(1)).trim()}catch(e){h=''}if(/^0x[0-9a-fA-F]{64}$/.test(h))document.documentElement.dataset.boot='viewer'})()`

/** The fragment as typed; one that is not valid percent-encoding stays as is (parseTxHash rejects it). */
function decodeFragment(f: string): string {
  try {
    return decodeURIComponent(f)
  } catch {
    return f
  }
}

const subscribeNothing = () => () => undefined
/** false while the prerendered HTML is hydrated (the server snapshot), true after. */
const useHydrated = () =>
  useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )

export default function TxPage() {
  const { pathname, hash, key, ...rest } = useLocation()
  const navigationType = useNavigationType()
  const state: unknown = rest.state
  const locale = localeOf(pathname)
  const t = webMessages[locale]
  const x = webTx[locale]
  const hydrated = useHydrated()
  const txHash = hydrated ? parseTxHash(decodeFragment(hash.slice(1))) : null
  // A row of the address viewer links here with its address in the router state (kept in memory by the router, never in the URL): the way back.
  const from = parseAddress((state as { from?: unknown } | null)?.from?.toString() ?? '')

  const asked = (state as { row?: unknown } | null)?.row
  const row = asked === 'ETH' || asked === 'USDC' ? asked : undefined

  // A client-side move to this page (from a history row) puts the focus on the heading, so a screen reader starts there.
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (navigationType === NavigationType.Push) heading.current?.focus()
  }, [key, navigationType])
  useLayoutEffect(() => {
    if (hydrated) document.documentElement.dataset.boot = txHash ? 'viewer' : 'form'
  }, [hydrated, txHash])

  return (
    <>
      <title>{`${x.pageTitle} · ${t.siteName}`}</title>
      <meta name="description" content={x.lead} />
      {!hydrated && <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />}
      <main
        id="main"
        className="px-layout-screen-padding tablet:px-8 tablet:py-16 web-desktop:py-20 flex justify-center py-10"
      >
        <div className="max-w-layout-web-reading-width flex w-full flex-col gap-6">
          <Link
            to={{ pathname: viewerPath(locale), hash: from ? `#${from}` : '' }}
            className={buttonClass('ghost', 'self-start')}
          >
            <TxIcon name="back" className="size-badge" />
            {x.back}
          </Link>
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-product-b-title2 tablet:text-product-b-title1 web-desktop:text-product-b-display-m text-text-primary"
          >
            {x.title}
          </h1>
          {/* Before hydration the boot script shows one of these two (app.css); after it only the one that applies is rendered. */}
          {(!hydrated || !txHash) && (
            <div data-boot-form>
              <EmptyState
                icon={<TxIcon name="warning" className="size-avatar-lg text-icon-tertiary" />}
                title={x.invalid.title}
                body={x.invalid.body}
                action={
                  <ButtonLink variant="secondaryMd" href={viewerPath(locale)}>
                    {x.invalid.viewer}
                  </ButtonLink>
                }
              />
            </div>
          )}
          {(!hydrated || txHash) && (
            <div data-boot-viewer className="flex flex-col gap-6">
              <Detail x={x} t={t} locale={locale} hash={txHash} row={row} />
            </div>
          )}
        </div>
      </main>
    </>
  )
}

/** `hash` null = before hydration: the skeleton. */
function Detail({
  x,
  t,
  locale,
  hash,
  row,
}: {
  x: WebTxMessages
  t: (typeof webMessages)[WebLocale]
  locale: WebLocale
  hash: string | null
  row?: 'ETH' | 'USDC' | undefined
}) {
  const [tx, retry] = useTransaction(hash, row)
  // Read beside the transaction, not after it: a failure is the section's own retry (the page stays).
  const [internal, retryInternal] = useInternalTransfers(hash)
  // The page appears when both reads have answered (a failed one counts), so a section that turns out empty moves nothing (CLS 0).
  // A retry of the section alone shows its own skeleton rows instead (Figma "internal loading").
  const waiting = tx.status === 'loading' || (tx.status === 'ok' && internal.status === 'loading' && !internal.again)
  // "3분 전" stays true while the tab is open: `now` is renewed each minute.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (tx.status !== 'ok') return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [tx])

  // Try again removes its own button: the focus moves to the section, not to <body>.
  const section = useRef<HTMLElement>(null)
  const retried = useRef(false)
  useEffect(() => {
    if (!retried.current || tx.status === 'loading') return
    retried.current = false
    if (document.activeElement === null || document.activeElement === document.body) section.current?.focus()
  })
  const again = (label: string) => (
    <Button
      variant="secondaryMd"
      onClick={() => {
        retried.current = true
        retry()
      }}
    >
      {label}
    </Button>
  )

  return (
    <section ref={section} tabIndex={-1} aria-label={x.title} aria-busy={waiting} className="flex flex-col gap-6">
      {waiting && <TxSkeleton t={x} />}
      {tx.status === 'ok' && !waiting && (
        <TxDetail tx={tx.tx} now={now} t={x} locale={locale} internal={internal} retryInternal={retryInternal} />
      )}
      {tx.status === 'notfound' && (
        <div role="status">
          <EmptyState icon="inbox" title={x.notFound.title} body={x.notFound.body} action={again(x.notFound.retry)} />
        </div>
      )}
      {tx.status === 'update' && (
        <div role="alert">
          <EmptyState
            icon="cloudCross"
            title={t.viewer.updateTitle}
            body={t.viewer.updateBody}
            action={
              <Button variant="secondaryMd" onClick={() => window.location.reload()}>
                {t.viewer.reload}
              </Button>
            }
          />
        </div>
      )}
      {tx.status === 'failed' && (
        <div role="alert">
          <EmptyState icon="cloudCross" title={x.failed.title} body={x.failed.body} action={again(x.failed.retry)} />
        </div>
      )}
    </section>
  )
}
