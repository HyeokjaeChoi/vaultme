# 업계 지갑의 거래 내역·Push backend 사례 (취합)

작성일: 2026-10-11 · 관련 결정: Q32 · 상세: [오픈소스 지갑](wallet-history-backend-practices-a.md) (MetaMask·Rainbow·Uniswap·Rabby, 소스 코드 근거, Sonnet), [비공개 지갑](wallet-history-backend-practices-b.md) (Trust·Coinbase/Base·Phantom·Zerion·OKX, 정책 문서 근거, Haiku)

## 결론

- 소스로 확인한 4개 지갑은 모두 **자체 backend**에서 내역·잔액을 받는다. 앱이 third-party indexer를 직접 부르는 코드는 찾지 못했다.
  - MetaMask: Etherscan 직접 조회 → 자체 Accounts API로 이관(PR #4927). 구 TransactionController incoming 기능은 v68에서 제거.
  - Rainbow: 자체 API, address는 query string.
  - Uniswap: Cloudflare gateway 경유.
  - Rabby: 자체 API, 요청마다 ts·nonce·sign 헤더 서명, 설치별 uuid.
- 앱 번들에 key가 있는 경우(Rainbow, Uniswap)도 그 key는 **자기 gateway용**이다. provider key를 앱에 넣는 사례는 없었다.
- 기기 증명(App Attest/Play Integrity) 사용 증거는 찾지 못했다.
- Push 구독: Rainbow(FCM token + 주소), Uniswap(OneSignal + Firestore 주소·pushId), Zerion(익명 push token + 구독 주소, 끄면 처리 중단 — 정책 명시).
- 개인정보 고지: 주소가 서버로 간다는 명시는 MetaMask 지원 문서와 Zerion 정책 정도. 보관 기간을 숫자로 밝힌 곳은 Zerion IP 14일뿐. 사용자 opt-out 토글은 MetaMask만 확인.
- 비공개 지갑 5곳은 backend 구조를 공식적으로 밝히지 않았다. 실제 호출 대상은 트래픽 캡처로만 검증 가능.

## 한계

- GitHub code search rate limit으로 metamask-mobile 앱 내부 일부 미확인.
- 각 벤더 backend 뒤의 indexer 종류 미확인.
- 일부 정책 페이지가 stale(Rainbow 2020) 또는 403(Uniswap).
