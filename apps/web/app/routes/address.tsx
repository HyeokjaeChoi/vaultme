import { type WebLocale, type WebMessages, webMessages } from '@vaultme/i18n/web'
import { type SyntheticEvent, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { type Balances, useBalances } from '../shared/api/useBalances'
import { parseAddress } from '../shared/lib/address'
import { localeOf, viewerPath } from '../shared/lib/locale'
import { AddressField } from '../shared/ui/AddressField'
import { AddressText } from '../shared/ui/AddressText'
import { BalanceCard } from '../shared/ui/BalanceCard'
import { Button } from '../shared/ui/Button'
import { buttonClass } from '../shared/ui/ButtonLink'
import { CopyButton } from '../shared/ui/CopyButton'
import { Notice, NoticeAction } from '../shared/ui/Notice'
import { StatusChip } from '../shared/ui/StatusChip'

// Figma: Address input · 375 / 768 / 1280 · Light + Dark (page "Web", section 765:1340, invalid frames 765:1771..)
// Figma: Viewer · 375 / 768 / 1280 · Light + Dark (section 765:2183; loading 767:3034.., error 767:4056..)
// One prerendered page (ADR-0012): the address is in the URL fragment (/address#0x...), so it never reaches the web
// host, its logs or analytics. The history list (#196) goes in the viewer's second column.
export const handle = { hydrate: true }

// Public test addresses: BIP39 "abandon ... about" account 0, and Hardhat account 1. Tests only, no real funds.
const EXAMPLES = ['0x9858EfFD232B4033E47d90003D41EC34EcaEda94', '0x70997970C51812dc3A010C7d01b50e0d17dc79C8']
// First 6 and last 4 characters, as mobile shortAddress.
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

// Runs while the page is parsed, before first paint: a viewer link paints the viewer skeleton, not the form (app.css).
const BOOT_SCRIPT = `if(/^#0x[0-9a-fA-F]{40}$/.test(location.hash))document.documentElement.dataset.boot='viewer'`

/** The fragment as typed; one that is not valid percent-encoding stays as is (parseAddress rejects it). */
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

export default function AddressPage() {
  const { pathname, hash } = useLocation()
  const locale = localeOf(pathname)
  const t = webMessages[locale]
  const hydrated = useHydrated()
  const fragment = decodeFragment(hash.slice(1))
  const address = hydrated && fragment ? parseAddress(fragment) : null

  // A switch between the form and the viewer moves focus to the new heading, so a screen reader starts there.
  const heading = useRef<HTMLHeadingElement>(null)
  const view = address ?? 'form'
  const shown = useRef<string | null>(null)
  useEffect(() => {
    if (!hydrated) return
    if (shown.current !== null && shown.current !== view) heading.current?.focus()
    shown.current = view
  }, [hydrated, view])

  const title = <title>{`${t.address.pageTitle} · ${t.siteName}`}</title>
  if (!hydrated)
    return (
      <>
        {title}
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
        <div data-boot-form>
          <AddressForm t={t} initial="" headingRef={heading} />
        </div>
        <div data-boot-viewer>
          <Viewer t={t} locale={locale} address={null} headingRef={heading} />
        </div>
      </>
    )
  return (
    <>
      {title}
      {address ? (
        <Viewer t={t} locale={locale} address={address} headingRef={heading} />
      ) : (
        // A shared link with a bad address opens the form with that text and its error.
        <AddressForm key={fragment} t={t} initial={fragment} headingRef={heading} />
      )}
    </>
  )
}

type HeadingRef = React.RefObject<HTMLHeadingElement | null>

function AddressForm({ t, initial, headingRef }: { t: WebMessages; initial: string; headingRef: HeadingRef }) {
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(initial)
  const [error, setError] = useState(initial !== '' && parseAddress(initial) === null)
  const open = (a: string) => void navigate({ hash: a })

  function submit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const a = parseAddress(value)
    if (a) open(a)
    else {
      setError(true)
      input.current?.focus()
    }
  }
  async function paste() {
    try {
      setValue((await navigator.clipboard.readText()).trim())
      setError(false)
    } catch {
      input.current?.focus() // no clipboard permission: the user pastes with the keyboard
    }
  }

  return (
    <main
      id="main"
      className="px-layout-screen-padding tablet:px-8 tablet:py-16 web-desktop:py-20 flex justify-center py-10"
    >
      <div className="max-w-layout-web-narrow-width flex w-full flex-col gap-6">
        <div className="flex flex-col gap-2 text-center">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-product-b-title2 tablet:text-product-b-title1 web-desktop:text-product-b-display-m text-text-primary text-balance"
          >
            {t.address.title}
          </h1>
          <p className="text-product-b-body text-text-secondary">{t.address.lead}</p>
        </div>
        <form noValidate onSubmit={submit} className="flex flex-col gap-6">
          <AddressField
            ref={input}
            label={t.address.label}
            helper={t.address.helper}
            error={error ? t.address.invalid : null}
            name="address"
            placeholder="0x…"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(false)
            }}
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => void paste()}>
              {t.address.paste}
            </Button>
            <Button variant="primary" type="submit" className="min-w-px flex-1">
              {t.address.submit}
            </Button>
          </div>
        </form>
        <div className="flex flex-col gap-2">
          <p className="text-product-b-caption text-text-tertiary">{t.address.examples}</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((a) => (
              <Button key={a} variant="secondaryMd" onClick={() => open(a)} translate="no">
                {short(a)}
              </Button>
            ))}
          </div>
        </div>
        <Notice tone="info" tier="inline">
          {t.address.ens}
        </Notice>
        <Notice tone="info" tier="banner" title={t.address.trustTitle}>
          {t.address.trustBody}
        </Notice>
      </div>
    </main>
  )
}

type ViewerProps = { t: WebMessages; locale: WebLocale; address: string | null; headingRef: HeadingRef }

/** `address` null = before hydration: the skeleton with the final sizes, the address text hidden (data-boot-viewer). */
function Viewer({ t, locale, address, headingRef }: ViewerProps) {
  const [balances, retry] = useBalances(address)
  return (
    <main
      id="main"
      className="px-layout-screen-padding tablet:px-8 tablet:py-10 web-desktop:px-20 flex flex-col gap-6 py-6"
    >
      <div className="flex items-center gap-4">
        <div className="flex min-w-px flex-1 flex-col items-start gap-2">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-product-b-title2 tablet:text-product-b-title1 web-desktop:text-product-b-display-m text-text-primary"
          >
            {t.viewer.title}
          </h1>
          <StatusChip>{t.viewer.readOnly}</StatusChip>
        </div>
        <Link to={viewerPath(locale)} className={buttonClass('ghost', 'shrink-0')}>
          {t.viewer.other}
        </Link>
      </div>
      <div className="web-desktop:grid web-desktop:grid-cols-3 web-desktop:gap-8 flex flex-col gap-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-start gap-3">
            <p className="text-product-b-caption text-text-tertiary">{t.viewer.addressLabel}</p>
            <div className="flex w-full items-center gap-2">
              {/* Before hydration a placeholder of the same length keeps the two-line height. */}
              <div className={`flex min-w-px flex-1 ${address ? '' : 'invisible'}`} translate="no">
                <AddressText address={address ?? `0x${'0'.repeat(40)}`} />
              </div>
              <CopyButton text={address} label={t.viewer.copy} copied={t.viewer.copied} />
            </div>
            <StatusChip>{t.viewer.network}</StatusChip>
          </div>
          <BalanceSection t={t} balances={balances} retry={retry} />
        </div>
        {/* #196: the history list, web-desktop:col-span-2 */}
      </div>
    </main>
  )
}

function BalanceSection({ t, balances, retry }: { t: WebMessages; balances: Balances; retry: () => void }) {
  // Retry removes the banner and its button: focus moves to the balances, not back to <body>.
  const section = useRef<HTMLElement>(null)
  const retried = useRef(false)
  useEffect(() => {
    if (!retried.current || !section.current) return
    retried.current = false
    section.current.focus()
  })
  if (balances.status === 'failed' || balances.status === 'update') {
    const update = balances.status === 'update'
    return (
      <Notice
        tone="danger"
        tier="banner"
        role="alert"
        title={update ? t.viewer.updateTitle : t.viewer.failedTitle}
        action={
          update ? (
            <NoticeAction onClick={() => window.location.reload()}>{t.viewer.reload}</NoticeAction>
          ) : (
            <NoticeAction
              onClick={() => {
                retried.current = true
                retry()
              }}
            >
              {t.viewer.retry}
            </NoticeAction>
          )
        }
      >
        {update ? t.viewer.updateBody : t.viewer.failedBody}
      </Notice>
    )
  }
  const ok = balances.status === 'ok'
  return (
    <section
      ref={section}
      tabIndex={-1}
      aria-label={t.viewer.balances}
      aria-busy={!ok}
      className="tablet:grid-cols-2 web-desktop:flex grid gap-3 web-desktop:flex-col"
    >
      <BalanceCard asset="ETH" name={t.viewer.eth} amount={ok ? balances.ETH : null} />
      <BalanceCard asset="USDC" name={t.viewer.usdc} amount={ok ? balances.USDC : null} />
      <p role="status" className="sr-only">
        {ok ? '' : t.viewer.loading}
      </p>
    </section>
  )
}
