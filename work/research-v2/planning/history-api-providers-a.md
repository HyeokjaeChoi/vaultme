# History API 제공자 비교 (A): Alchemy / Infura / QuickNode / Etherscan V2

조사일: 2026-10-11. 공식 문서 기준. 일부 페이지는 요약 도구(WebFetch)를 거쳤다. 원문 대조가 필요한 항목은 "unverified"로 표시했다.
표기: [V] = 공식 URL로 확인, [I] = 추론, [U] = unverified.

## 1. 한 줄 결론
- Alchemy: 기능은 가장 맞다 (incoming native 포함). 단 testnet 지원 범위가 문서에 안 나온다. 실제 호출로 확인 필요 [U].
- Infura: 주소 history API 없음 [V 부분]. 후보에서 제외.
- QuickNode: ERC-20 전용 add-on. native 여부 불명, testnet 불명. 비추천.
- Etherscan V2: 3개 endpoint(txlist/txlistinternal/tokentx)로 요구사항을 모두 덮는다. 무료로 Sepolia, Arbitrum Sepolia, Amoy 가능. Base Sepolia, OP Sepolia는 유료 전용.
- API key 노출: 4곳 모두 모바일 번들 ID allowlist는 확인 못 함. 얇은 proxy 권장 [I].

## 2. 비교표

| 항목 | Alchemy | Infura (MetaMask Developer) | QuickNode | Etherscan V2 |
|---|---|---|---|---|
| Incoming native | `external` 카테고리에서 `toAddress`로 조회 [V] | history API 없음 | 불명 [U] | `txlist` [I: 문서에 명시 없음, from/to 필드 있음] |
| Internal native | `internal` 카테고리. 일부 mainnet만 [V] | 해당 없음 | 불명 [U] | `txlistinternal` [V] |
| ERC-20 | `erc20` 카테고리 [V] | 해당 없음 | `qn_getWalletTokenTransactions` (ERC-20만) [V] | `tokentx` [V] |
| 페이지네이션 | `pageKey`, `maxCount`(기본 1000) [V] | - | `page`/`perPage`(최대 100), 최대 1000건 [V] | `page`/`offset` + `startblock` 커서 [V] |
| 정렬 | `order` asc/desc [V] | - | 불명 [U] | `sort` asc/desc [V] |
| Testnet (history) | 불명 [U]. 아래 3.1 참조 | - | 불명 [U] | Sepolia, Hoodi, Arb Sepolia, Amoy 무료. Base Sepolia, OP Sepolia 유료 [V] |
| 무료 한도 | 30M CU, 300 CUPS [V] (기간 불명) | 3M credits/day, 500 credits/s [V] (FAQ와 충돌) | 10M credits/월, 15 rps (1개월 체험) [V] | 3 calls/s, 100,000 calls/day [V] |
| 호출 비용 | `getAssetTransfers` 120 CU [V] | - | 불명 [U] | 호출당 1 (공식 문구 미확인) [U] |
| 유료 | PAYG $0.525 / 1M CU [V] | Developer $50/월 [V] | Build $49/월, 80M credits [V] | Lite~Pro Plus, 5~30 calls/s [V] |
| 모바일 직접 호출 | proxy 권장 [I] | - | 불명 [U] | 키가 query string. 키 제한 기능 미확인 [U] |
| 확정/reorg | 문서에 명시 없음 [U] | - | 불명 [U] | `confirmations`, `isError` 필드 [V] |
| Lock-in | 응답 형식 독자적 | - | add-on 종속 | 응답 형식 독자적, 체인 공통 |

## 3. 제공자별 상세

### 3.1 Alchemy
- `alchemy_getAssetTransfers` 카테고리: external, internal, erc20, erc721, erc1155, specialnft [V].
- incoming native는 `toAddress=내 주소`, `category=external`로 얻는다. 문서 예시가 이 경우를 보여준다 [V].
- 보낸 것과 받은 것은 `fromAddress`, `toAddress`로 각각 호출해서 합쳐야 한다. 둘 다 기본값이 zero address다 [V]. 합치기는 앱 코드 몫이다 [I].
- `internal` 카테고리는 Ethereum Mainnet, Polygon Mainnet, Base Mainnet, Arc 계열에서만 된다 [V]. Sepolia 계열은 목록에 없다. 즉 testnet에서 internal native는 안 나올 가능성이 높다 [I].
- 다른 문서(Address Activity Webhook)는 Sepolia internal 지원으로 읽힌다. 하지만 오래된 페이지라 충돌한다 [U].
- `withMetadata`(blockTimestamp)는 ETH, Base, Polygon, Arbitrum, Optimism에서만 된다 [V]. testnet에서는 타임스탬프가 없을 수 있다. 그 경우 블록 조회가 추가로 필요하다 [I].
- Zero-value internal은 반환 안 된다. delegatecall도 제외된다 [V].
- 정렬: 블록 번호 기준 asc/desc [V].
- Sepolia 등 testnet에서 이 API가 도는지는 공식 페이지에서 확인 못 했다. 공식 문서는 "dashboard의 Chains 페이지를 보라"고만 한다 [V]. 해결책: Sepolia 키를 만들어 실제 호출 1회 [I].
- 다중 체인용 Transfers By Wallet(Beta)가 있다고 문서가 언급한다 [V]. 상세 페이지는 404로 못 읽었다 [U].
- 가격: 무료 30M CU, 300 CUPS. 기간(월)은 페이지에 안 나왔다 [V/U]. PAYG $0.525/1M CU [V].
- 비용 감각: 120 CU/호출이면 30M CU = 약 250,000 호출 [I: 단순 나눗셈]. 한 화면 새로고침에 2~3콜이 든다 [I].
- 키 보안: 키는 URL 대신 header 권장. 클라이언트에는 단명 JWT(예: 10분)를 권장. JWT는 header로만 가능 [V].
- allowlist는 address, domain, IP 세 종류다 [V]. domain은 Origin 헤더에 의존한다. 네이티브 앱은 보통 Origin이 없다 [I]. bundle ID allowlist는 못 찾았다 [U].
- 결론: 앱에 키를 직접 넣는 방식은 위험하다. 키는 추출 가능하다 [I].
- 확정/reorg: 문서에 확정 상태 필드나 reorg 처리 설명이 없다 [U].
- Deprecation: 찾지 못함 [U].

### 3.2 Infura (MetaMask Developer)
- docs.metamask.io/services가 docs.infura.io로 308 redirect된다 [V].
- 문서 인덱스의 API 목록: Ethereum, Base, Arbitrum, Optimism, Polygon PoS, Linea, IPFS, Gas API [V].
- 가격 페이지에도 transaction history/transfers API 언급이 없다. Archive, Gas API, Debug/Trace만 있다 [V].
- 솔직한 결론: Infura에는 주소 history API가 보이지 않는다. 순수 JSON-RPC는 incoming native를 나열할 수 없다 [I]. 후보에서 제외.
- 완전한 부재 증명은 아니다. 네트워크별 reference 전체를 검색한 것은 아니다 [U].
- 가격: Free 3M credits/day, 500 credits/s. FAQ는 6M/day, 2,000/s로 충돌한다 [V]. Developer $50/월 [V].
- 키 보안: 가격 페이지에 allowlist/JWT 언급 없음 [U].

### 3.3 QuickNode
- `qn_getWalletTokenTransactions` (v2)는 ERC-20 전송을 반환한다. `contract`는 선택이다 [V].
- native 전송 포함 여부는 문서에 없다 [V: "없음"을 확인].
- 필요 조건: Token and NFT API v2 bundle add-on을 endpoint에 활성화해야 한다 [V].
- 페이지네이션: `page`(1부터), `perPage`(기본 40, 최대 100), 최대 1000건. `totalPages` 반환 [V].
- 정렬: 문서에 없다 [U].
- 지원 체인/testnet: 해당 페이지에 없다. 예시는 Ethereum mainnet이다 [V]. 일반 RPC는 Sepolia를 지원한다 [V]. 하지만 add-on의 Sepolia 지원은 확인 못 했다 [U].
- 가격: Free trial $0, 10M credits/월, 15 rps (1개월 체험). Build $49/월, 80M credits, 50 rps, 추가 $0.62/1M [V].
- add-on 가격과 호출당 credit은 확인 못 했다 [U].
- 대안으로 Streams가 있으나 이번 조사에서 확인하지 않았다 [U].
- 키 보안, 확정 상태, deprecation: 확인 못 함 [U].
- 결론: native incoming이 불명이라 이번 요구사항에 맞지 않는다.

### 3.4 Etherscan API V2
- 단일 endpoint `https://api.etherscan.io/v2/api` + 필수 `chainid` [V].
- `txlist`: 일반 tx. 파라미터 startblock, endblock, page, offset, sort [V]. 필드에 `confirmations`, `isError`, `txreceipt_status`, `timeStamp`가 있다 [V].
- `txlist`는 normal tx만 다룬다 [V]. incoming native는 `to`가 내 주소인 레코드로 나올 것이다. 문서가 명시하지는 않는다. 실제 응답으로 확인 필요 [U].
- 실패한 tx도 포함된다. `isError=1`로 구분한다 [V].
- `txlistinternal`: internal tx. 필드에 `type`, `traceId`, `isError` [V].
- `tokentx`: ERC-20 전송. `address` 또는 `contractaddress` 중 하나 필수. 필드에 `confirmations`, `tokenDecimal` [V].
- 세 endpoint를 합쳐 시간순 병합하는 일은 앱 몫이다 [I]. 같은 tx hash가 여러 목록에 나올 수 있어 dedupe가 필요하다 [I].
- 정렬: `sort=asc|desc` [V].
- 최대 레코드: 2026-07-01부터 Free 티어는 요청당 10,000 -> 1,000으로 줄었다. tokentx, txlist, txlistinternal 모두 영향 대상 [V]. 이미 시행 중인 시점이다.
- 전체 history 페이징 권장 방식: 마지막 레코드 블록 번호를 다음 `startblock`으로 쓰는 커서 방식 [V].
- testnet (chains 페이지) [V]:
  - Sepolia (11155111): 무료
  - Hoodi (560048): 무료
  - Arbitrum Sepolia (421614): 무료
  - Polygon Amoy (80002): 무료
  - Base Sepolia (84532): 유료 전용
  - OP Sepolia (11155420): 유료 전용
- 위 표는 체인 전체 지원이다. txlist류 endpoint가 모든 체인에서 동작하는지는 별도 확인하지 않았다 [U].
- 제한: Free 3 calls/s, 100,000 calls/day. "선택된 체인만" [V]. PRO endpoint는 Standard 이상 [V].
- 유료: Lite 5/s, Standard 10/s, Advanced 20/s, Professional 30/s [V]. 월 가격은 이번에 확인 못 했다 [U].
- 호출당 credit 소모량은 확인 못 했다 [U].
- 키 보안: apikey가 query string이다 [V]. 키별 도메인/번들 제한 기능은 확인 못 했다 [U]. 무료 키는 읽기 전용 데이터라 유출 피해는 쿼터 소진 수준이다 [I]. 단 모든 앱 사용자가 키를 공유한다.
- 신선도: 인덱싱 지연 정도는 문서에 없다 [U]. `confirmations`로 UI에서 pending/confirmed를 계산할 수 있다 [I]. reorg 처리 설명은 없다 [U].
- 주의: opBNB 지원이 2026-10-12 종료 예정이다. 우리와 무관하지만 체인 정리가 실제로 일어난다는 신호다 [V]. testnet 지원이 바뀔 수 있다 [I].
- Lock-in: 응답 스키마가 Etherscan 계열 explorer 전체(Blockscout 등)와 유사하다 [I: 문서 확인 안 함]. 전환 비용이 비교적 낮다 [I].

## 4. 공통 판단 (VaultMe 관점)
- 모바일에서 키를 번들에 넣으면 추출 가능하다 [I]. 확인한 어느 제공자도 모바일 번들 ID로 키를 제한한다는 공식 근거가 없다 [U].
- 서버가 이미 push 알림용으로 있으므로, 얇은 pass-through proxy를 두는 편이 안전하다 [I]. 요구사항은 "history source는 아님"이므로 proxy는 저장 없이 전달만 한다.
- 가장 적은 구현: Etherscan V2 하나로 txlist + txlistinternal + tokentx 3콜 [I]. 체인을 Sepolia 계열(무료)로 고르면 비용이 0이다.
- Alchemy는 2콜(external+erc20, 각각 from/to 방향으로 총 4콜)이 필요하고 testnet internal이 빠질 수 있다 [I].
- 둘 다 구현 전에 Sepolia에서 실제 호출 1회로 incoming native 반환을 확인해야 한다 [I].

## 5. 오래됐을 수 있는 정보
- 모든 가격과 한도 수치는 2026-10-11 시점 페이지 요약이다. 변동 가능.
- Etherscan 무료 티어 체인/레코드 한도는 2026년 중 이미 바뀌었다. 재확인 권장.
- Infura 무료 한도는 페이지 내에서 서로 충돌한다.
- Alchemy의 "30M CU" 기간 표기가 없다.

## 6. 출처
- Alchemy getAssetTransfers: https://www.alchemy.com/docs/data/transfers-api/transfers-endpoints/alchemy-get-asset-transfers
- Alchemy Transfers API overview: https://www.alchemy.com/docs/reference/transfers-api-quickstart
- Alchemy pricing: https://www.alchemy.com/docs/reference/pricing-plans
- Alchemy key security: https://www.alchemy.com/docs/best-practices-for-key-security-and-management
- Alchemy allowlists: https://www.alchemy.com/docs/how-to-add-allowlists-to-your-apps-for-enhanced-security
- Alchemy JWT: https://www.alchemy.com/docs/how-to-use-jwts-for-api-requests
- Alchemy origin allowlist (Admin API): https://www.alchemy.com/docs/admin-api/apps/update-app-origin-allowlist
- Infura docs index: https://docs.infura.io/
- Infura pricing: https://www.infura.io/pricing
- QuickNode qn_getWalletTokenTransactions: https://www.quicknode.com/docs/ethereum/qn_getWalletTokenTransactions
- QuickNode pricing: https://www.quicknode.com/pricing
- Etherscan supported chains: https://docs.etherscan.io/supported-chains
- Etherscan rate limits: https://docs.etherscan.io/resources/rate-limits
- Etherscan txlist: https://docs.etherscan.io/api-reference/endpoint/txlist
- Etherscan txlistinternal: https://docs.etherscan.io/api-reference/endpoint/txlistinternal
- Etherscan tokentx: https://docs.etherscan.io/api-reference/endpoint/tokentx.md
- Etherscan changelog: https://docs.etherscan.io/changelog.md
- Etherscan full history guide: https://docs.etherscan.io/get-an-addresss-full-transaction-history
