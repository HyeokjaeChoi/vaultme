# Self-custody 모바일 지갑의 히스토리/잔액 조회 방식 및 프라이버시 공시 조사

- 조사일: 2026-10-11
- 범위: Trust Wallet, Coinbase Wallet (Base app), Phantom, Zerion, OKX Wallet
- 방법: 공식 프라이버시 정책, 공식 개발자 문서, 웹 검색 결과 (웹 검색 요약은 "검색 요약" 으로 표시)
- 표기: **[검증]** 공식 문서/정책 원문 확인 (fetch 요약 포함), **[추정]** 정황 근거, **[미검증]** 확인 못함

---

## 핵심 요약

- 5개 지갑 모두 히스토리/잔액 조회의 실제 백엔드 구조를 공식적으로 밝힌 자료는 없다. 확인된 것은 정책 문구와 개발자 문서 수준이다.
- 제3자 노드/인프라 제공자를 이름으로 밝힌 곳은 Zerion이 유일하다 (QuickNode, Alchemy, Triton One 등).
- Zerion은 IP를 hash 처리하고 로그를 최대 14일 보관한다고 밝힌다. 다만 "best effort" 문구다.
- Phantom은 IP를 "자동 수집, 임시 저장"하고 제3자에게 전달할 수 있다고 밝힌다. 블로그의 "privacy proxy" 주장은 확인하지 못했다.
- 지갑 주소 기반 입금 알림 구독을 정책에 명시한 곳은 Zerion뿐이다 (anonymised push token + 구독 주소 저장).
- 보관 기간(retention)은 5개 모두 구체적 기간을 밝히지 않았다. Zerion의 IP 14일이 유일한 예외다.
- 공시된 정책의 시점이 대부분 2025년 중반~후반이다. 1년 가까이 지났으므로 재확인이 필요하다.

---

## 비교표

| 항목 | Trust Wallet | Coinbase Wallet / Base app | Phantom | Zerion | OKX Wallet |
|---|---|---|---|---|---|
| 1. 히스토리/잔액 소스 | [검증] 개발자 문서상 light client, 원격 노드 조회. 자체 백엔드 여부는 [미검증]. 특정 제3자 제공자 미확인 | [추정] CDP(Coinbase Developer Platform) Data/Address History API 계열 사용 가능성. Base 앱이 실제로 쓰는지는 [미검증] | [미검증] 자체 백엔드 여부 확인 못함. Helius 같은 제3자 데이터 계층이 개발자에게 제공된다는 사실만 확인 | [검증] 정책상 RPC/인프라 제공자 다수 명시. 자사 API(api.zerion.io/v1) 사용은 [추정]이 강하나 공식 문서 직접 fetch는 못함 | [미검증] 공식 Web3 wallet API 문서 확인 못함. OKX DEX SDK 문서상 web3.okx.com 기반 API (제3자 미러 문서) |
| 1-b. 제3자 제공자 명시 | 정책/문서에서 명시 안 됨 | 정책에 명시 없음 ("unnamed" 분석/벤더) | 정책에 명시 없음. RPC/indexing 언급 없음 | QuickNode, Alchemy, Triton One, public nodes, 0x, 1inch, Hashflow 등 [검증] | Au10tix, Jumio, Sumsub (신원확인, 개발자 API용) [검증]. 잔액/히스토리 제공자는 미명시 |
| 2-a. 지갑 주소 수집 공시 | 공시됨. public wallet address를 처리한다고 명시 [검증] | 공시됨. 지갑 주소, Basename 직접 수집 [검증] | 공시됨. public wallet address 수집, 이메일/username과 연결 가능 [검증] | 공시됨. 연결 시 수집. 연락처와 분리 주장 [검증] | 지갑 주소 자체는 명시 안 됨. "connected wallets의 balances" 항목만 있음 [검증] |
| 2-b. IP 수집 | "transient 처리, 미보관, 연결 불가" [검증]. 단 "store nor access" 와 "briefly process" 문구가 상충 | 자동 수집. 분석 제공자도 IP 제공 [검증] | 자동 수집, 임시 저장, 보안/위치추정/제재 준수 목적으로 제3자 전달 가능 [검증] | 해시 처리, 로그 최대 14일 ("do our best") [검증] | 수집 대상으로 명시 [검증] |
| 2-c. 디바이스 식별자 | 모델, OS, 앱 설치 정보, 브라우저, 언어 등 [검증] | 장치/브라우저 정보, 네트워크 정보 [검증] | 고유 디바이스 ID, 디바이스명 등 [검증] | 디바이스 정보, unique device ID [검증] | device fingerprint, MAC 번호, 고유 ID, 세션 정보 [검증] |
| 2-d. 보관 기간 | 명시 없음 [검증] | 명시 없음 [검증] | 명시 없음 ("as long as necessary") [검증] | IP 로그 최대 14일 (best effort) [검증]. 나머지 명시 없음 | 명시 없음 (AML 기록은 추가 보관) [검증] |
| 2-e. 옵트아웃 | 푸시 끄기, 권리 요청 폼, 생체인증 해제 등 [검증] | 마케팅 이메일 해지, 동의 철회, 처리 반대 (privacy@base.org) [검증] | 분석(analytics) 끄기 가능. 끄면 지원/사기방지 기능 축소 가능 [검증] | 설정에서 "Share app usage analytics" 끄기, 커스텀 RPC 사용, CCPA 쿠키 관리 [검증] | 마케팅 이메일 해지, 동의 철회(메일 요청). 서비스 메시지는 해지 불가 [검증] |
| 3. 주소 기반 입금 알림 | 정책에 구독/알림 문구 없음 [검증]. 지원 문서상 push는 주로 보안 알림, 내부 tx 등은 알림 안 감 [검증] | 소비자용 입금 알림 설정 미확인 [미검증]. CDP webhook으로 개발자가 구현 가능 (ERC-20 only, Base, 최대 100주소, API-only) [검증] | 정책에 구독 문구 없음 [검증]. 앱 내 알림 설정은 있으나 주소별 세부는 [미검증] | 명시됨. 디바이스 push token + 구독 지갑 주소를 서버에 저장 [검증]. 끄면 처리 중단 [검증] | 정책에 push/주소 구독 문구 없음 [검증] |
| 4. API 키 보호/프록시 | Agent SDK 키는 developer portal에서 관리 [검증]. 앱 측 키 보관 방식은 [미검증] | 개발자용 CDP 키 체계 존재 [검증]. 앱 측 proxy 여부 [미검증] | [미검증] | Zerion API는 API key 사용(3rd-party 문서 기준 Basic auth) [검증 제한]. 앱 측 보호 방식은 [미검증] | 개발자 API는 HMAC 서명 + key/secret/passphrase [검증 제한, 제3자 미러]. 앱 측 보호는 [미검증] |
| 정책 시점 | 2025-10-22 | 2025-07-01 (Base 정책) | 2026-07-07 | 2025-11-26 | 2025-08-22 |
| 주의 | 정책과 실제 동작 차이 가능 | Coinbase 본 정책은 2차 요약만 확인 | 블로그 privacy proxy 주장 미확인 | 블로그는 2024-02-16 (stale) | 공식 wallet API 문서 미확인 |

---

## 지갑별 상세

### 1. Trust Wallet

- **히스토리 소스**
  - [검증] 개발자 문서는 지갑이 light client로서 원격 light/full node에서 잔액과 tx를 조회한다고 설명한다. 백엔드는 블록의 tx를 인덱싱해 tx 목록을 만들고 입출금 알림을 보낸다. 체인 통합 요구사항이며 특정 제공자는 안 나온다.
  - [미검증] 실제 consumer 앱이 자체 백엔드를 쓰는지 여부.
  - 2023년 Waltio 도움말은 "사용자용 API 없음"이라고 했으나 오래된 자료다 (stale).
- **프라이버시 공시**
  - [검증] public wallet address, tx 이력(timestamp, 주소, 금액)을 처리한다고 명시.
  - [검증] IP는 "transient"로 처리하고 미보관. 다만 "store nor access" 와 "briefly process" 문구가 상충한다.
  - [검증] 보관 기간, 제3자 제공자 명시 없음.
- **푸시 알림**
  - [검증] 정책에 주소 구독 문구 없음.
  - [검증] 지원 문서: push는 주로 보안 위협 알림. 내부 tx는 알림 안 뜰 수 있음.
- **API 키/프록시**
  - [검증] Agent SDK, Trust Wallet API(tws.trustwallet.com, HMAC-SHA256)는 개발자 키 기반.
  - [미검증] 앱 내 키 보호 여부.

### 2. Coinbase Wallet (Base app)

- **히스토리 소스**
  - [검증] CDP는 Transaction History, Balance History, Token Balances, Address History API를 제공한다 (제품 페이지 및 개발자 문서 검색 요약).
  - [추정] Base 앱이 이를 쓸 가능성. 확인 불가.
- **프라이버시 공시 (Base 정책, 2025-07-01)**
  - [검증] 지갑 주소, Basename을 서비스 제공 과정에서 직접 수집.
  - [검증] IP, 브라우저/장치 정보 자동 수집. 분석 제공자가 IP와 fingerprint 제공 가능.
  - [검증] 공개 블록체인 데이터(tx timestamp, 주소, 금액 등)를 분석한다고 명시.
  - [검증] 보관 기간, 제3자 제공자 명시 없음.
  - [2차 요약] Coinbase 본 정책: 지갑 주소와 integration 정보 수집, 블록체인 분석 업체 공유 가능. 공식 원문 미확인.
- **푸시 알림**
  - [미검증] 소비자용 입금 알림 설정은 못 찾음.
  - [검증] CDP webhook: multi-address 구독, 최대 100 EVM 주소, Base의 ERC-20만, native ETH 미지원, API-only, at-least-once 전달.
  - [검증] Sign in with Coinbase 알림: 앱이 권한 있는 계정만 대상. 알림 URL을 비밀로 취급하라고 함.
- **API 키/프록시**
  - [검증] 개발자 측은 CDP 키/콜백 서명(CB-SIGNATURE) 검증 체계.
  - [미검증] 앱 측 proxy 여부.

### 3. Phantom

- **히스토리 소스**
  - [미검증] 자체 백엔드 여부 확인 못함.
  - [검색 요약] Helius는 Wallet API, getTransactionsForAddress, DAS API 등을 제공하며 Phantom 프론트엔드와 함께 쓰이는 것으로 보인다. 그러나 Phantom 자체 구조와의 연결은 확인되지 않았다.
- **프라이버시 공시 (정책, 2026-07-07)**
  - [검증] public wallet address와 public blockchain data 수집. 이메일/username과 연결 가능(지원, 사기방지 목적).
  - [검증] IP 자동 수집, 임시 저장. 보안 공격 방어, 국가/주 단위 위치 추정, 제재 준수 목적으로 제3자 전달 가능. 마케팅 목적 사용 안 함이라고 명시.
  - [검증] 디바이스 고유 식별자, 하드웨어 모델 수집.
  - [검증] 보관 기간 명시 없음. 제공자는 카테고리만 언급 (RPC/indexing 언급 없음).
  - [미검증] 블로그의 "privacy proxy가 IP를 RPC 제공자에게서 가린다" 주장. 공식 블로그 URL은 phantom.com에서 404였다. 검색 스니펫만 확인. 정책 본문에는 proxy 언급 없음 → 확인 필요.
- **푸시 알림**
  - [검증] 정책: 앱 내에서 알림 설정 변경 가능. 주소 구독 문구 없음.
  - [미검증] 입금 알림의 주소별 구독 방식. 검색으로는 확인 못함.
- **API 키/프록시**
  - [미검증] 전부.

### 4. Zerion

- **히스토리 소스**
  - [검증] 개인정보 블로그: 기본 RPC 제공자를 커스텀 노드로 바꿀 수 있다 → 기본값은 제3자 RPC. 기본 제공자 목록은 블로그에 없음.
  - [검증] 정책: QuickNode, Alchemy, Triton One, public nodes 등 RPC 제공자 명시.
  - [검증] 정책: 스왑용 0x, 1inch, Hashflow 등에 의도한 tx 정보 공유.
  - [추정] Zerion API(api.zerion.io/v1, wallets/{address}/portfolio, positions, transactions) 를 앱이 사용. 3rd-party 문서 기준. 공식 developers.zerion.io는 직접 fetch 실패.
- **프라이버시 공시 (정책, 2025-11-26)**
  - [검증] 연결 시 public wallet address 수집. 연락처와는 명시적으로 연결하지 않음(함께 제공하는 경우 제외).
  - [검증] IP는 가능한 경우 hash 처리, 로그 최대 14일 ("do our best" 표현으로 보장 아님).
  - [검증] 디바이스 정보, unique device ID 수집.
  - [검증] 분석 도구(Mirror 페이지 등)가 IP 자동 수집.
  - [검증] 보관 기간: IP 로그 14일 외 명시 없음.
  - [검증] 옵트아웃: 분석 끄기, 푸시 끄기, 커스텀 RPC, CCPA 쿠키 관리.
- **푸시 알림 (가장 구체적인 공시)**
  - [검증] 디바이스 push token(익명화)과 해당 디바이스에서 구독한 지갑 주소를 Zerion이 저장.
  - [검증] 앱 알림은 동의 시에만 수집. 같은 디바이스의 모든 지갑이 같은 push token 공유.
  - [검증] 블로그(2024-02-16): 포트폴리오와 watchlist의 모든 주소에 대해 push token 생성. 알림을 끄면 처리 중단.
- **API 키/프록시**
  - [검증 제한] 3rd-party 문서상 Basic auth API key.
  - [미검증] 앱 측 키 보호/프록시 여부. 블로그는 API key를 다루지 않음.

### 5. OKX Wallet

- **히스토리 소스**
  - [미검증] 공식 Web3 wallet API 문서 확인 못함.
  - [검증 제한] OKX DEX SDK 제3자 문서: web3.okx.com 기본 URL, HMAC-SHA256 서명, API key/secret/passphrase/project ID. 개발자용 키 체계.
  - [미검증] 앱이 이 API를 직접 쓰는지, 자체 백엔드를 거치는지.
  - 주의: OKX V5 REST(/api/v5/account 등)는 중앙화 거래소용이며 온체인 지갑과 무관.
- **프라이버시 공시 (Web3 Privacy Notice, 2025-08-22)**
  - [검증] IP, 장치 fingerprint, MAC 번호, geolocation, 고유 장치 ID, 세션 정보를 "other identifiers"로 수집.
  - [검증] 거래/잔액 데이터는 "commercial information"으로 수집. 연결된 지갑의 balances 포함.
  - [검증] 지갑 주소 자체는 명시 안 됨 (주소라는 단어 미확인).
  - [검증] 보관 기간: 명시 없음. 계정 종료 후에도 법적 의무 기간 보관.
  - [검증] 명시된 제공자: 신원확인 Au10tix, Jumio, Sumsub (개발자 API 접근용). 나머지는 "unnamed".
  - [검증] 지갑 비밀번호, MPC key shard, seed phrase는 수집하지 않는다고 명시.
- **푸시 알림**
  - [검증] 정책에 push 언급 없음.
- **옵트아웃**
  - [검증] 마케팅 이메일 해지 가능. 서비스 메시지(설문, 정책 변경)는 해지 불가. 동의 철회는 이메일 요청("DATA INQUIRY REQUEST"). 쿠키는 브라우저에서 차단 가능.
- **API 키/프록시**
  - [검증 제한] 개발자 API는 키/서명 기반. 앱 측 보호는 [미검증].

---

## 검증 한계와 stale 표시

- **Stale**
  - Zerion 블로그 Privacy by Design: 2024-02-16. 정책 본문(2025-11-26)과 충돌 여부 확인 필요.
  - Trust Wallet Waltio 도움말: 2023년. API 없음 주장은 현재와 다를 수 있음.
  - Base 정책: 2025-07-01. Coinbase 본 정책: 2차 요약만 확인.
  - OKX 정책: 2025-08-22.
- **불일치**
  - Trust Wallet: IP "미보관" vs "임시 처리". 정책 내부 모순 가능.
  - Phantom: 블로그 "privacy proxy" 주장 vs 정책에 proxy 언급 없음.
- **미확인 핵심 질문**
  - 5개 지갑 모두 히스토리 조회가 자체 백엔드를 거치는지, 제3자 API를 직접 호출하는지 확인 못함. 앱 트래픽(네트워크 캡처) 분석이 필요하다.
  - 주소 입금 알림의 실제 구독 방식(주소를 서버에 등록하는지)은 Zerion을 제외하고 확인 못함.
  - API 키가 앱 번들에 들어 있는지, proxy 뒤에 있는지는 5개 모두 미확인.
- **방법적 한계**
  - 일부 정책은 WebFetch 요약 결과이므로 원문 문장과 다를 수 있다.
  - Coinbase 본 정책은 conductatlas.com 등 3rd-party 요약만 확인.
  - Phantom 블로그는 404로 원문 미확인.

---

## 출처

- Trust Wallet 정책: https://trustwallet.com/privacy-policy
- Trust Wallet RPC 요구사항 (개발자 문서): https://developer.trustwallet.com/wallet-core/rpc-requirements
- Trust Wallet Agent SDK: https://developer.trustwallet.com/developer/agent-sdk
- Trust Wallet 지원 (내부 tx 알림): https://support.trustwallet.com/support/solutions/articles/67000734963
- Trust Wallet 보안 개요: https://trustwallet.com/blog/security/complete-overview-of-trust-wallet-security
- Trust Wallet Waltio 도움말 (2023, stale): https://help.waltio.com/en/articles/5542855-trustwallet
- Base 정책: https://docs.base.org/privacy-policy
- Coinbase 정책 2차 요약: https://conductatlas.com/platform/coinbase/coinbase-privacy-policy/
- CDP Onchain Data: https://docs.cdp.coinbase.com/onchain-data/docs/welcome
- CDP multi-address webhook: https://docs.cdp.coinbase.com/webhooks/onchain-activity/multi-address
- Phantom 정책: https://phantom.com/privacy
- Phantom 블로그 (404, 검색 스니펫만): https://phantom.com/learn/blog/how-phantom-protects-privacy
- Helius 문서 (Phantom 연계 추정): https://docs.helius.dev/docs/wallet-api/history
- Zerion 정책: https://www.zerion.io/privacy-policy
- Zerion 개인정보 블로그 (2024-02-16, stale): https://zerion.io/blog/privacy-by-design-at-zerion/
- Zerion API (3rd-party 요약): https://developers.zerion.io/introduction.md
- OKX Web3 Privacy Notice: https://www.okx.com/help/okx-web3-ecosystem-privacy-policy
- OKX DEX SDK 문서 (3rd-party 미러): https://www.mintlify.com/okx/okx-dex-sdk/core-concepts/authentication
- OKX 개발자 포털 (공식 확인 필요): https://web3.okx.com

---

## 다음 단계 제안

1. 각 앱 네트워크 트래픽 캡처로 히스토리 호출 대상 도메인 확인 (자체 백엔드 vs 제3자).
2. 입금 알림 등록 요청 본문 확인 (주소 전송 여부).
3. Phantom 공식 블로그와 OKX 공식 wallet API 문서 원문 재확인.
4. 정책 시점이 오래된 항목은 분기별 재확인.
