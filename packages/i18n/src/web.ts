// Web copy (apps/web) in ko and en. Separate entry point (`@vaultme/i18n/web`): plain objects, no i18next, so the
// static site ships no runtime for it. The mobile app stays ko-only (ADR-0012); `en` holds web keys only.
// Korean copy follows the Figma web frames (file NMXrn0q75G1SX2Bn1L1jP8, page "Web").
export const webKo = {
  siteName: 'VaultMe',
  header: {
    network: 'Sepolia 테스트넷',
    viewer: '주소 보기',
    skip: '본문으로 건너뛰기',
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
  address: {
    pageTitle: '주소 보기',
    title: '주소를 넣어 보세요',
    lead: 'Sepolia 테스트넷 주소의 잔액과 거래 내역을 볼 수 있어요.',
    label: 'Sepolia 주소',
    helper: '0x로 시작하는 42자리 주소를 넣어 주세요.',
    invalid: '올바른 주소가 아니에요. 0x로 시작하는 42자리 주소를 확인해 주세요.',
    paste: '붙여넣기',
    submit: '주소 보기',
    examples: '예시 주소',
    ens: 'ENS는 지원하지 않아요. 0x로 시작하는 주소를 넣어 주세요.',
    trustTitle: '조회 전용이에요',
    trustBody: '로그인이 없어요. 키나 복구 문구를 묻지 않아요.',
  },
  viewer: {
    title: '조회한 주소',
    readOnly: '조회 전용',
    other: '다른 주소 보기',
    addressLabel: '조회 중인 주소',
    copy: '주소 복사',
    copied: '복사했어요',
    network: 'Sepolia 테스트넷',
    balances: '잔액',
    loading: '잔액을 불러오고 있어요',
    eth: 'Sepolia ETH',
    usdc: 'USD Coin',
    failedTitle: '잔액을 불러오지 못했어요',
    failedBody: '연결을 확인하고 다시 시도하세요.',
    retry: '다시 시도',
    updateTitle: '새로고침해 주세요',
    updateBody: '사이트가 새 버전으로 바뀌었어요.',
    reload: '새로고침',
  },
} as const

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
export type WebMessages = Widen<typeof webKo>

export const webEn: WebMessages = {
  siteName: 'VaultMe',
  header: {
    network: 'Sepolia testnet',
    viewer: 'View an address',
    skip: 'Skip to content',
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
  address: {
    pageTitle: 'View an address',
    title: 'Enter an address',
    lead: 'See the balances and transaction history of a Sepolia testnet address.',
    label: 'Sepolia address',
    helper: 'Enter a 42-character address that starts with 0x.',
    invalid: 'This is not a valid address. Check the 42-character address that starts with 0x.',
    paste: 'Paste',
    submit: 'View address',
    examples: 'Example addresses',
    ens: 'ENS names are not supported. Enter an address that starts with 0x.',
    trustTitle: 'Read-only',
    trustBody: 'No sign-in. We never ask for keys or a recovery phrase.',
  },
  viewer: {
    title: 'Address',
    readOnly: 'Read-only',
    other: 'View another address',
    addressLabel: 'Address you are viewing',
    copy: 'Copy address',
    copied: 'Copied',
    network: 'Sepolia testnet',
    balances: 'Balances',
    loading: 'Loading the balances',
    eth: 'Sepolia ETH',
    usdc: 'USD Coin',
    failedTitle: 'Could not load the balances',
    failedBody: 'Check your connection and try again.',
    retry: 'Try again',
    updateTitle: 'Refresh the page',
    updateBody: 'The site has a new version.',
    reload: 'Refresh',
  },
}

export type WebLocale = 'ko' | 'en'
export const webLocales: readonly WebLocale[] = ['ko', 'en']
export const webMessages: Record<WebLocale, WebMessages> = { ko: webKo, en: webEn }
