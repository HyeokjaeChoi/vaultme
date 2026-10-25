import { type WebLocale, type WebMessages, webMessages } from '@vaultme/i18n/web'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, NavigationType, useLocation, useNavigationType } from 'react-router'
import { useTransaction } from '../shared/api'
import { parseAddress } from '../shared/lib/address'
import { localeOf, viewerPath } from '../shared/lib/locale'
import { parseTxHash } from '../shared/lib/tx'
import { Button } from '../shared/ui/Button'
import { ButtonLink, buttonClass } from '../shared/ui/ButtonLink'
import { EmptyState } from '../shared/ui/EmptyState'
import { Icon } from '../shared/ui/Icon'
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
  const hydrated = useHydrated()
  const txHash = hydrated ? parseTxHash(decodeFragment(hash.slice(1))) : null
  // A row of the address viewer links here with its address in the router state (kept in memory by the router, never in the URL): the way back.
  const from = parseAddress((state as { from?: unknown } | null)?.from?.toString() ?? '')

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
      <title>{`${t.tx.pageTitle} · ${t.siteName}`}</title>
      <meta name="description" content={t.tx.lead} />
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
            <Icon name="back" className="size-badge" />
            {t.tx.back}
          </Link>
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-product-b-title2 tablet:text-product-b-title1 web-desktop:text-product-b-display-m text-text-primary"
          >
            {t.tx.title}
          </h1>
          {/* Before hydration the boot script shows one of these two (app.css); after it only the one that applies is rendered. */}
          {(!hydrated || !txHash) && (
            <div data-boot-form>
              <EmptyState
                icon="warning"
                title={t.tx.invalid.title}
                body={t.tx.invalid.body}
                action={
                  <ButtonLink variant="secondaryMd" href={viewerPath(locale)}>
                    {t.tx.invalid.viewer}
                  </ButtonLink>
                }
              />
            </div>
          )}
          {(!hydrated || txHash) && (
            <div data-boot-viewer className="flex flex-col gap-6">
              <Detail t={t} locale={locale} hash={txHash} />
            </div>
          )}
        </div>
      </main>
    </>
  )
}

/** `hash` null = before hydration: the skeleton. */
function Detail({ t, locale, hash }: { t: WebMessages; locale: WebLocale; hash: string | null }) {
  const [tx, retry] = useTransaction(hash)
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
    <section
      ref={section}
      tabIndex={-1}
      aria-label={t.tx.title}
      aria-busy={tx.status === 'loading'}
      className="flex flex-col gap-6"
    >
      {tx.status === 'loading' && <TxSkeleton t={t} />}
      {tx.status === 'ok' && <TxDetail tx={tx.tx} now={now} t={t} locale={locale} />}
      {tx.status === 'notfound' && (
        <div role="status">
          <EmptyState
            icon="inbox"
            title={t.tx.notFound.title}
            body={t.tx.notFound.body}
            action={again(t.tx.notFound.retry)}
          />
        </div>
      )}
      {tx.status === 'failed' && (
        <div role="alert">
          <EmptyState
            icon="cloudCross"
            title={t.tx.failed.title}
            body={t.tx.failed.body}
            action={again(t.tx.failed.retry)}
          />
        </div>
      )}
    </section>
  )
}
