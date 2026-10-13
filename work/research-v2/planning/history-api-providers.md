# 주소 거래 내역 API provider 비교 (취합)

작성일: 2026-10-11 · 관련 결정: Q30, Q32 · 상세: [그룹 A](history-api-providers-a.md) (Alchemy·Infura·QuickNode·Etherscan V2, Sonnet), [그룹 B](history-api-providers-b.md) (Moralis·GoldRush·Blockscout·Ankr, Haiku)

조사는 공식 문서·가격 페이지 기준이다. 일부 페이지는 404/403이라 미확인 항목이 있다. 실제 testnet 호출로 확인하기 전에는 지원 사실로 보고하지 않는다.

## 요약

- **Infura**: 주소 history/transfers API가 없다. 후보에서 뺀다.
- **QuickNode**: ERC-20 전용, add-on 필요, native·testnet 미확인. 비추천.
- **Etherscan V2**: `txlist`·`txlistinternal`·`tokentx` 3개 호출로 요구를 덮는다. 무료로 Sepolia·Arbitrum Sepolia·Amoy 가능. Base/OP Sepolia는 유료. `confirmations` 필드 제공. 무료 3 calls/s, 100k/day, 2026-07-01부터 요청당 최대 1,000건. incoming native가 `txlist`에 포함되는지는 실호출 확인 필요.
- **Alchemy**: `alchemy_getAssetTransfers`가 incoming native(external)·ERC-20을 반환한다. internal 카테고리는 일부 mainnet만 공식 지원, testnet 동작 미확인. 무료 30M CU.
- **Blockscout**: transactions·internal-transactions·token-transfers 엔드포인트가 분명하다. 인스턴스별 엔드포인트는 PRO API로 이전 예고. PRO는 key 필요, 무료 5 RPS.
- **Moralis·GoldRush·Ankr**: testnet 또는 internal native 지원을 확인하지 못했다.
- **공통**: 모바일 앱에 key를 넣으면 노출된다. bundle ID allowlist를 확인한 provider가 없다. reorg 처리를 문서화한 곳이 없다.

## 권고 (추론, 미결정)

- 저장 없는 얇은 pass-through proxy를 push 서버에 둔다.
- 최소 후보는 Etherscan V2 (testnet 무료) + tx hash dedupe. Alchemy는 대안.
- 구현 전 실측: 선택 testnet 주소로 incoming native, internal native, ERC-20, pagination, 지연.
