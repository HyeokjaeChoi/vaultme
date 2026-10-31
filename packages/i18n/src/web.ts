// Web copy (apps/web) in ko and en. Separate entry point (`@vaultme/i18n/web`): plain objects, no i18next, so the
// static site ships no runtime for it. The mobile app stays ko-only (ADR-0012); `en` holds web keys only.
// Korean copy follows the Figma web frames (file NMXrn0q75G1SX2Bn1L1jP8, page "Web").
export const webKo = {
  siteName: 'VaultMe',
  header: {
    network: 'Sepolia 테스트넷',
    viewer: '주소 보기',
    viewerShort: '주소 보기',
    skip: '본문으로 건너뛰기',
    languageLabel: '언어',
    themeLabel: '화면 테마',
    theme: { auto: '자동', light: '밝게', dark: '어둡게' },
  },
  footer: {
    viewer: '주소 보기',
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
    // Owner-approved copy, #311 comment 2026-11-01 (ADR-0007, ADR-0011). Figma: Privacy note in Address input frames 765:1341..
    privacy: '조회한 주소는 VaultMe 서버를 거쳐요. 서버는 주소를 저장하지 않아요.',
  },
  viewer: {
    title: '조회한 주소',
    readOnly: '조회 전용',
    other: '다른 주소 보기',
    addressLabel: '조회 중인 주소',
    copy: '주소 복사',
    copied: '복사했어요',
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
  history: {
    title: '거래 내역',
    etherscan: 'Etherscan에서 보기',
    loading: '거래 내역을 불러오고 있어요',
    columns: { status: '상태', direction: '구분', counterparty: '상대 주소', amount: '수량', time: '시간' },
    status: { confirmed: '확정', failed: '실패' },
    direction: { receive: '받음', send: '보냄' },
    // Card title (Figma Activity row): a failed send has its own words; the receive twin is not in Figma yet.
    cardTitle: { receive: '받음', send: '보냄', sendFailed: '보내기 실패', receiveFailed: '받기 실패' },
    more: '더 보기',
    moreFailed: '더 불러오지 못했어요. 다시 시도하세요.',
    empty: {
      title: '아직 거래가 없어요',
      body: '이 주소에는 Sepolia 거래가 없어요. 테스트 ETH가 필요하면 파우셋에서 받을 수 있어요.',
      faucet: 'Sepolia 파우셋 열기',
    },
    failed: { title: '내역을 불러오지 못했어요', body: '연결을 확인하고 다시 시도하세요.', retry: '다시 시도' },
  },
} as const

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
export type WebMessages = Widen<typeof webKo>

export const webEn: WebMessages = {
  siteName: 'VaultMe',
  header: {
    network: 'Sepolia testnet',
    viewer: 'View an address',
    viewerShort: 'Address',
    skip: 'Skip to content',
    languageLabel: 'Language',
    themeLabel: 'Color theme',
    theme: { auto: 'Auto', light: 'Light', dark: 'Dark' },
  },
  footer: {
    viewer: 'View an address',
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
    // English of the approved ko line (#311); the owner approved the ko copy only.
    privacy: 'Addresses you look up pass through the VaultMe server. The server does not store them.',
  },
  viewer: {
    title: 'Address',
    readOnly: 'Read-only',
    other: 'View another address',
    addressLabel: 'Address you are viewing',
    copy: 'Copy address',
    copied: 'Copied',
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
  history: {
    title: 'Transactions',
    etherscan: 'View on Etherscan',
    loading: 'Loading the transactions',
    columns: { status: 'Status', direction: 'Type', counterparty: 'Counterparty', amount: 'Amount', time: 'Time' },
    status: { confirmed: 'Confirmed', failed: 'Failed' },
    direction: { receive: 'Received', send: 'Sent' },
    cardTitle: { receive: 'Received', send: 'Sent', sendFailed: 'Send failed', receiveFailed: 'Receive failed' },
    more: 'Show more',
    moreFailed: 'Could not load more. Try again.',
    empty: {
      title: 'No transactions yet',
      body: 'This address has no Sepolia transactions. You can get test ETH from a faucet.',
      faucet: 'Open the Sepolia faucet',
    },
    failed: {
      title: 'Could not load the transactions',
      body: 'Check your connection and try again.',
      retry: 'Try again',
    },
  },
}

export type WebLocale = 'ko' | 'en'
export const webLocales: readonly WebLocale[] = ['ko', 'en']
export const webMessages: Record<WebLocale, WebMessages> = { ko: webKo, en: webEn }
