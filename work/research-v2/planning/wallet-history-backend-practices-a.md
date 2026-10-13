# 모바일 지갑의 거래내역/잔액 조회 구조 (오픈소스 지갑 4종)

기준일: 2026-10-11. 코드는 각 repo의 shallow clone(2026-10-02 ~ 10-08 커밋) 또는 main raw 파일 기준.
표기: [V] 검증됨(링크/파일), [I] 추론, [U] 미확인.

## 요약

- 4곳 모두 앱이 **벤더 자체 백엔드**를 부른다. 거래내역을 Etherscan/Alchemy 등 서드파티에 직접 묻는 구조는 코드에서 확인되지 않았다.
- 벤더 백엔드는 내부에서 서드파티 indexer를 쓸 수 있다. 이 부분은 클라이언트에서 안 보인다 [U].
- 클라이언트 번들에 박힌 "공유 API key"는 Rainbow, Uniswap에서 확인됨. 둘 다 key 자체는 추출 가능하다고 봐야 한다 [I].
- MetaMask와 Rabby는 key 대신 bearer token(로그인 기반) 또는 요청 서명 방식을 쓴다.
- 개인정보 고지에서 "wallet address가 서버로 간다"를 명시한 곳은 MetaMask support 문서뿐이다. 나머지 정책은 address를 언급하지 않는다.

## 비교표

| 항목 | MetaMask Mobile | Rainbow | Uniswap Wallet | Rabby Mobile |
|---|---|---|---|---|
| 내역/잔액 소스 | 자체 Accounts API (`accounts.api.cx.metamask.io`) [V] | 자체 platform API(`PLATFORM_BASE_URL`) + addys(`ADDYS_BASE_URL`) [V] | 자체 GraphQL gateway (`*.gateway.uniswap.org`) [V] | 자체 OpenAPI `app-api.rabby.io` [V] |
| 서드파티 직접 호출 | RPC는 Infura 기본 [V 정책문서] | `ETHERSCAN_API_KEY` 등 env 존재, 사용처 미확인 [U] | 확인 못함 | 확인 못함 |
| 클라이언트 내장 key | `MM_INFURA_PROJECT_ID`가 빌드 env (RPC용) [V]. 내역용 key는 없음 | `ADDYS_API_KEY`, `PLATFORM_API_KEY`, `NOTIFICATIONS_API_KEY`를 Bearer로 전송 [V] | `TRADING_API_KEY`를 `x-api-key`로 전송 [V] | 공유 key 없음. 설치별 uuid `apiKey` [V] |
| key 보호 | 로그인 bearer token + `x-metamask-clientproduct` 헤더 [V] | 빌드 시 .env 주입(bitrise) [V]. 프록시 뒤에 key. attestation 증거 없음 | Cloudflare gateway 뒤에서 key 사용 [V]. attestation 증거 없음 | 요청마다 ts/nonce/ver/sign 헤더 서명 [V] |
| address 고지 | Support 문서: address로 데이터 조회 [V] | Privacy policy에 address 언급 없음 (2020 문서) | 정책 페이지 403으로 미확인 [U] | Privacy(2025-12-09)에 address 언급 없음 |
| IP 고지 | 처리함, 프록시/라우팅/DDoS 목적 [V] | 로그에 IP 포함 가능 [V] | [U] | 로그/기기 데이터에 IP 포함 [V] |
| 보관기간 | 구체 기간 없음 [V] | 없음 | [U] | "필요한 기간", 구체 기간 없음 |
| opt-out | "Incoming transactions" 토글, Basic Functionality 끄기 [V] | 없음 [V 정책] | [U] | 없음 [V 정책] |
| push 구독 | Firebase + notification-services-controller [V 패키지 존재], 서버 구독 상세 [U] | FCM token + wallets(address)를 `notifications.p.rainbow.me`에 PUT [V] | OneSignal + Firestore(address, pushId) [V] | 코드에서 push 구독 미확인 [U] |

## 1. MetaMask Mobile

- 거래내역/잔액: `@metamask/core-backend`의 `ApiPlatformClient`가 Accounts API를 호출한다. 잔액은 `/v2/accounts/{address}/balances` 등, 거래는 v1/v4 transactions. [V]
  - https://github.com/MetaMask/core/blob/main/packages/core-backend/src/api/accounts/client.ts
- 실시간: `BackendWebSocketService`로 account activity를 구독한다. 구독 키는 `eip155:0:0x...` 형태의 address이다. README 예시 [V].
  - https://github.com/MetaMask/core/blob/main/packages/core-backend/README.md
- 인증: `getBearerToken()`으로 bearer token을 붙인다. README 예시 [V]. 헤더 `x-metamask-clientproduct`로 클라이언트를 식별한다.
  - https://github.com/MetaMask/core/blob/main/packages/transaction-controller/src/api/accounts-api.ts
- 변경 이력(stale 주의): TransactionController의 incoming tx 지원은 v68.0.0에서 제거됨 (PR #9012). 그 이전에는 2024년 PR #4927로 Etherscan에서 Accounts API로 이관됐다 [V].
  - https://github.com/MetaMask/core/blob/main/packages/transaction-controller/CHANGELOG.md
  - 현재 incoming tx가 어느 컨트롤러로 옮겨갔는지는 확인 못했다 [U]. AccountActivityService 쪽으로 추정 [I].
- 내장 key: `.js.env.example`에 `MM_INFURA_PROJECT_ID`를 빌드 시 주입하라고 안내 [V]. Infura key는 RPC용이며 앱에서 추출 가능하다 [I]. 내역 API는 key 대신 bearer token이다.
  - https://github.com/MetaMask/metamask-mobile/blob/main/.js.env.example
- 개인정보:
  - Privacy notice: 기본 설정에서 wallet address를 처리한다. IP는 임시 처리하며 프록시, 지역 라우팅, DDoS 방지 목적. 보관은 "필요한 기간"이고 구체 기간 없음. push는 opt-in이며 device identifier를 opt-in 동안 보관. https://metamask.io/privacy-notice [V]
  - 알려둘 점: privacy notice는 incoming transactions를 직접 다루지 않는다.
  - Support 문서는 "Incoming transactions" 토글을 설명하며 Etherscan을 언급한다 [V]. 위 이관 이력과 맞지 않으므로 **문서가 stale일 가능성**이 높다 [I].
    https://support.metamask.io/configure/privacy/how-to-adjust-metamask-privacy-settings/
  - 토글 off 시 확인된 거래만 표시. 모바일 정확한 라벨은 미확인 [U].
- push: notification-services-controller 패키지가 존재한다 (Wallet notifications, push-services). 서버 엔드포인트와 address 전송 방식은 확인 못했다 [U].

## 2. Rainbow

- 내역: `getPlatformClient().get('/transactions/ListTransactions', { address, chainIds, currency, ... })`. 쿼리스트링에 address가 그대로 들어간다 [V].
  - src/resources/transactions/consolidatedTransactions.ts
- 상호작용 조회: addys `/{chainIds}/{address}/transactions` [V]. src/resources/addys/interactions.ts
- key: `react-native-dotenv`로 `PLATFORM_API_KEY`, `ADDYS_API_KEY`를 번들에 포함하고 `Authorization: Bearer`로 전송 [V].
  - src/resources/platform/client.ts, src/resources/addys/client.ts
  - 빌드 주입: bitrise.yml이 CI secret을 `.env`에 기록 [V].
  - `.env.example`에 `ETHERSCAN_API_KEY`, `*_MAINNET_RPC`, `RPC_PROXY_BASE_URL_*`가 있다. RPC는 자체 proxy를 쓰는 구조로 보이나 [I], 호출 코드는 확인 못했다 [U].
  - 보호 수단(rate limit, attestation)은 클라이언트 코드에서 확인 불가 [U]. 사용자별 인증이 없어 key 추출 시 남용 가능하다 [I].
- push: `PUT https://notifications.p.rainbow.me/api/v1/subscriptions` 본문에 `firebase_token`, `marketing_topics`, `wallets`를 보낸다 [V]. 즉 구독한 wallet address 목록이 서버에 올라간다.
  - src/notifications/settings/firebase.ts
- 개인정보: https://rainbow.me/en/privacy 는 2020-05-24자 문서로 보이며 address, push, 보관기간을 다루지 않는다 [V]. **stale**이다. 현행 정책이 따로 있는지 미확인 [U].

## 3. Uniswap Wallet

- 소스: `graphQLUrl = getCloudflareApiBaseUrl({flow: GraphQL, postfix: 'v1/graphql'})`. 모바일은 `ios.wallet.gateway.uniswap.org` 같은 호스트 [V].
  - packages/uniswap/src/constants/urls.ts, packages/api/src/clients/base/urls.ts
  - 내역/포트폴리오가 이 GraphQL로 가는지는 쿼리 파일을 끝까지 따라가지 않았다 [I].
- key: `packages/config/src/BaseConfig.ts`가 `process.env.TRADING_API_KEY`를 읽고, 여러 API client가 `x-api-key`로 보낸다 [V]. 주석에 "gateway prioritizes API key auth over session auth"가 있어 세션 인증 병행 [V].
  - 번들에 들어가는 경로는 일반 RN env 주입으로 추정 [I].
- 보호: gateway(Cloudflare, entry gateway) 경유. attestation 코드는 검색에 안 잡힘 [U].
- push: OneSignal 사용. 태그는 `GeneralUpdates` 등 설정값. 계정 알림은 Firestore에 `address + pushId`로 metadata를 저장 [V]. 알림 설정 off면 쓰지 않음.
  - apps/mobile/src/features/notifications/*, apps/mobile/src/features/firebase/firebaseDataSaga.ts
- 개인정보: support.uniswap.org 페이지가 WebFetch에서 403이었다. 내용 미확인 [U].

## 4. Rabby Mobile (RabbyHub/rabby-mobile)

- 소스: `INITIAL_OPENAPI_URL = https://app-api.rabby.io`. `@rabby-wallet/rabby-api`의 `OpenApiService` 사용 [V].
  - apps/mobile/src/constant/index.ts, apps/mobile/src/core/request.ts
  - 내역 endpoint 경로는 외부 패키지라 확인 못했다 [U].
- 보호: `SignApiPlugin`이 요청마다 `x-api-ts`, `x-api-nonce`, `x-api-ver`, `x-api-sign`을 붙인다. 서명 함수는 `@rabby-wallet/rabby-sign-bvm` [V]. 서명 로직이 앱에 있으므로 추출 가능성은 있다 [I].
- `X-API-Key`는 `openApiStore`에 저장된 값이며 uuid를 설치 시 생성하는 코드가 있다 [V]. 공유 key가 아니다.
- push: package.json에 `push-notification-ios`가 있으나 address 구독 코드는 확인 못했다 [U].
- 개인정보: https://rabby.io/docs/privacy (2025-12-09). address 언급 없음, IP는 로그/보안/분석용, 보관기간은 "필요한 기간", AWS 호스팅 [V]. wallet 조회 데이터 처리가 이 정책에 포함되는지는 불명 [U].

## 우리 설계에 주는 시사점 [I]

- 업계 관행은 "앱 -> 벤더 백엔드 -> indexer" 이다. 클라이언트에 서드파티 key를 직접 넣는 구조는 이번 조사에서 발견되지 않았다.
- 공유 key를 번들에 넣는 Rainbow/Uniswap 방식은 추출 후 남용 위험이 있다. MetaMask(bearer token)나 Rabby(요청 서명)가 한 단계 낫다. 둘 다 완전한 보호는 아니다.
- 고지 수준은 낮다. address 전송을 명시한 곳은 MetaMask support 문서가 유일하고, 그마저 stale 가능성이 있다. 명시적 고지와 토글을 두면 차별점이 된다.
- push 구독은 address(또는 wallets 목록)를 서버에 등록하는 구조가 기본이다 (Rainbow, Uniswap 확인).

## 한계

- GitHub code search가 rate limit에 걸려 MetaMask Mobile 앱 repo 내부(설정 토글 라벨, 컨트롤러 초기화)는 직접 확인하지 못했다.
- Uniswap 개인정보 정책은 403으로 못 읽었다.
- 벤더 백엔드가 내부적으로 쓰는 indexer/provider는 전부 미확인이다.

## 출처

- https://github.com/MetaMask/core/tree/main/packages/core-backend
- https://github.com/MetaMask/core/blob/main/packages/transaction-controller/src/api/accounts-api.ts
- https://github.com/MetaMask/core/blob/main/packages/transaction-controller/CHANGELOG.md
- https://github.com/MetaMask/metamask-mobile/blob/main/.js.env.example
- https://metamask.io/privacy-notice
- https://support.metamask.io/configure/privacy/how-to-adjust-metamask-privacy-settings/
- https://github.com/rainbow-me/rainbow (src/resources/platform, src/resources/addys, src/resources/transactions, src/notifications/settings/firebase.ts, bitrise.yml, .env.example)
- https://rainbow.me/en/privacy
- https://github.com/Uniswap/interface (packages/uniswap/src/constants/urls.ts, packages/config/src/BaseConfig.ts, packages/api/src/clients/base/urls.ts, apps/mobile/src/features/notifications, apps/mobile/src/features/firebase)
- https://github.com/RabbyHub/rabby-mobile (apps/mobile/src/core/request.ts, apps/mobile/src/constant/index.ts, apps/mobile/src/core/storage/openapiStore.ts)
- https://rabby.io/docs/privacy
