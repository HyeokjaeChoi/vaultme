import { webMessages } from '@vaultme/i18n/web'
import { useContext } from 'react'
import {
  UNSAFE_FrameworkContext as FrameworkContext,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useMatches,
} from 'react-router'
import appCss from './app.css?url'
import fontsCss from './fonts.css?url'
import { localeOf } from './shared/lib/locale'
import { THEME_SCRIPT } from './shared/lib/theme'
import { SiteFooter } from './shared/ui/SiteFooter'
import { SiteHeader } from './shared/ui/SiteHeader'
import { SkipLink } from './shared/ui/SkipLink'

export function Layout({ children }: { children: React.ReactNode }) {
  const locale = localeOf(useLocation().pathname)
  // A page loads the React Router runtime (~115 KB gzip) only when its route sets handle.hydrate. Static pages (404,
  // landing) ship no app JS: the theme script is inline. The CSP has no hash for the router's inline scripts.
  // The build's SPA shell (`__spa-fallback.html`, rendered even when `/` is prerendered) must keep <Scripts />, or the
  // build fails. It is the one render where the framework context says isSpaMode (checked on react-router 8.4.0, see
  // test/build.test.ts). UNSAFE_ API: if a router upgrade renames it, that test fails.
  const isSpaShell = useContext(FrameworkContext)?.isSpaMode === true
  const routeHydrates = useMatches().some((m) => (m.handle as { hydrate?: boolean } | undefined)?.hydrate === true)
  const hydrate = isSpaShell || routeHydrates
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Meta />
        {hydrate ? <Links /> : <link rel="stylesheet" href={appCss} />}
        {/* Fonts after first contentful paint (see fonts.css). Without script, <noscript> loads them at once. */}
        <link rel="stylesheet" href={fontsCss} media="print" data-defer />
        <noscript>
          <link rel="stylesheet" href={fontsCss} />
        </noscript>
      </head>
      <body className="bg-screen-b-bg text-text-primary">
        {children}
        {hydrate && <ScrollRestoration />}
        {hydrate && <Scripts />}
      </body>
    </html>
  )
}

export default function App() {
  const locale = localeOf(useLocation().pathname)
  return (
    <>
      <SkipLink t={webMessages[locale].header} />
      <SiteHeader locale={locale} />
      <Outlet />
      <SiteFooter locale={locale} />
    </>
  )
}

export function HydrateFallback() {
  return null
}
