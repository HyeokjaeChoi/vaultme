# 트랜잭션 히스토리 API 제공자 비교 (Moralis / GoldRush / Blockscout / Ankr)

- 조사일: 2026-10-11
- 목적: VaultMe v1 (EVM testnet 1개, native coin + ERC-20 테스트 토큰 1개) 에서 모바일 앱이 provider를 직접 호출해 sent/received 히스토리 목록을 만드는 방식의 적합성 판단.
- 범위: 웹 조사만 수행. 코드 작성 없음.

## 표기 규칙

- [확인]: 공식 문서에서 직접 확인한 내용 (URL 명시).
- [부분확인]: 검색 결과 스니펫이나 2차 자료에서만 확인. 공식 원문 fetch 실패.
- [추정]: 문서 설명에서 논리적으로 유추한 내용.
- [미확인]: 찾지 못함. 실제 테스트 필요.
- 문서 fetch 중 다수가 404 / 403 으로 실패했다. 아래 "조사 한계" 참조.

## 요약

- 4개 모두 "주소 기준 거래 목록" 엔드포인트가 있다. 그러나 incoming native, internal, ERC-20을 한 응답에서 확실히 얻는지는 provider마다 다르고, 일부는 미확인.
- Testnet 지원은 4개 모두 Sepolia 계열에 대해 공식 근거를 충분히 찾지 못했다. 실측 필요.
- 모바일 직접 호출은 4개 모두 "API key가 앱 번들에 들어가면 노출된다"는 제약이 있다. Blockscout PRO API, Moralis, GoldRush 모두 key 기반. Ankr 은 Public plan(무키) 이 존재하나 Advanced API 의 무키 사용 가능 범위는 미확인.
- 실무 권장: 모바일이 provider를 직접 치는 구조는 key 노출 위험이 크다. 얇은 프록시(서버 경유) 또는 provider 무키 경로 중 하나를 골라야 한다. 프록시는 push 서버와 분리된 read-only 프록시로 두는 방안을 검토.
- 주의: "서버는 history source가 아니다" 라는 전제와 충돌한다. 프록시를 두면 서버가 history 경로에 들어간다. 이 점을 설계 시 명시해야 한다.

## 비교 표

| 항목 | Moralis (Wallet API) | GoldRush (transactions_v3) | Blockscout (REST v2) | Ankr (Advanced API) |
|---|---|---|---|---|
| 엔드포인트 | `GET https://deep-index.moralis.io/api/v2.2/wallets/{address}/history?chain=...` [확인] | `GET .../transactions_v3/...` 계열 "Get paginated transactions for address (v3)" [부분확인] | `GET /{chain_id}/api/v2/addresses/{address}/transactions`, `/internal-transactions`, `/token-transfers` [확인] | JSON-RPC `ankr_getTransactionsByAddress`, `ankr_getTokenTransfers` [확인: 문서 설명] |
| incoming native | 응답 `native_transfers` 배열 존재 [확인]. 수신 포함 여부는 예시가 비어 있어 [추정] | 주소가 from/to인 tx 반환 [부분확인]. native 수신이 tx 단위로 나오는지 [미확인] | `transactions` 에 수신 tx 포함 [추정, 표준 explorer 구조] | "sender 또는 recipient" 로 명시 [확인]. native 수신 포함 [추정] |
| internal (contract) native | intro에 "internal transactions 포함" 언급 [확인]. 별도 필드 설명 없음 [미확인] | [미확인] | `/internal-transactions` 별도 엔드포인트 [확인] | 명시 없음 [미확인] |
| ERC-20 transfers | `erc20_transfers` 필드 [확인] | 로그 디코딩 방식 [부분확인]. 별도 transfer 엔드포인트 여부 [미확인] | `/token-transfers` [확인] | `ankr_getTokenTransfers` [확인] |
| 정렬 / 페이지네이션 | `cursor` 는 예시 응답에만 등장. 요청 파라미터로는 문서화 안 됨 [확인: 미문서화] | paginated (page 방식으로 추정) [부분확인] | keyset. `next_page_params` (block_number, index, items_count) [확인] | `pageSize` (기본 100, 최대 10000), `pageToken` [확인] |
| Testnet 지원 (history API 기준) | 문서에 testnet 언급 없음. `chain=eth` 예시만 [확인: 미언급] | 릴리스 노트에 Arbitrum Sepolia, Base Sepolia, OP Sepolia 등 언급 [부분확인]. Sepolia 최신 지원 여부 [미확인] | 인스턴스별 존재. Sepolia 인스턴스 존재 여부 [미확인] | 문서 미확인. "7 testnets" 는 3자 리스팅 주장 [미확인] |
| 무료 티어 | 문서 페이지에 free 수치 없음 [확인]. 3자 자료는 40,000 CU/day [부분확인, 2026 리뷰 기준이나 2차] | 14일 trial: $0, 4 RPS, 25,000 credits [부분확인: pricing 검색 결과]. FAQ 는 100,000 req/month 로 불일치 | Free: 5 RPS, 100K credits/day [부분확인: 검색 결과 요약] | Public plan: 무료, 무로그인, 20 RPS, 40+ chains [부분확인]. Freemium 200M credits/mo [부분확인] |
| 유료 가격 | Starter $149 / Pro $249 / Business $749 (월). Overage $11.25 / $5 / $4 per 1M CU [확인: pricing 페이지 fetch] | Professional $250/mo, 50 RPS, 300K credits [부분확인]. Vibe Coding $10/mo [부분확인] | Builder $49 / Pro $199 / Business $999 (월) [부분확인] | PAYG: 700 credits = $0.00007 per request [부분확인] |
| 모바일 직접 호출 | key 가 앱에 있으면 노출. 서버 프록시 권장 [확인: 보안 가이드 및 포럼 답변, 2차 포함] | 명시 자료 미확인. key per key+IP rate limit [부분확인] | 명시 자료 없음. key 필요 (PRO) [확인] | Public plan 무키 가능 여부 [미확인]. 도메인/IP whitelist 는 유료 기능이라는 2차 주장 있음 (상충) |
| 신선도 / confirmation / reorg | 문서 미언급 [미확인] | 미확인 | 미확인. 인스턴스 인덱싱 지연 가능 [추정] | 미확인 |
| Lock-in / deprecation | 명시된 deprecation 없음 [미확인 포함]. 응답 스키마 변경 가능성은 [추정] | Covalent 에서 GoldRush 로 문서 도메인 이동. 체인 제거 기록 있음 [부분확인] | per-instance 엔드포인트 deprecation 예고 "will be deprecated soon in favor of PRO API" [확인] | 미확인 |

## 제공자별 상세

### 1. Moralis (Wallet API / wallet history)

확인된 사실
- Wallet history 엔드포인트: `https://deep-index.moralis.io/api/v2.2/wallets/{address}/history?chain=eth` [확인: https://docs.moralis.com/get-started/tutorials/data-api/wallets-and-accounts/get-full-wallet-transaction-history-eoa-and-smart-accounts]
- 응답에 `native_transfers`, `erc20_transfers`, `nft_transfers` 필드 [확인: 같은 URL]
- 요청 파라미터로 문서화된 것은 `chain` 뿐. `cursor`, `limit`, `from_block`, `to_block`, `order` 는 요청 파라미터로 설명되지 않음 [확인: 같은 URL]
- 실제 Wallet API 레퍼런스 페이지 중 history 엔드포인트 항목은 fetch 시 404. Wallet API overview 는 `/data-api/evm/wallet/overview` [확인: https://docs.moralis.com/web3-data-api/evm/reference]
- Moralis 로드맵 항목에서 per-type 엔드포인트(native / ERC-20 / NFT)를 별도로 안내 [부분확인: https://roadmap.moralis.io/b/feature-requests/get-full-wallet-history]
- 체인 수: "30+ supported chains" (EVM API 개요) [확인: https://docs.moralis.com/web3-data-api/evm/reference]
- Pricing (docs 페이지 기준, 월 결제): Starter $149 (2M CU, 40 RPS), Pro $249 (100M CU, 80 RPS), Business $749 (500M CU, 200 RPS). Overage 는 1M CU 당 $11.25 / $5 / $4 [확인: https://docs.moralis.com/get-started/pricing]
- 무료 플랜 수치: 공식 pricing 페이지 fetch 에서는 확인 안 됨. 3자 리뷰에서 40,000 CU/day 주장 [부분확인]. 2023-04 무료 플랜 제한 변경 공지 존재 [부분확인: https://api-help.moralis.io/en/articles/64090-new-limits-on-the-free-plan-as-from-15th-april-2023]. 공식 값 재확인 필요.
- 보안: API key 는 클라이언트 코드에 두지 말 것. 서버 측 환경변수 보관 권장 [확인: https://docs.moralis.com/web3-data-api/security-guidelines, 검색 스니펫 기반 부분확인]

추론
- `native_transfers` 에 incoming 이 포함되는지는 예시로 확인 불가. 실측 필요.
- internal transactions 는 intro 문장만 있음. 별도 필드 여부 [미확인].
- 2024 블로그 샘플은 오래된 자료. 현재 스키마와 다를 수 있음 (stale 가능).

### 2. GoldRush (구 Covalent) — transactions_v3 / transfers

확인된 사실
- Transactions API 에 "Get paginated transactions for address (v3)" 항목 존재. 주소 관련 tx 와 디코드된 log event 를 페이지 단위로 반환 [부분확인: 검색 스니펫. 공식 페이지 fetch 404]
- 체인 식별자는 chain name 또는 chain tag 사용 [부분확인: lens/linea 문서 사례]
- Testnet 관련: Q4 2023 릴리스 노트에 Arbitrum Sepolia, Base Sepolia, Ethereum Holesky, OP Sepolia 추가 [부분확인: https://goldrush.dev/blog/q4-2023-product-update/]. 이후 changelog 에서 일부 체인 제거 기록 있음 [부분확인: https://goldrush.dev/docs/unified-api/changelog]. 즉 "예전에 추가" 와 "현재 지원" 은 다름.
- Pricing: 14일 trial $0, 4 RPS, 25,000 credits. Testnet 도 같은 credit 을 소모 [부분확인: https://goldrush.dev/docs/unified-api/pricing 검색 스니펫]. FAQ 에는 "100,000 requests/month" 로 다른 수치 [부분확인: https://goldrush.dev/docs/faq]. 불일치. 대시보드 확인 필요.
- Professional $250/mo, 50 RPS, 300K credits [부분확인: pricing 검색 결과]

미확인
- native 수신 / internal tx 가 transactions_v3 응답에 어떻게 나오는지.
- 현재 Sepolia 계열 지원 목록.
- 모바일 호출 가이드. API key 는 per key + IP 단위 rate limit 이라는 설명만 있음 [부분확인].

추론
- transactions 엔드포인트가 주소 관련 tx 를 반환하면 incoming native tx 도 포함될 것으로 보인다. 그러나 tx 단위 응답이라 value 해석 로직이 필요.
- 로그 디코딩 기반이라 ERC-20 은 log 기반으로 나올 가능성이 높음 [추정].

### 3. Blockscout (open-source explorer API)

확인된 사실
- 주소 기준 엔드포인트:
  - `GET /{chain_id}/api/v2/addresses/{address}/transactions`
  - `GET /{chain_id}/api/v2/addresses/{address}/internal-transactions`
  - `GET /{chain_id}/api/v2/addresses/{address}/token-transfers`
  [확인: https://docs.blockscout.com/best-practices.md]
- 페이지네이션: `next_page_params` (block_number, index, items_count 등) keyset 방식 [확인: 같은 URL]
- Token-transfer 응답 항목은 `TokenTransfer` 스키마 [확인: https://docs.blockscout.com/api-reference/get-token-transfers.md]
- Deprecation 공지: "Per instance endpoints will be deprecated soon in favor of PRO API endpoints." [확인: https://docs.blockscout.com/api-reference/get-token-transfers.md]
- PRO API 는 `https://api.blockscout.com/{chain_id}/api/v2/...` 형태, `apikey` query parameter 사용. 키 하나로 모든 체인 사용 [확인: https://docs.blockscout.com/best-practices.md]
- 호출당 기본 20 credits. 응답 헤더 `x-credits-remaining`, `x-ratelimit-limit`, `x-ratelimit-remaining` [확인: 같은 URL]
- Pricing (검색 결과 요약): Free 5 RPS / 100K credits per day / $0. Builder 15 RPS / 100M / $49. Pro 30 RPS / 500M / $199. Business 50 RPS / 3B / $999 [부분확인: https://docs.blockscout.com/rate-limits.md 검색 스니펫. 공식 페이지 fetch 404]
- 무료 PRO 키 발급 가능 [부분확인]. API key 는 Free 포함 모든 tier 에 필요하다는 요약 [부분확인]

미확인 / 상충
- 공개 인스턴스(예: eth.blockscout.com) 의 무키 사용 가능 여부. 공식 문서에서 명시 못 찾음 [미확인]. 사용자 요청의 "public instance 무키 여부 검증" 항목은 "미확인" 으로 남김. 실측 필요.
- "Blockscout 이 2026-07-01 에 모든 API 트래픽을 keyed PRO API 로 이전" 이라는 3자 리뷰 주장 있음 [부분확인, 2차. 공식 확인 안 됨].
- Sepolia 인스턴스 존재 및 해당 인스턴스의 API 가용성 [미확인].

추론
- internal-transactions 엔드포인트가 분리되어 있어 contract internal native 를 별도로 얻을 수 있다. 가장 명확한 구조.
- 공개 인스턴스 의존 시 deprecation 영향 큼. PRO API 로 가면 key 가 필요하고, 모바일 노출 문제가 다시 생김.

### 4. Ankr Advanced API

확인된 사실
- `ankr_getTransactionsByAddress`: 지정 지갑이 sender 또는 recipient 인 트랜잭션 반환. includeLogs 옵션. 블록/타임스탬프 범위 필터. 페이지네이션 `pageSize`, `pageToken` [확인: https://www.ankr.com/docs/api-reference/aapi/ankr-get-transactions-by-address/ 검색 스니펫. 공식 페이지 fetch 403]
- `ankr_getTokenTransfers`: 지정 지갑이 sender 또는 recipient 인 ERC-20 transfer 이벤트 반환. pageSize 기본 100, 최대 10000 [확인: 검색 스니펫, https://www.ankr.com/docs/api-reference/aapi/ankr-get-token-transfers/ fetch 404]
- 비용: 두 메서드 모두 700 credits / call. PAYG 기준 $0.00007 / request [부분확인]
- JSON-RPC 에러는 HTTP 200 + body error. 잘못된 envelope 은 400 [부분확인]
- Public plan: 무료, 로그인 불필요, 20 RPS, 40+ chains [부분확인: https://www.ankr.com/docs/rpc-service/pricing-plans 검색 스니펫]

미확인
- 지원 체인 목록 및 testnet 지원 여부. 공식 목록 미확인. Ankr.js SDK 문서는 mainnet 위주 예시 [부분확인].
- Advanced API 가 Public plan 무키로 호출 가능한지. [미확인]
- 포럼 보고: Fuji / Mumbai 에서 `ankr_getAccountBalance` 는 native 만 반환, `ankr_getCurrencies` 는 null. ERC-20 testnet 지원 의문. 답변 없음 [부분확인: https://api-docs.ankr.com/discuss/661446924c4527006d7e12d3]. 이는 testnet 에서 토큰 조회가 제한될 가능성을 시사한다.
- 도메인 / IP whitelist 기능. Ankr 문서는 whitelist 기능 존재를 설명하나 무료 플랜 포함 여부는 상충 [부분확인].
- CORS 헤더 여부 [미확인].

추론
- "sender 또는 recipient" 설명상 incoming native 가 포함될 가능성이 높다 [추정].
- internal transaction 은 명시 없음. 포함 여부 [미확인].

## 질문별 답변

### Q1. incoming native / internal native / ERC-20 조회 가능 여부, pagination / 정렬

| Provider | incoming native | internal native | ERC-20 | Pagination |
|---|---|---|---|---|
| Moralis | native_transfers 필드 [확인], 수신 여부 [추정] | intro 언급, 필드 미확인 | erc20_transfers [확인] | cursor: 예시에만. 요청 파라미터 미문서화 [확인] |
| GoldRush | 주소 tx 기반 [추정] | [미확인] | 로그 기반 [추정] | paginated [부분확인] |
| Blockscout | transactions 에 포함 [추정] | 별도 엔드포인트 [확인] | token-transfers [확인] | keyset, next_page_params [확인] |
| Ankr | sender/recipient 명시 [확인] → 수신 포함 [추정] | [미확인] | ankr_getTokenTransfers [확인] | pageToken, pageSize [확인] |

### Q2. Testnet 지원

- 4개 모두 Sepolia 계열의 공식 지원 확인을 완료하지 못했다.
- GoldRush 만 릴리스 노트에 Sepolia 계열 추가 기록 존재 [부분확인].
- Blockscout 은 인스턴스 단위라서 체인별 존재 여부 확인 필요 [추정].
- Ankr 은 testnet 토큰 조회 제한 가능성 보고 있음 [부분확인].
- 결론: 체인 목록은 실제 API 호출로 검증해야 한다.

### Q3. 무료 티어 / 유료 가격 (요약)

| Provider | 무료 | 유료 시작 | 비고 |
|---|---|---|---|
| Moralis | 수치 미확인 (3자 40K CU/day) | $149/mo (Starter) | pricing 페이지 [확인] |
| GoldRush | 14일 trial, 4 RPS, 25K credits [부분확인] | $10/mo (Vibe) 또는 $250/mo (Pro) [부분확인] | FAQ 수치 불일치 |
| Blockscout | 5 RPS, 100K credits/day [부분확인] | $49/mo (Builder) [부분확인] | PRO key 필수 [부분확인] |
| Ankr | Public 20 RPS 무료 [부분확인] | PAYG 700 credits = $0.00007 / req [부분확인] | 플랜 수치 2차 자료 혼재 |

### Q4. 모바일 클라이언트 호출 안전성

- Moralis: 공식 가이드는 key 를 클라이언트에 두지 말라고 명시. 서버 프록시 권장 [확인/부분확인]. 모바일 직접 호출은 비권장.
- GoldRush: 모바일 관련 공식 가이드 미확인. key 기반이므로 동일 위험 [추정].
- Blockscout: PRO key 필요. 모바일 가이드 미확인. 공개 인스턴스 무키 여부 [미확인].
- Ankr: Public plan 무키 가능 [부분확인]. 무키 엔드포인트는 누구나 사용 가능 → 남용 위험. Advanced API 의 무키 사용 가능 범위 [미확인]. 도메인 whitelist 는 Origin 헤더 기반이라 네이티브 앱에서 무의미할 수 있음 [추정].
- 공통 추론: 앱 번들에 들어간 key 는 추출 가능하다. 직접 호출은 key 노출 또는 무키 남용 중 하나를 감수해야 한다. 프록시를 두는 편이 안전하다.

### Q5. 신선도 / confirmation / reorg

- 4개 모두 공식 문서에서 finality, confirmation depth, reorg 처리 방식을 확인하지 못했다 [미확인].
- 추론: 인덱서 기반 API 는 최신 블록 반영에 지연이 있을 수 있다. 앱은 pending 과 confirmed 를 구분하지 않으면 reorg 시 목록이 바뀔 수 있다. 자체적으로 `confirmations` 기준을 두는 것이 안전하다.

### Q6. Lock-in / deprecation

- Blockscout: per-instance 엔드포인트 deprecation 예고 확인 [확인]. PRO API 로 이전 필요. 가장 명확한 리스크.
- GoldRush: Covalent 에서 GoldRush 로 브랜드/도메인 이동. 체인 제거 기록 있음 [부분확인]. 이름 변경 이력 확인 필요.
- Moralis: 명시된 deprecation 없음. 무료 플랜 제한은 2023 에 변경된 이력 있음 [부분확인].
- Ankr: 미확인.
- 공통 리스크: 응답 스키마가 provider 전용. 앱은 자체 `HistoryItem` 정규화 계층을 두어 교체 비용을 줄이는 것이 좋다 [추정].

## 조사 한계

- 아래 공식 페이지는 fetch 시 404 또는 403 으로 실패: Moralis wallet history 레퍼런스, GoldRush transactions 레퍼런스, Blockscout rate-limits, Blockscout REST 상세, Ankr 공식 레퍼런스 일부, GoldRush pricing 페이지.
- 해당 항목은 검색 스니펫 수준 근거다. [부분확인]으로 표시했다.
- 3자 리뷰, 포럼, 2024 블로그 자료가 일부 포함됨. 최신성 낮음.
- 가격과 무료 한도는 2026 기준으로 자주 바뀐다. 구현 전 대시보드에서 재확인 필요.

## 실측 체크리스트 (구현 전)

- 각 provider 에 Sepolia 주소 1개로 호출:
  - incoming native tx 가 목록에 나오는지
  - internal native 가 나오는지
  - ERC-20 transfer 가 나오는지
  - 페이지네이션 next 토큰 동작
- 무키 호출 가능 여부 (Blockscout 공개 인스턴스, Ankr Public)
- 최신 블록 직후 tx 가 반영되는 지연 시간
- 응답 샘플을 저장해 스키마 고정

## 참고 출처

- Moralis wallet history 가이드: https://docs.moralis.com/get-started/tutorials/data-api/wallets-and-accounts/get-full-wallet-transaction-history-eoa-and-smart-accounts
- Moralis EVM 레퍼런스 개요: https://docs.moralis.com/web3-data-api/evm/reference
- Moralis pricing: https://docs.moralis.com/get-started/pricing
- Moralis 보안 가이드: https://docs.moralis.com/web3-data-api/security-guidelines
- Moralis 로드맵 (wallet history): https://roadmap.moralis.io/b/feature-requests/get-full-wallet-history
- Moralis 무료 플랜 변경 공지 (2023-04): https://api-help.moralis.io/en/articles/64090-new-limits-on-the-free-plan-as-from-15th-april-2023
- Moralis rate limits (검색 결과): https://docs.moralis.com/web3-data-api/evm/reference/rate-limits
- GoldRush Q4 2023 릴리스: https://goldrush.dev/blog/q4-2023-product-update/
- GoldRush changelog: https://goldrush.dev/docs/unified-api/changelog
- GoldRush FAQ: https://goldrush.dev/docs/faq
- GoldRush pricing (검색 결과): https://goldrush.dev/docs/unified-api/pricing , https://goldrush.dev/pricing
- GoldRush 비교 가이드: https://goldrush.dev/guides/comparing-covalent-s-transactions-api-to-rpc-providers/
- Blockscout best practices (엔드포인트, PRO API, 크레딧): https://docs.blockscout.com/best-practices.md
- Blockscout token-transfers API (deprecation 공지): https://docs.blockscout.com/api-reference/get-token-transfers.md
- Blockscout rate limits (검색 결과): https://docs.blockscout.com/rate-limits.md
- Blockscout PRO API 소개 (검색 결과): https://docs.blockscout.com/devs/pro-api
- Blockscout 요금 비교 (검색 결과): https://docs.blockscout.com/devs/plans-and-credits
- Blockscout wallet history 가이드: https://docs.blockscout.com/devs/wallet-history
- Ankr get transactions by address: https://www.ankr.com/docs/api-reference/aapi/ankr-get-transactions-by-address/
- Ankr get token transfers: https://www.ankr.com/docs/api-reference/aapi/ankr-get-token-transfers/
- Ankr 요금 플랜: https://www.ankr.com/docs/rpc-service/pricing-plans
- Ankr 포럼 (testnet 이슈): https://api-docs.ankr.com/discuss/661446924c4527006d7e12d3
- Ankr.js SDK: https://www.ankr.com/docs/advanced-api/javascript-sdk/
- 3자 참고 (2차, 최신성 미확인): https://cryptodaily.co.uk/2026/09/12-best-blockchain-apis-in-2026-free-tiers-compared , https://www.costbench.com/software/blockchain-nodes/ankr/free-plan/
