// Transaction page copy (apps/web `/tx`) in ko and en. A separate entry point (`@vaultme/i18n/web-tx`) so the address viewer does not
// ship these strings (the viewer JS budget, ADR-0012). Korean copy follows the Figma web frames, page "Web" section 768:4422.
import type { WebLocale } from './web.ts'

const ko = {
  tx: {
    pageTitle: '거래 상세',
    lead: 'Sepolia 테스트넷 거래의 상태, 금액, 수수료를 볼 수 있어요.',
    title: '거래 상세',
    back: '주소로 돌아가기',
    status: { confirmed: '확정', failed: '실패' },
    from: '보낸 사람',
    to: '받는 사람',
    time: '시간',
    fee: '네트워크 수수료',
    block: '블록',
    hash: '거래 해시',
    copyFrom: '보낸 사람 복사',
    copyTo: '받는 사람 복사',
    copyHash: '거래 해시 복사',
    copied: '복사했어요',
    etherscan: 'Etherscan에서 보기',
    loading: '거래를 불러오고 있어요',
    notFound: {
      title: '아직 내역에 없어요',
      body: '방금 일어난 거래는 반영되는 데 시간이 걸려요. 잠시 후 다시 확인해 주세요.',
      retry: '다시 시도',
    },
    failed: { title: '내역을 불러오지 못했어요', body: '연결을 확인하고 다시 시도하세요.', retry: '다시 시도' },
    invalid: {
      title: '거래 해시가 올바르지 않아요',
      body: '0x로 시작하는 66자리 해시를 확인해 주세요.',
      viewer: '주소 보기',
    },
  },
} as const

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
export type WebTxMessages = Widen<typeof ko>['tx']

const en: { tx: WebTxMessages } = {
  tx: {
    pageTitle: 'Transaction',
    lead: 'See the status, amount and fee of a Sepolia testnet transaction.',
    title: 'Transaction',
    back: 'Back to address',
    status: { confirmed: 'Confirmed', failed: 'Failed' },
    from: 'From',
    to: 'To',
    time: 'Time',
    fee: 'Network fee',
    block: 'Block',
    hash: 'Transaction hash',
    copyFrom: 'Copy sender',
    copyTo: 'Copy recipient',
    copyHash: 'Copy transaction hash',
    copied: 'Copied',
    etherscan: 'View on Etherscan',
    loading: 'Loading the transaction',
    notFound: {
      title: 'Not in the history yet',
      body: 'A new transaction can take a moment to show up. Check again in a little while.',
      retry: 'Try again',
    },
    failed: {
      title: "Couldn't load the transaction",
      body: 'Check your connection and try again.',
      retry: 'Try again',
    },
    invalid: {
      title: 'The transaction hash is not valid',
      body: 'Check the 66-character hash that starts with 0x.',
      viewer: 'View an address',
    },
  },
}

export const webTx: Record<WebLocale, WebTxMessages> = { ko: ko.tx, en: en.tx }
