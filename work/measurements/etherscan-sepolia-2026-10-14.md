# Etherscan V2 Sepolia 내역 API 실측 (#38)

측정: 2026-10-14, Etherscan API V2 (`https://api.etherscan.io/v2/api?chainid=11155111`), 무료 key, 총 약 190회 호출. 스크립트: [`scripts/spikes/etherscan-sepolia.mjs`](../../scripts/spikes/etherscan-sepolia.mjs). key는 env file에서 스크립트가 직접 읽고 출력·문서·URL에 남기지 않았다 (문서의 URL은 `apikey=REDACTED`). 원본 JSON은 commit하지 않고 요약만 남긴다.

## 결론

- **`/v1/history`는 Etherscan으로 가능하다. Alchemy로 바꾸지 않는다.** Alchemy `alchemy_getAssetTransfers`는 문서상 internal transfer가 Ethereum·Polygon·Base mainnet에서만 된다. Sepolia에서는 contract가 보낸 ETH(internal) 입금을 못 얻는다. 아래 조건을 지킨다.
- **조건 1 (중요)**: Sepolia는 2026-10-08쯤(block 11,866,877 근처)부터 native ETH 이동이 `tokentx`에도 가짜 token으로 나온다 (`contractAddress = 0xfffffffffffffffffffffffffffffffffffffffe`, symbol `ETH`). `txlist`·`txlistinternal`과 중복이다. 병합 전에 이 행을 버린다.
- **조건 2**: HTTP는 항상 200이다. 오류는 body의 `status`·`message`·`result`로 구분한다 (rate limit 포함).
- **조건 3**: 주소 형식 오류도 오류가 아니라 "빈 결과"로 온다. proxy가 먼저 검증한다.
- **조건 4**: 한 요청 최대 1000건, `page × offset ≤ 10000`. 깊은 pagination은 page가 아니라 block 범위로 한다.

## 방법과 주소

| 주소 | 종류 | 이유 |
|---|---|---|
| `0x9858EfFD232B4033E47d90003D41EC34EcaEda94` | 공개 test vector | 비어 있지 않다: txlist 567, internal 197, tokentx 208건. 오래된 기록(block 2.4M)부터 최신까지 있어 정렬·pagination·실패 tx 확인에 쓴다 |
| `0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9` | WETH (Sepolia) contract | 거래가 잦은 busy case, internal(`withdraw`가 보내는 ETH) 대량 |
| `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` | Circle USDC contract | `tokentx contractaddress=` 필터, 프로젝트가 쓰는 token |
| `0xe787c35f6a875567409c4970ba7b41a0cb9d1b4d` | WETH에서 internal ETH를 가장 많이 받는 contract (`eth_getCode` 확인) | 남이 보낸 tx에서 internal로 들어오는 입금 (txlist에 없는 경우) 확인 |
| `0x1234567890123456789012345678901234567890` | placeholder 주소 | spam token이 몰려 0원 transfer, 다종 token 확인. 개인 주소 아님 |
| `0x3141592653589793238462643383279502884197` | 빈 주소 | 세 목록 모두 빈 결과 shape 확인 (`0x5a5a…`·`0xabcd…`는 token spam이 있어 비지 않았다) |

개인 주소는 쓰지 않았다.

## endpoint별 결과

| 항목 | `txlist` | `txlistinternal` | `tokentx` |
|---|---|---|---|
| 포함 | 주소가 from/to인 최상위 tx. 들어오는 native, 보낸 native, contract 호출 | 내부 call로 오간 native (`type: call`). **남이 보낸 tx 안에서 들어온 ETH도 포함** | ERC-20 Transfer. Sepolia는 native ETH 가짜 행 포함 (조건 1) |
| 고유 field | `nonce`, `gas`, `gasPrice`, `input`, `methodId`, `functionName`, `isError`, `txreceipt_status`, `confirmations` | `traceId`(예 `0_1_1`), `type`, `isError`, `errCode`, `gas`, `gasUsed` | `tokenName`, `tokenSymbol`, `tokenDecimal`, `contractAddress`, `statusRep`, `input="deprecated"` |
| 공통 field | `blockNumber`, `timeStamp`, `hash`, `from`, `to`, `value`(wei 문자열), `transactionIndex`, `contractAddress` | 같음 | 같음 + `blockHash` |
| 실패 표시 | `isError=1` ⇔ `txreceipt_status=0` (2,567행 전부 일치). 값은 `value`에 남지만 이동하지 않았다 | `isError=1`: 실패한 하위 call. 값이 이동하지 않았다. WETH 1000행 중 260행 | 실패 표시 없음 (성공한 Transfer 이벤트만 있다) |
| 0원 | `value=0`은 contract 호출 (approve 등). transfer가 아니다 | 0원 행 없음 (WETH 1000, USDC 17행) | 0원 transfer 있다 (placeholder 주소 1000행 중 16, 그 주소의 USDC 128행 중 1) → Q71 flag 필요 |
| 정렬 | `sort=asc\|desc`, block 순. 잘못된 값은 오류 없이 기본값(asc) | 같음 | 같음 |
| 중복 key | `hash`는 유일 (0 중복) | `hash+traceId`는 유일 (0 중복). `hash` 단독은 한 tx에 여러 행 가능 | **logIndex 없음.** 같은 tx에 같은 token·from·to·value 행이 실제로 반복된다 (1000행에서 5쌍) |

공통: `value`·`blockNumber`·`timeStamp` 모두 문자열이다. 주소는 소문자다.

### 들어오는 입금 범위

- 들어오는 native (일반 송금): `txlist`의 `to = 주소`.
- internal 입금: `txlistinternal`의 `to = 주소`, `isError=0`. contract `0xe787…`로 들어온 internal 272건 중 151건은 `txlist`에 부모 tx가 없다. **`txlist`만으로는 놓친다.**
- ERC-20 입금: `tokentx`의 `to = 주소`.
- 가짜 ETH 행 검증: WETH internal 중 `isError=0`·`value>0` 740건 전부 같은 `(hash, from, to, value)` 가짜 행이 `tokentx`에 있다. 최상위 tx도 성공한 값 이동은 모두 있다. 실패 tx는 없다. fork 이전 기록에는 가짜 행이 없어서 `tokentx`만으로 native 내역을 만들 수는 없다.

## 한도

| 항목 | 결과 |
|---|---|
| 최대 건수 | `offset` 기본값과 최대값 모두 **1000**. `offset=1001`, `10000`을 줘도 1000건만 온다 (오류 없음). 2026-07-01 changelog(10,000 → 1,000)와 일치 |
| page window | `page × offset > 10000`이면 `status=0`, message `Result window is too large, PageNo x Offset size must be less than or equal to 10000`, `result=null` (page=11, offset=1000에서 확인) |
| page 규칙 | `offset`은 `page`가 있어야 적용된다 (`page` 없이 `offset=1`은 567건 전부). `page=0`도 무시된다 |
| 끝을 넘은 page | 567건 주소에 `page=3, offset=300` → `status=0`, `No transactions found`, `result=[]` |
| `startblock`/`endblock` | 동작한다 (inclusive). 범위 안에 없으면 빈 결과. `startblock > endblock`도 빈 결과 (오류 없음). 숫자가 아닌 `startblock`도 빈 결과 |
| 무료 rate limit | 초당 3회. 6개를 동시에 보내면 2~3개가 거절된다 (아래 오류 shape) |

## 지연

순차 호출, 400ms 간격, 로컬 Mac 1곳에서 측정 (네트워크 위치 1개).

| 호출 | p50 | p95 | 표본 |
|---|---|---|---|
| `txlist` offset=100 | 419ms | 857ms | 20 |
| `txlistinternal` offset=100 | 238ms | 262ms | 20 |
| `tokentx` offset=100 | 449ms | 671ms | 20 |
| `txlist` offset=1000 (WETH) | 522ms | 1457ms | 8 |
| `tokentx` contractaddress offset=1000 (USDC) | 512ms | 1519ms | 8 |

첫 호출이나 큰 주소는 1.3~2.2초가 나왔다. 아주 busy한 contract (`0xe787…`)에서 `txlistinternal sort=desc offset=200`와 `tokentx` 전체 범위는 19초 뒤 `Query Timeout` (아래). 사용자 지갑은 이만큼 busy하지 않을 것이라 추정한다 (검증 안 함).

## 최신성

- `eth_blockNumber`는 `module=proxy`로 무료 호출된다 (JSON-RPC 모양의 `{jsonrpc,id,result}`, `status` 없음).
- WETH `txlist` 최신 tx와 tip의 차이를 8회 + 6회 sampling: 1~11 block. WETH가 매 block 거래하지 않아서 **색인 지연과 거래 공백을 구분하지 못했다.**
- 하한 증거: 새 거래가 처음 보였을 때 tip이 그 block + 1이었다 (`11913725` 대 `11913726`). 이때 색인 지연은 1 block(약 12초) 이하였다.
- 한계: 표본이 작다.

## 오류 shape (key는 `REDACTED`)

모두 HTTP 200이다.

| 상황 | `status` | `message` | `result` |
|---|---|---|---|
| 빈 결과 (`txlist`, `txlistinternal`, `tokentx`) | `"0"` | `No transactions found` | `[]` |
| 정상 | `"1"` | `OK` | 배열 |
| rate limit | `"0"` | `NOTOK` | `Max calls per sec rate limit reached (3/sec)` (문자열) |
| 잘못된 key | `"0"` | `NOTOK` | `Invalid API Key (#err2)` |
| 주소 없음 | `"0"` | `NOTOK` | `Error! Missing address filter` (`tokentx`: `Error! Missing address or contract address`) |
| 없는 action | `"0"` | `NOTOK` | `Error! Missing Or invalid Action name` |
| 형식이 틀린 주소 (`0x123`) | `"0"` | `No transactions found` | `[]`. **오류가 아니라 빈 결과** |
| page window 초과 | `"0"` | `Result window is too large, …≤ 10000` | `null` |
| 과부하 | `"0"` | `Query Timeout occured. Please select a smaller result dataset` | `null` (≈19초 걸림) |

예시 URL: `https://api.etherscan.io/v2/api?chainid=11155111&module=account&action=txlist&address=0x9858…&page=1&offset=100&sort=desc&apikey=REDACTED`

proxy 분류:
- 빈 결과: `message == "No transactions found"` (오류 아님).
- retryable: `result`에 `rate limit` 포함 (→ `etherscan_429_total`), `Query Timeout`.
- 그 밖의 `status=0`은 `unavailable` (key 오류 포함. 로그에는 `message`만, 본문은 버린다).
- 주소는 proxy에서 `^0x[0-9a-fA-F]{40}$`로 먼저 검증한다.

## 병합·cursor 제안

dedupe key (병합 전에 먼저 가짜 ETH 행 `contractAddress == 0xff…fe`를 버린다):

| 출처 | key |
|---|---|
| `txlist` | `tx:<hash>` |
| `txlistinternal` | `int:<hash>:<traceId>` |
| `tokentx` | `tok:<hash>:<contractAddress>:<from>:<to>:<value>:<n>`. `n`은 같은 `hash`·token·from·to·value 행의 응답 순서 번호 (0부터). **logIndex가 없어서** 이 방식을 쓴다 |

`hash + logIndex`는 `tokentx`에 logIndex가 없어 쓸 수 없다. 같은 key가 다른 목록에 두 번 나오는 경우는 가짜 ETH 행을 버리면 없다 (`txlist`와 `txlistinternal`은 같은 `hash`를 가질 수 있지만 key 접두사가 다르고 둘 다 실제 별개 이동이다).

정렬: `(blockNumber, transactionIndex)` 내림차순, 같은 tx 안에서는 native → internal(`traceId` 순) → token(응답 순).

cursor (proxy가 만드는 불투명 문자열): `<blockNumber>:<transactionIndex>:<seq>`. `seq`는 같은 tx 안의 정렬 위치. 다음 page는 세 목록 모두 `sort=desc`, `endblock=<blockNumber>`(inclusive), `page=1`, `offset=<필요한 개수>`로 다시 읽고, cursor보다 오래된 항목만 남긴다.
- 사용자에게 줄 page 크기 N이면 각 목록에서 N건씩만 읽어도 병합 상위 N건이 맞다 (한 목록이 N건 넘게 차지할 수 없다).
- 가짜 ETH 행을 버려서 `tokentx`가 N건보다 적게 남고 목록이 꽉 찼으면 (`offset`만큼 왔으면) 다음 page(`page=2`…, `page × offset ≤ 10000`)를 더 읽는다.
- block 단위로 다시 읽으므로 중복은 key로 제거한다. 목록 3개를 병렬로 부르면 1개 page에 Etherscan 3회, rate limit 3/s 중 토큰 3개를 쓴다.
- 서버는 내역을 저장하지 않는다. cursor에는 주소가 없다.

## Alchemy `alchemy_getAssetTransfers`와의 차이 (문서만, key 없음)

출처: Alchemy 문서 (Context7 `/websites/alchemy`, 2026-10-14 조회). 실호출은 하지 않았다.

| 항목 | Etherscan 3종 | Alchemy |
|---|---|---|
| internal native | Sepolia에서 동작 (실측) | 문서: internal은 Ethereum·Polygon·Base mainnet만. **Sepolia 없음** (추정, 실호출 필요) |
| ERC-20 | `tokentx` | `category: erc20` |
| 한 번에 | 1000건, `page×offset ≤ 10000` | `maxCount` 기본 `0x3e8`(1000), `pageKey` cursor |
| 중복 key | 위 제안 (logIndex 없음) | `uniqueId` 제공 (`<hash>:external` 등) |
| 0원 | 결과에 포함 | `excludeZeroValue` 옵션 |
| 필요 호출 | 3회 | 1회 |
| 장점 | 실패 tx(`isError`) 구분, `functionName` | `pageKey`, `uniqueId`로 병합이 단순 |

Alchemy가 더 나은 점은 호출 수와 cursor다. 하지만 internal 입금 공백이 있으므로 이번 결정은 Etherscan이다.

## 열린 질문

1. 가짜 ETH 행(EIP-7708 형태로 추정)이 mainnet Etherscan에도 같은 모양으로 나오는지. Sepolia 전용이면 mainnet 전환 때 필터가 필요 없을 수도 있다. 필터를 조건 없이 두면 안전하다.
2. 색인 지연의 정확한 크기 (위 한계). staging에서 직접 보낸 tx로 재측정한다.
3. `Query Timeout` 기준: 주소가 얼마나 busy해야 나는지. 응답 크기를 줄이는 `startblock`/`offset` 재시도로 해결되는지 (`offset=50`으로 줄이거나 `startblock`으로 범위를 좁히면 성공했다).
4. 한 block에 한 주소의 한 목록이 1000건을 넘는 경우 (page 없이는 cursor로 못 넘는다). 사실상 spam target만 해당. 미측정.
5. 무료 key의 일일 한도와 2026-07-01 이후 정책 변경은 문서로만 확인했고 일일 총량은 시험하지 않았다.
6. Alchemy Sepolia internal 지원 여부는 key가 있어야 확정된다.
