import type { WebLocale } from '@vaultme/i18n/web'

/** `/en` and `/en/...` are English, everything else Korean. No automatic redirect (ADR-0012). */
export function localeOf(pathname: string): WebLocale {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'ko'
}

export const homeOf = (locale: WebLocale) => (locale === 'en' ? '/en/' : '/')

export const otherLocale = (locale: WebLocale): WebLocale => (locale === 'en' ? 'ko' : 'en')

// The viewer page does not exist yet (#186 later tickets). The path is fixed by ADR-0012 (`/address#0x...`).
export const viewerPath = (locale: WebLocale) => (locale === 'en' ? '/en/address' : '/address')
export const txPath = (locale: WebLocale) => (locale === 'en' ? '/en/tx' : '/tx')
