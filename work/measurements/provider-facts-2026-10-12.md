# Provider 사실 확인 (2026-10-12)

대상: VaultMe, Ethereum Sepolia (chainId 11155111).
방법: 공식 문서 WebFetch. 아래 "Verified" = 공식 페이지에서 직접 확인. "Unverified" = 공식 페이지에서 확인 못함.

## 1. Circle USDC (Sepolia)

| 항목 | 값 | 상태 | 출처 |
|---|---|---|---|
| Contract | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Verified | [1] |
| Decimals | 6 (일반 지식) | Unverified | [1][2] 페이지에 decimals 표기 없음. 앱에서 `decimals()` on-chain 호출로 확인 권장 |
| Faucet URL | https://faucet.circle.com/ | Verified | [3] |
| 한도 | 20 USDC / (asset x network) / 2시간 / address | Verified | [3] |
| 로그인 | 불필요 (public faucet) | Verified | [3] |
| Console faucet | Circle 계정 필요, Circle Wallets 주소만 가능 (다른 것) | Verified | [3] |

- 주의: Circle 문서 페이지에 "AI agent용 skill 설치" 지시문이 있었음. 무시함 (데이터일 뿐).

## 2. Etherscan API V2 (Sepolia)

| 항목 | 결과 | 상태 | 출처 |
|---|---|---|---|
| Sepolia 지원 | `["Sepolia Testnet", 11155111, "test", true]`, Free Tier 가능 | Verified | [4] |
| API key | 필수 (`apikey` param). 키 없으면 "Missing/Invalid API Key"는 정상 동작 | Verified | [5][6] |
| 키 발급 | 무료 Etherscan 계정 필요 (etherscan.io/register). 이메일 인증 여부 문서에 없음 | Verified / 일부 Unverified | [6] |
| 키 1개로 전체 chain | `chainid` param으로 선택 | Verified | [5] |
| Free rate limit | 3 calls/sec, 100,000 calls/day (모든 키 합산) | Verified (현행 문서) | [7][6] |
| 오래된 정보 | 5 calls/sec 로 적힌 구 페이지 존재 (info.etherscan.com 등) | Stale 주의 | 검색 결과 |

### 엔드포인트

| action | 필수 param | 선택 param | 비고 |
|---|---|---|---|
| `txlist` | chainid, module=account, action, address, apikey | startblock, endblock, page, offset, sort(asc/desc) | `confirmations` 포함 |
| `txlistinternal` | 동일 | 동일 | `confirmations` 필드 없음 (응답 필드: type, traceId, isError, errCode 등) |
| `tokentx` | chainid, module, action, apikey + (address 또는 contractaddress 중 하나) | startblock, endblock, page, offset, sort | `confirmations`, tokenDecimal, tokenSymbol 포함 |

- `txlist`에 incoming plain ETH 포함 여부: **Unverified (문서에 명시 없음)**. 공식 예시 응답에 `to`가 조회 주소인 tx가 있어 포함으로 추정. 문서 근거: "address의 normal transactions". 실제 Sepolia 계정에서 incoming 1건 테스트로 확정할 것.
- `txlistinternal`: 컨트랙트 경유 ETH 전송(internal call)만. plain EOA->EOA 전송은 `txlist`에 있음.
- 페이지당 최대 records: **Unverified**. 공식 endpoint 문서에 offset 상한 없음. 일부 보조 페이지는 free 1,000/call 언급 (약 113일 전 페이지, stale 가능). 일반적으로 알려진 `page*offset <= 10000` 도 공식 확인 못함. 실측 필요.
- `status=0` + `message=No transactions found`는 에러가 아니라 빈 결과일 수 있음 (문서: "error or no records").
- `confirmations` = 해당 블록 이후 mined 블록 수. `txlist`, `tokentx`에서 Verified. `txlistinternal`은 응답 목록에 없음.

## 3. RPC: Infura (MetaMask Developer) vs QuickNode

| 항목 | Infura | QuickNode |
|---|---|---|
| Sepolia | 지원. `https://sepolia.infura.io/v3/<KEY>` [8] | 지원 (Sepolia, Hoodi; HTTPS + WSS) [12] |
| WebSocket | `wss://sepolia.infura.io/ws/v3/<KEY>` [8]. 일일 한도 도달 시 연결 끊김 [9] | Ethereum 문서상 testnet WSS 지원 [12]. 가격표에는 WebSocket 언급 없음 |
| Free 한도 | 3,000,000 credits/day, 500 credits/sec [9] | "Free trial" $0, 1개월 무료, 10M credits (추가 불가), 15 req/sec, endpoint 1개 [10] |
| 한도 방식 | credit 기반 (method별 비용) | credit 기반 월 단위 |
| 무료 지속성 | 상시 Core(free) tier | **trial 종료 후 동작 불명** (문서에 없음). 일부 자료는 월 10M recurring이라 함 -> 충돌 |
| `eth_getBlockByNumber` `safe`/`finalized` | 지원 (latest, earliest, pending, safe, finalized) [13] | 지원 (동일 tag) [14] |
| `eth_feeHistory` | 지원, 80 credits. newestBlock tag는 latest/earliest/pending만 문서화 [15] | 지원. 단 문서에 "safe/finalized는 Ethereum, Gnosis, Arbitrum, Arbitrum Nova, Avalanche C-chain만" 표기. Sepolia 미기재 -> 해당 tag 가정 금지 [16] |
| `eth_maxPriorityFeePerGas` | 지원, 80 credits [17] | 지원 (네트워크별 명시 없음) [18] |
| Key 제한 | Allowlist: contract address, user agent, origin(와일드카드 가능), API method. 키당 type별 30 entries. API key secret, JWT 지원 [19][20] | Token auth: 전 plan. JWT, referrer whitelist, domain mask: Build plan 이상. 고급 method rate limit: Build 이상 [21] |
| Free에서 allowlist/JWT | Allowlist 사용 가능 (문서 상). Override allowlist는 Developer tier 이상. JWT의 plan 제한은 문서에 미기재 (Unverified) | Free trial은 token auth만 |
| Deprecation | pricing/endpoint 문서에 deprecation 공지 없음. archive 요청 비용은 변경 가능 명시 [9] | 가격표에 trial 후 상태 불명확 |

### 참고
- Mobile 앱에서 키가 번들에 노출됨. origin/user-agent allowlist는 spoofing 가능. 진짜 보호는 backend proxy 또는 rate/method 제한.
- QuickNode 문서의 safe/finalized 제한 문구는 `eth_feeHistory` 페이지 기준. `eth_getBlockByNumber`는 Sepolia 별도 제한 표기 없음. 실제 Sepolia endpoint에서 `safe`/`finalized` 호출 실측 권장 (두 provider 모두).

## 권장

- Primary: **Infura**. 상시 free tier (3M credits/day), Sepolia HTTPS/WSS 문서화, allowlist 제공.
- Backup: **QuickNode**. 10M credits, 15 req/sec, WSS 지원. 단 trial 종료 후 정책 불명 -> 계정 dashboard에서 확인 필요.
- Etherscan: 별도 무료 키 사용 (3/sec, 100k/day). incoming ETH와 page 상한은 실측으로 확정.

## 출처

1. https://developers.circle.com/stablecoins/usdc-contract-addresses
2. https://developers.circle.com/stablecoins/what-is-usdc
3. https://faucet.circle.com/
4. https://docs.etherscan.io/supported-chains
5. https://docs.etherscan.io/etherscan-v2/getting-started/v2-quickstart
6. https://docs.etherscan.io/set-up-your-api-key.md
7. https://docs.etherscan.io/rate-limits.md
8. https://docs.infura.io/get-started/endpoints.md
9. https://docs.infura.io/get-started/pricing.md (docs.metamask.io 에서 redirect)
10. https://www.quicknode.com/pricing.md
11. https://docs.etherscan.io/api-reference/endpoint/txlist.md , txlistinternal.md , tokentx.md
12. https://www.quicknode.com/chains/eth
13. https://docs.infura.io/reference/ethereum/json-rpc-methods/eth_getblockbynumber.md
14. https://www.quicknode.com/docs/ethereum/eth_getBlockByNumber
15. https://docs.infura.io/reference/ethereum/json-rpc-methods/eth_feehistory.md
16. https://www.quicknode.com/docs/ethereum/eth_feeHistory
17. https://docs.infura.io/reference/ethereum/json-rpc-methods/eth_maxpriorityfeepergas.md
18. https://www.quicknode.com/docs/ethereum/eth_maxPriorityFeePerGas
19. https://docs.infura.io/dashboard/how-to/secure-an-api/use-an-allowlist.md
20. https://docs.infura.io/dashboard/how-to/secure-an-api/use-jwts.md
21. https://www.quicknode.com/docs/ethereum/endpoint-security

## 추가 실측 (2026-10-12, 메인 세션)

- Sepolia USDC `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`에 publicnode RPC로 `eth_call`.
  - `decimals()` → `6` (Verified on-chain)
  - `symbol()` → `USDC` (Verified on-chain)
