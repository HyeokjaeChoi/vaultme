import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { ko } from './ko'

export const defaultNS = 'ko'
// One namespace (named `ko` for the typed keys) in each language (ADR-0037).
export const resources = { ko: { ko }, en: { ko: en } } as const

/** App languages, fallback first (ADR-0037). */
const appLanguages = ['ko', 'en'] as const
export type AppLanguage = (typeof appLanguages)[number]

/** The first device language the app supports, else ko. `codes` = device language codes, most preferred first (expo-localization `getLocales()`). */
export const pickLanguage = (codes: readonly (string | null)[]): AppLanguage =>
  codes.map((c) => c?.toLowerCase()).find((c): c is AppLanguage => appLanguages.includes(c as AppLanguage)) ?? 'ko'

// Typed keys: t('home.send') is checked against ko.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS
    resources: typeof resources.ko
  }
}

/** Shared instance. Starts in ko; the app switches to the device language before its first render. Resources are inline, so init and changeLanguage are synchronous. */
export const i18n = createInstance()
void i18n.use(initReactI18next).init({
  lng: 'ko',
  fallbackLng: 'ko',
  supportedLngs: appLanguages,
  defaultNS,
  ns: [defaultNS],
  resources,
  initAsync: false,
  interpolation: { escapeValue: false },
})
