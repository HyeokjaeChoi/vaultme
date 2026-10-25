// Landing and 404 page copy (apps/web) in ko and en. A separate entry point (`@vaultme/i18n/web-landing`) so the viewer pages do not
// ship these strings (the viewer JS budget, ADR-0012). Korean copy follows the Figma web frames (file NMXrn0q75G1SX2Bn1L1jP8, page "Web").
import type { WebLocale } from './web.ts'

const ko = {
  landing: {
    meta: {
      title: 'VaultMe · Sepolia 테스트넷 셀프 커스터디 지갑',
      description:
        'VaultMe는 Sepolia 테스트넷에서 안전하게 연습하는 셀프 커스터디 지갑이에요. 키는 내 기기에만 있고, 웹에서는 로그인 없이 주소만 넣어 잔액과 거래 내역을 볼 수 있어요.',
    },
    hero: {
      title: ['내 키는', '내 기기에만 있어요'],
      value: 'Sepolia 테스트넷에서 안전하게 연습하는 셀프 커스터디 지갑이에요.',
      appStore: 'App Store에서 받기',
      googlePlay: 'Google Play에서 받기',
      mockupAlt: 'VaultMe 앱의 자산 화면. Sepolia ETH 1.2847개와 USDC 12.5개를 보여 줘요.',
    },
    features: {
      title: '한 앱으로 지갑과 뷰어를 써요',
      items: [
        { title: '셀프 커스터디', body: '키는 내 기기에만 있어요. VaultMe 서버는 키도 복구 구문도 가지지 않아요.' },
        {
          title: '보내기·받기',
          body: 'Sepolia ETH와 USDC를 보내고 받아요. 보내기 전에 받는 주소와 수수료를 보여 드려요.',
        },
        { title: '웹 뷰어', body: '주소만 넣으면 잔액과 거래 내역을 볼 수 있어요. 로그인이 없는 조회 전용이에요.' },
      ],
    },
    steps: {
      title: '이렇게 시작해요',
      items: [
        { title: '앱을 설치해요', body: '앱스토어나 구글 플레이에서 VaultMe를 받아요.' },
        { title: '지갑을 만들어요', body: '복구 구문을 적어 두세요. VaultMe는 되찾아 드릴 수 없어요.' },
        { title: '테스트 자금을 받아요', body: '받기 주소로 Sepolia 파우셋에서 테스트 ETH를 받아요.' },
      ],
    },
    security: {
      title: '보안은 이렇게 다뤄요',
      items: [
        { title: '키는 앱 안에만 있어요', body: '웹 뷰어는 키를 만들지도, 서명하지도 않아요. 로그인도 없어요.' },
        {
          title: '복구 구문은 묻지 않아요',
          body: 'VaultMe는 어디서도 복구 구문을 묻지 않아요. 누가 물으면 알려 주지 마세요.',
        },
        {
          title: '테스트넷 전용, 테스트 자금만',
          body: 'Sepolia 테스트넷의 자산은 실제 가치가 없어요. 실제 자금은 넣지 마세요.',
        },
      ],
    },
    faq: {
      title: '자주 묻는 질문',
      items: [
        {
          question: '키를 VaultMe가 가지고 있나요?',
          answer: '아니요. 복구 구문과 키는 내 기기에만 있어요. VaultMe는 되찾아 드릴 수 없어요.',
        },
        {
          question: '실제 돈을 넣어도 되나요?',
          answer:
            '아니요. VaultMe는 Sepolia 테스트넷 전용이에요. 테스트넷 자산은 실제 가치가 없으니 실제 자금은 넣지 마세요.',
        },
        {
          question: '웹에서 보내기도 되나요?',
          answer: '아니요. 웹은 조회 전용이에요. 키를 만들거나 서명하지 않아서, 보내기는 앱에서만 할 수 있어요.',
        },
        {
          question: 'ENS 이름도 되나요?',
          answer: '아직 지원하지 않아요. 0x로 시작하는 주소를 넣어 주세요.',
        },
      ],
    },
    closing: {
      title: '주소부터 확인해 보세요',
      body: '로그인 없이, 키 없이, 주소만 넣어 잔액과 내역을 볼 수 있어요.',
      viewer: '주소 보기',
      app: '앱 받기',
    },
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
export type WebLandingMessages = Widen<typeof ko>

const en: WebLandingMessages = {
  landing: {
    meta: {
      title: 'VaultMe · A self-custody wallet for the Sepolia testnet',
      description:
        'VaultMe is a self-custody wallet for safe practice on the Sepolia testnet. Your keys stay on your device. On the web, enter an address to see balances and history, with no sign-in.',
    },
    hero: {
      title: ['Your keys', 'stay on your device'],
      value: 'A self-custody wallet for safe practice on the Sepolia testnet.',
      appStore: 'Get it on the App Store',
      googlePlay: 'Get it on Google Play',
      mockupAlt: 'The VaultMe app assets screen, showing 1.2847 Sepolia ETH and 12.5 USDC.',
    },
    features: {
      title: 'One app for your wallet and a viewer',
      items: [
        {
          title: 'Self-custody',
          body: 'Your keys stay on your device. The VaultMe server has no keys and no recovery phrase.',
        },
        {
          title: 'Send and receive',
          body: 'Send and receive Sepolia ETH and USDC. Before you send, we show the recipient address and the fee.',
        },
        { title: 'Web viewer', body: 'Enter an address to see its balances and history. Read-only, with no sign-in.' },
      ],
    },
    steps: {
      title: 'How to start',
      items: [
        { title: 'Install the app', body: 'Get VaultMe from the App Store or Google Play.' },
        { title: 'Create a wallet', body: 'Write down your recovery phrase. VaultMe cannot recover it for you.' },
        { title: 'Get test funds', body: 'Use your receive address to get test ETH from a Sepolia faucet.' },
      ],
    },
    security: {
      title: 'How we handle security',
      items: [
        {
          title: 'Keys stay in the app',
          body: 'The web viewer never creates keys and never signs. There is no sign-in.',
        },
        {
          title: 'We never ask for your recovery phrase',
          body: 'VaultMe never asks for a recovery phrase anywhere. If someone asks, do not share it.',
        },
        {
          title: 'Testnet only, test funds only',
          body: 'Assets on the Sepolia testnet have no real value. Do not deposit real funds.',
        },
      ],
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        {
          question: 'Does VaultMe hold my keys?',
          answer: 'No. Your recovery phrase and keys stay on your device. VaultMe cannot recover them for you.',
        },
        {
          question: 'Can I deposit real money?',
          answer:
            'No. VaultMe is for the Sepolia testnet only. Testnet assets have no real value, so do not deposit real funds.',
        },
        {
          question: 'Can I send from the web?',
          answer: 'No. The web is read-only. It creates no keys and signs nothing, so you can send only in the app.',
        },
        {
          question: 'Does it support ENS names?',
          answer: 'Not yet. Enter an address that starts with 0x.',
        },
      ],
    },
    closing: {
      title: 'Start by checking an address',
      body: 'No sign-in, no keys. Enter an address to see its balances and history.',
      viewer: 'View an address',
      app: 'Get the app',
    },
  },
  notFound: {
    code: '404',
    title: 'Page not found',
    help: 'The address changed or the page does not exist. Enter an address to look up, or go back to the start.',
    viewer: 'View an address',
    home: 'Home',
  },
}

export const webLanding: Record<WebLocale, WebLandingMessages> = { ko, en }
