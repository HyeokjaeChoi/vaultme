// Web copy (apps/web) in ko and en. Separate entry point (`@vaultme/i18n/web`): plain objects, no i18next, so the
// static site ships no runtime for it. The mobile app stays ko-only (ADR-0012); `en` holds web keys only.
// Korean copy follows the Figma web frames (file NMXrn0q75G1SX2Bn1L1jP8, page "Web").
export const webKo = {
  siteName: 'VaultMe',
  header: {
    network: 'Sepolia 테스트넷',
    viewer: '주소 보기',
    languageLabel: '언어',
    themeLabel: '화면 테마',
    theme: { auto: '자동', light: '밝게', dark: '어둡게' },
  },
  footer: {
    viewer: '주소 보기',
    testnetOnly: 'Sepolia 테스트넷 전용이에요. 테스트 자금만 다뤄요.',
    readOnly: '학습과 포트폴리오를 위한 프로젝트예요. 조회 전용 페이지는 키나 복구 문구를 묻지 않아요.',
  },
  notFound: {
    code: '404',
    title: '페이지를 찾을 수 없어요',
    help: '주소가 바뀌었거나 없는 페이지예요. 조회할 주소를 넣거나 처음으로 돌아가 보세요.',
    viewer: '주소 보기',
    home: '홈으로',
  },
} as const

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
export type WebMessages = Widen<typeof webKo>

export const webEn: WebMessages = {
  siteName: 'VaultMe',
  header: {
    network: 'Sepolia testnet',
    viewer: 'View an address',
    languageLabel: 'Language',
    themeLabel: 'Color theme',
    theme: { auto: 'Auto', light: 'Light', dark: 'Dark' },
  },
  footer: {
    viewer: 'View an address',
    testnetOnly: 'Sepolia testnet only. Test funds only.',
    readOnly: 'A learning and portfolio project. The read-only pages never ask for keys or a recovery phrase.',
  },
  notFound: {
    code: '404',
    title: 'Page not found',
    help: 'The address changed or the page does not exist. Enter an address to look up, or go back to the start.',
    viewer: 'View an address',
    home: 'Home',
  },
}

export type WebLocale = 'ko' | 'en'
export const webLocales: readonly WebLocale[] = ['ko', 'en']
export const webMessages: Record<WebLocale, WebMessages> = { ko: webKo, en: webEn }
