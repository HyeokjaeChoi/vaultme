import { webMessages } from '@vaultme/i18n/web'
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, useMatches } from 'react-router'
// Pretendard dynamic subsets that hold the first-screen glyphs (indices from unicode-range; `?url` gives the hashed file).
import pretendard90 from 'pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.90.woff2?url'
import pretendard91 from 'pretendard/dist/web/variable/woff2-dynamic-subset/PretendardVariable.subset.91.woff2?url'
import appCss from './app.css?url'
import { localeOf } from './shared/lib/locale'
import { THEME_SCRIPT } from './shared/lib/theme'
import { SiteFooter } from './shared/ui/SiteFooter'
import { SiteHeader } from './shared/ui/SiteHeader'

export function Layout({ children }: { children: React.ReactNode }) {
  const locale = localeOf(useLocation().pathname)
  // A page loads the React Router runtime (~115 KB gzip) only when its route sets handle.hydrate. Static pages (404,
  // landing) ship no app JS: the theme script is inline. The CSP has no hash for the router's inline scripts.
  // The build's SPA shell (only the root route matches) must keep <Scripts />, so React Router accepts it.
  const matches = useMatches()
  const hydrate =
    matches.length < 2 || matches.some((m) => (m.handle as { hydrate?: boolean } | undefined)?.hydrate === true)
  // 91 holds Latin and the space; 90 holds most Hangul. English first screens need only 91.
  const preload = locale === 'ko' ? [pretendard91, pretendard90] : [pretendard91]
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {preload.map((href) => (
          <link key={href} rel="preload" as="font" type="font/woff2" href={href} crossOrigin="anonymous" />
        ))}
        <meta name="description" content={webMessages[locale].footer.testnetOnly} />
        <Meta />
        {hydrate ? <Links /> : <link rel="stylesheet" href={appCss} />}
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
      <SiteHeader locale={locale} />
      <Outlet />
      <SiteFooter locale={locale} />
    </>
  )
}

export function HydrateFallback() {
  return null
}
