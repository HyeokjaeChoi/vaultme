# VaultMe EVM 거래·수신 감지 조사

조사일: 2026-10-11. 상태: 설계 권고. 구현·배포·provider 계정 검증은 하지 않았다.
범위: 하나의 미선정 EVM testnet, 추적 EOA 1개, native coin, 지정 ERC20 1개, incoming push.

이 문서는 구현 명세가 아니다. 실제 testnet, RPC endpoint, ERC20 contract, push provider는 아직 선정하지 않았다.

## 권고

**첫 버전은 HTTP JSON-RPC block polling + durable cursor로 시작한다.** 직접 top-level native 전송과 지정 ERC20 `Transfer` log만 incoming push 대상으로 삼는다. Contract 내부 native 전송, 임의 token, 전체 과거 내역, pending 수신 push는 제외한다. 제외 범위는 앱에 표시한다.

이는 제품·운영 설계 제안이다. Hono는 등록·조회 API를 제공한다. 지속 수집은 별도 worker 또는 scheduler가 맡는다. HTTP 요청이 끝난 뒤에도 실행된다고 가정하지 않는다. DB에 event, cursor, notification outbox를 저장한다. 앱 종료와 수집 중단을 분리한다.

네트워크 선정 뒤 `chainId`, RPC 이력 보존, `safe`/`finalized` 의미, rate limit, token 주소·ABI·decimals를 확인해야 한다. Ethereum의 finality 규칙을 모든 EVM testnet에 그대로 적용하지 않는다.

## 공식 근거와 감지 범위

| 대상 | 근거 | 첫 버전 처리 |
| --- | --- | --- |
| 직접 native 수신 | `eth_getBlockByNumber`는 full transaction object를 요청할 수 있다. transaction의 `to`와 `value`, mined 뒤 receipt의 `status`를 함께 확인한다. receipt는 pending transaction에는 없다. [Ethereum JSON-RPC](https://ethereum.org/developers/docs/apis/json-rpc/) | `to=tracked EOA`, `value>0`, canonical block의 성공 receipt만 수신으로 확정한다. 실패 거래는 수신 금액에 넣지 않는다. |
| ERC20 수신 | `eth_getLogs`는 `address`, `topics`, `fromBlock`, `toBlock` filter를 지원한다. ERC-20은 `Transfer(address indexed,address indexed,uint256)` event를 발생시켜야 한다. [Ethereum JSON-RPC](https://ethereum.org/developers/docs/apis/json-rpc/), [ERC-20 EIP-20](https://eips.ethereum.org/EIPS/eip-20) | 지정 contract address와 `Transfer` topic을 함께 필터한다. `topics[2]` recipient를 EOA와 비교한다. receipt status가 성공이고 log가 canonical일 때만 확정한다. raw `uint256`를 저장하고 decimals는 별도 metadata로 읽는다. |
| Contract 내부 native 수신 | top-level tx 외의 호출은 trace 영역이다. Geth `callTracer`는 하위 호출 구조를 제공한다. [Geth tracers](https://geth.ethereum.org/docs/developers/evm-tracing/built-in-tracers) | 기본 block·log polling 범위 밖이다. 잔액 증가만으로 sender·tx를 추정하지 않는다. |
| Reverted 거래 | receipt `status=0x0`은 실행 실패다. 블록에 포함되어도 성공이 아니다. [Transaction states](https://www.alchemy.com/docs/ethereum-transactions-pending-mined-dropped-replaced) | outgoing 실패 기록은 남긴다. 수신 성공 알림은 만들지 않는다. ERC20 전송 성공은 receipt뿐 아니라 해당 Transfer도 확인한다. |

ERC20 `approve`는 `Transfer`가 아니다. allowance 변경을 송금으로 표시하지 않는다. Zero-value transfer, mint, burn, self-transfer는 구분한다. 권고: zero-value에는 수신 push를 보내지 않는다. self-transfer에는 out/in 중복 push를 보내지 않는다. 지정 token은 일반적인 비 rebasing·비 fee-on-transfer test token으로 고르고 동작을 직접 확인한다. 이는 첫 버전의 계약 제한이다.

## RPC polling과 provider webhook 비교

| 판단 항목 | 직접 RPC polling | Provider webhook |
| --- | --- | --- |
| 지속 상태 | block number/hash cursor를 직접 저장 | delivery ID와 chain event 상태를 직접 저장 |
| 빠른 감지 | polling 간격만큼 늦음 | provider가 HTTP event 전송 |
| App offline | backend worker가 계속 수집 | backend endpoint가 계속 수신 |
| 누락 복구 | 같은 범위를 다시 읽음 | retry 한도 이후 별도 backfill 필요 |
| 내부 native 전송 | trace/indexer 확장 필요 | 제품·network별 지원 확인 필요 |
| 중복·reorg | 자체 reconciliation 필요 | provider event도 reconciliation 필요 |
| 운영 부담 | RPC 호출량, cursor, 재실행 관리 | 서명 검증, subscription, retry, quota, backfill 관리 |

Alchemy Address Activity는 EVM에서 ETH와 ERC20/721/1155 transfer를 추적한다고 설명한다. payload는 `category`, `fromAddress`, `toAddress`, `rawContract`, `log`, `removed`를 제공한다. 이는 provider가 정의한 범위다. 내부 native transfer의 실제 지원과 chain별 범위는 testnet 선정 뒤 검증한다. **실시간 webhook 지원이 과거 Transfers API 지원을 보장하지 않는다.** [Address Activity](https://www.alchemy.com/docs/reference/address-activity-webhook), [Transfers endpoint](https://www.alchemy.com/docs/data/transfers-api/transfers-endpoints/alchemy-get-asset-transfers)

Alchemy는 first-time webhook notification의 순서를 설명하고, non-200 delivery failure에 exponential backoff retry를 제공한다고 설명한다. Free/PAYG backoff는 최대 10분, Enterprise는 최대 1시간이다. 원문 body와 `X-Alchemy-Signature`로 HMAC-SHA256을 검증한다. 이 문서만으로 재시도 payload의 순서, exactly-once delivery, provider 장애 복구를 보장하지 않는다. [Webhooks Quickstart](https://www.alchemy.com/docs/reference/notify-api-quickstart)

Webhook를 나중에 붙이면 빠른 감지 신호로 사용한다. durable 저장 후 200을 반환하고 비동기로 처리한다. 저장 실패에는 성공 응답을 주지 않는다. 인증 실패 payload는 처리하지 않는다. provider delivery ID 중복 제거와 chain event 중복 제거를 별도로 둔다. RPC reconciliation을 유지한다. Provider 요금제·권한·실제 latency는 이번 조사에서 검증하지 않았다.

## 최소 수집 절차

다음은 구현 제안이다.

1. 최초 등록 시 추적 시작 block `S`, 당시 head `H`, 주소, chainId를 저장한다.
2. `S..H`를 작은 범위로 읽는다. 직접 native 전송은 full block을, ERC20은 log를 읽는다. 실패 시 범위를 줄이고 재시도한다.
3. 관련 tx receipt와 canonical block hash를 대조한다. raw amount, contract, from/to, block number/hash, txHash, logIndex를 저장한다.
4. 한 범위의 event·outbox·cursor 갱신을 DB transaction으로 묶는다. 중간 실패에는 cursor를 앞당기지 않는다.
5. 저장된 마지막 block hash와 현재 RPC 결과를 비교한다. 이어질 parentHash도 확인한다. 일치할 때 다음 범위로 진행한다.
6. 각 실행에서 미확정 구간을 다시 검증한다. reorg면 공통 조상까지 되돌리고 orphan event를 표시한 뒤 재수집한다.
7. 설정한 finality 조건을 충족한 수신만 push outbox에 넣는다. 불명확하면 push를 보류한다.

한 체인을 여러 주소가 공유하면 block을 주소마다 재조회하지 않는다. 필터와 조회 범위를 공유한다. worker lease 또는 DB lock으로 cursor의 동시 갱신을 제어한다. 완성된 범위만 완료로 기록한다.

## Pending·Unknown·Dropped·Replaced

RPC receipt가 `null`이면 receipt를 찾지 못한 것이다. pending에서는 receipt가 없다. 따라서 `null` 하나로 dropped를 판정할 수 없다. [Ethereum JSON-RPC](https://ethereum.org/developers/docs/apis/json-rpc/)

| 내부 상태 제안 | 판정 근거 | 표시 |
| --- | --- | --- |
| submitted / pending | 앱이 보낸 hash와 제출 결과 또는 node의 pending 관측 | Pending |
| included_success | canonical receipt 성공 | 블록 포함. finality 대기 |
| included_failed | canonical receipt 실패 | Failed. 실패 원인이 미확인이면 단정하지 않음 |
| unknown | 조회 오류·장시간 미관측·receipt 없음만 확인 | Unknown. 마지막 확인 시각 제공 |
| replaced | 같은 chain/from/nonce의 다른 hash가 canonical chain에 포함됨을 확인 | Replaced. 대체 hash 연결 |
| dropped_observed | provider가 해당 mempool에서 drop을 보고함 | 내부 관측으로 저장. 전역 취소 확정으로 표시하지 않음 |

동일 sender nonce에는 경쟁 거래가 생길 수 있다. 다른 hash가 포함되면 원래 hash의 대체를 식별할 수 있다. [Transaction states](https://www.alchemy.com/docs/ethereum-transactions-pending-mined-dropped-replaced)

설계상 timeout만으로 `Failed` 또는 `Cancelled`로 바꾸지 않는다. sender nonce 증가만 보고 replacement hash를 만들어내지 않는다. 앱이 보낸 거래는 `(chainId, from, nonce)`와 원래 hash를 보관하고 이후 block에서 대체 hash를 찾는다. Reorg면 replacement 판정도 다시 확인한다. Incoming pending은 전역 mempool 전체 관측을 요구하므로 첫 버전에서 제공하지 않는다.

## Finality·reorg·중복 제거

JSON-RPC는 `latest`, `safe`, `finalized` block tag를 정의한다. Geth `logs` subscription은 reorg된 old-chain log를 `removed=true`로 다시 보내고 같은 transaction의 log를 여러 번 보낼 수 있다. Geth 문서는 subscription이 과거 event를 보내지 않으며 connection 종료 때 subscription이 사라진다고 설명한다. 따라서 subscription 또는 webhook만으로 durable 수집을 대체하지 않는다. [Ethereum JSON-RPC](https://ethereum.org/developers/docs/apis/json-rpc/), [Geth subscriptions](https://geth.ethereum.org/docs/interacting-with-geth/rpc/pubsub)

**권고 label:** `Pending → Included → Confirmed`, 상세 화면에 finality 기준을 함께 표시한다. 선택한 network의 `finalized` 의미와 지원이 검증되면 그 head 이하 canonical event에 `Finalized`를 쓴다. 미지원일 때는 명시한 `N confirmations` 정책만 사용한다. 이 경우 `Finalized`라고 부르지 않는다. N은 network 선정 뒤 결정한다. arbitrary 12 blocks를 모든 EVM에 적용하지 않는다.

execution status와 finality는 다른 필드로 저장한다. `safe`를 보안 검증이나 안전한 상대방 의미로 쓰지 않는다. canonical 여부가 바뀌면 포함·성공 기록을 보존하되 활성 잔액·활동에서 제외하고 정정 상태를 제공한다. finalized hash 불일치는 자동 성공 처리하지 않고 수집 정지·조사 대상으로 삼는다.

중복 키 제안:

- Native 직접 event: `(chainId, blockHash, txHash, native_external)`.
- ERC20 event: `(chainId, blockHash, txHash, logIndex)`.
- 추후 내부 native event: 위 chain/tx/block과 provider trace 식별자. provider 간 trace 식별자 일치 여부는 별도 검증.
- 알림: `(accountSubscriptionId, canonicalEventId, notificationKind)` unique key.

blockHash를 보존해 다른 fork의 관측을 덮어쓰지 않는다. 같은 tx가 다른 block에 재포함되면 orphan 버전과 새 버전을 연결한다. 재포함으로 logIndex가 바뀔 수 있으므로 txHash만으로 event 한 개라고 가정하지 않는다. 첫 버전은 최종 확인 뒤 한 번 알림을 만들어 재포함 중복 위험을 줄인다. outbox는 최소 한 번 실행을 전제로 한다. push 시스템의 exactly-once 도착을 약속하지 않는다.

## 최초 이력과 offline

새 지갑은 등록 시점부터 추적한다. 가져온 EOA는 명시한 `S` 이전 이력이 미포함임을 표시한다. 잔액 조회 성공과 전체 내역 완료를 구분한다. `syncing / complete_for_range / partial / unavailable`과 `fromBlock..toBlock`을 API에 제공한다. 완료는 선언한 범위에만 적용한다.

과거 내역 전체가 필수가 되면 provider history 또는 자체 전체 block scan을 별도 기능으로 추가한다. Alchemy Transfers API는 pagination `pageKey`를 제공한다. external/internal/token coverage를 따로 확인해야 한다. [Transfers endpoint](https://www.alchemy.com/docs/data/transfers-api/transfers-endpoints/alchemy-get-asset-transfers)

Backfill 완료 전 live head가 이동하므로 시작 시 고정한 `H`까지 채운 뒤 `H+1`부터 잇는다. 중첩 범위를 다시 읽어 경계 누락을 점검한다. 과거 event는 기본적으로 push하지 않는다. 등록 이후 backend 장애 중 생긴 event는 복구 후 수집한다. 오래된 알림 발송 여부는 설정한 정책으로 결정한다.

앱이 offline이어도 backend cursor는 진행한다. 앱 재접속 시 activity API로 현재 상태를 읽는다. blockchain event 관측, outbox enqueue, push provider 접수, 기기 표시, 사용자 열람은 별도 상태다. 이 조사에는 APNs/FCM 전달 정책 검증이 포함되지 않는다. 단말 표시 성공은 실제 단말 시험이 필요하다.

## 구현 완료 전에 남길 실행 증거

다음은 필수 검증 제안이며 아직 실행하지 않았다.

| 시나리오 | 합격 기준·증거 |
| --- | --- |
| 앱 종료 중 native 직접 수신 | test tx hash, receipt, worker cursor, event row, outbox, 재접속 활동 일치 |
| 지정 ERC20 수신·다중 Transfer | 각 logIndex 보존. 지정 contract 외 event 제외. raw amount 정확 |
| approve·zero·self-transfer | 송금 오표시와 중복 push 없음 |
| 실행 revert | included_failed 기록. 수신 성공 event·push 없음 |
| Contract 내부 native 수신 | V1 미지원 표시가 정확함. 잔액 증가를 가짜 직접 event로 만들지 않음 |
| RPC 429·timeout·process 재시작 | cursor skip 없음. 중단 범위 재실행 후 결과 일치 |
| DB 저장 실패·동시 worker | 부분 완료 없음. 중복 event·outbox 없음 |
| 동일 payload 재수신·순서 역전 | event 상태와 알림 수가 일치 |
| 통제한 reorg fixture 또는 local chain | orphan 제거, 재포함, 바뀐 logIndex, cursor rollback 검증. 공개 testnet 관측으로 가장하지 않음 |
| long pending·조회 null·대체 거래 | null/timeout은 Unknown. 검증된 same-nonce replacement만 연결 |
| backfill와 live 경계 | 선언한 S..head에 gap 없음. 과거 event push 폭주 없음 |
| finality 지연·tag 미지원 | 명시한 정책대로 보류 또는 N confirmations 표시. Finalized 오표시 없음 |
| webhook를 채택할 때 | 잘못된 서명 거부, raw-body 검증, 저장 전 ACK 방지, retry 초과 후 backfill 복구 |

운영 지표는 `head-cursor lag`, `last successful scan`, oldest outbox age, 재시도 수, reorg 깊이, Unknown 지속 시간, RPC 오류율이다. 증거에 chainId, 실제 endpoint 종류, 코드 revision, 조회 범위, tx/block hash, 실행 시각을 남긴다. API key와 device token은 가린다. 이 문서는 지원 기능이나 배포 완료를 선언하지 않는다.
