import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { ko } from './ko'

export { ko }
export const defaultNS = 'ko'
export const resources = { ko: { ko } } as const

// Typed keys: t('home.send') is checked against ko.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS
    resources: typeof resources.ko
  }
}

/** Shared instance. Language is fixed to ko for v1. Resources are inline, so init is synchronous. */
export const i18n = createInstance()
void i18n.use(initReactI18next).init({
  lng: 'ko',
  fallbackLng: 'ko',
  defaultNS,
  ns: [defaultNS],
  resources,
  initAsync: false,
  interpolation: { escapeValue: false },
})
