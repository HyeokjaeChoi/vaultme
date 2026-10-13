# VaultMe Hono backend 및 push worker 조사

조사일: 2026-10-11  
상태: 공식 문서 기반 조사. 구현, 배포, 실제 push 전달은 검증하지 않았다.

## 결론

Hono는 HTTP API framework다. Hono 자체는 chain을 계속 polling하거나, 재시작 후 작업을 복구하거나, push 전달을 보장하는 durable worker가 아니다.

이 범위에서는 다음 두 구성이 가능하다.

1. **Cloudflare Workers + Hono + Cron Triggers + Queues + D1**
   - 상시 Node process 운영을 줄일 수 있다.
   - 분 단위 감지가 허용될 때 적합하다.
   - Queue와 D1을 함께 사용해야 retry와 상태 복구를 설계할 수 있다.
2. **Node.js + Hono + PostgreSQL + 별도 persistence worker**
   - 직접 polling, backfill, cursor, transaction을 제어하기 쉽다.
   - process 실행, 재시작, health check, migration, job retry를 운영해야 한다.

권장 출발점은 **Cloudflare 구성을 bounded polling worker로 검토**하는 것이다. 빠른 알림, 많은 주소, 복잡한 backfill, 엄격한 reorg 처리가 필요하면 Node.js worker를 우선 검토한다. 이는 설계 판단이다. 실제 provider와 지연 목표를 정하기 전의 확정 결정이 아니다.

## 조사 범위와 wallet 이벤트

- Client: React Native + TypeScript
- Wallet: EOA 1개
- Network: EVM testnet 1개
- Asset: native coin 1개와 지정 ERC-20 1개
- Outgoing: final 또는 failure 상태 알림
- Incoming: 새 입금 push 알림
- 서버에 recovery phrase와 private key를 보내지 않는다.

Ethereum JSON-RPC는 node에 연결해야 chain 데이터를 읽을 수 있다. `eth_blockNumber`는 chain head 조회에 사용하고, `eth_getTransactionReceipt`는 receipt를 조회한다. receipt가 없으면 pending일 수 있다. receipt의 `status`는 실행 성공 또는 실패를 나타낸다. `eth_getLogs`는 contract event를 조회한다. 따라서 지속적인 감시에는 RPC 호출, 마지막 cursor, retry, 재시작 복구가 필요하다. [Ethereum JSON-RPC](https://ethereum.org/developers/docs/apis/json-rpc/)

## Hono의 책임과 한계

Hono 문서는 Hono를 Web Standards 기반의 작은 web framework로 설명한다. Cloudflare Workers와 Node.js를 포함한 여러 runtime에서 HTTP application을 실행할 수 있다. Hono의 `app.fetch`는 Cloudflare Workers entry point다. Hono 문서가 제공하는 책임은 route와 request/response 처리다. [Hono overview](https://hono.dev/docs), [Hono app API](https://hono.dev/docs/api/hono)

따라서 Hono HTTP API의 책임을 다음처럼 제한한다.

- device push token 등록 및 해제
- 감시할 address와 asset 등록
- outgoing transaction hash 등록
- transaction 상태 조회
- health와 운영 상태 조회
- 외부 provider webhook 수신 시 빠른 enqueue

다음 책임은 Hono route 밖의 worker가 맡는다.

- 주기적인 block과 receipt 조회
- ERC-20 `Transfer` log 조회
- cursor 저장과 누락 구간 재검색
- retry, 작업 lease, 중복 억제
- push provider 호출과 provider receipt 확인

HTTP 요청을 열린 채로 receipt를 기다리는 방법은 이 요구에 맞지 않는다. Hono의 HTTP route는 request 처리 단위다. Cloudflare에서 background execution을 사용해도 그것만으로 durable queue, retry, cursor 저장이 생기지 않는다. durable 처리는 Cron, Queue, D1 같은 별도 platform 기능 또는 별도 Node worker가 필요하다.

## 후보 A: Cloudflare Workers 구성

### 공식 기능

Cloudflare Cron Triggers는 cron expression을 Worker의 `scheduled()` handler에 연결한다. 문서는 periodic job과 third-party API 호출을 사용 사례로 든다. Cron은 UTC 기준이며, schedule 변경은 global network에 전파되는 시간이 걸릴 수 있다. [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)

Cloudflare Queues는 producer가 message를 쓰고 consumer Worker가 처리하는 asynchronous messaging 기능이다. 성공한 write 뒤 message가 유실되지 않도록 설계되며, consumer가 성공적으로 처리하기 전에는 message가 삭제되지 않는다. 같은 순서로 전달된다는 보장은 없다. retry와 dead-letter queue를 설정할 수 있다. [How Queues works](https://developers.cloudflare.com/queues/reference/how-queues-works/), [Queue configuration](https://developers.cloudflare.com/queues/configuration/configure-queues/)

Cloudflare D1은 Worker binding으로 SQL database에 접근하는 기능이다. Worker는 `env`의 D1 binding으로 query를 실행한다. D1은 cursor, watched address, observed event, notification outbox, device token 상태를 저장하는 후보가 된다. [D1 getting started](https://developers.cloudflare.com/d1/get-started/), [D1 Worker API](https://developers.cloudflare.com/d1/worker-api/d1-database/)

Cloudflare Workers에는 invocation별 CPU와 request 수 제한이 있다. 공식 limits 문서는 Cron Trigger의 CPU limit과 Worker invocation limit을 따로 설명한다. 그러므로 한 번의 scheduled invocation에서 큰 block 구간을 전부 scan하지 말고 작은 범위로 나누어 cursor를 저장해야 한다. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)

### 권장 흐름

```text
Hono API
  -> D1에 watch/cursor/outbox 저장
Cron scheduled handler
  -> 제한된 block 범위와 receipt/log 조회
  -> D1에 event와 notification outbox 저장
Queue producer
  -> notification ID enqueue
Queue consumer
  -> Expo Push Service 또는 APNs/FCM 호출
  -> retry 또는 dead-letter 처리
```

D1에 event와 outbox를 한 transaction으로 기록할 수는 있다. 외부 Queue 전송까지 같은 database transaction에 포함된다고 가정하면 안 된다. DB 기록 성공 뒤 Queue 전송 전에 process가 종료될 수 있으므로, outbox를 다시 찾는 dispatcher 또는 주기적인 repair job이 필요하다. 이 부분은 Cloudflare 기능을 조합한 설계 추론이다.

Cron만 사용하면 감지 지연은 schedule 간격에 좌우된다. Queue는 이미 발견한 작업의 비동기 처리와 retry를 돕지만, chain을 더 자주 발견하게 만들지는 않는다. 빠른 incoming push가 필요하면 provider webhook의 정확한 보장 범위 또는 별도 always-on watcher를 검증해야 한다.

## 후보 B: Node.js persistence worker

Hono는 Node.js adapter로도 실행된다. Hono 문서는 runtime별 starter를 제공하고, Node.js에서 `@hono/node-server` adapter를 사용한다. [Hono Node.js guide](https://hono.dev/docs/getting-started/nodejs)

Node.js의 timer API는 `setInterval()`로 반복 실행을 예약할 수 있다. active timer가 있으면 event loop가 계속 실행된다. 이 기능은 process가 실제로 실행 중일 때만 polling을 반복한다. process 종료 후 작업을 복구하거나, 여러 replica의 중복 작업을 막거나, crash 뒤 cursor를 복구하지는 않는다. [Node.js Timers](https://nodejs.org/api/timers.html)

권장 분리는 다음과 같다.

- Hono API process: device, watch, transaction API
- Chain watcher process: block, receipt, log polling과 cursor
- Push dispatcher process: notification outbox를 읽고 push 전송
- PostgreSQL: cursor, observed event, notification, outbox, lease와 audit 상태

PostgreSQL transaction으로 event와 notification outbox를 함께 기록하면 DB 상태와 알림 작업의 연결을 관리하기 쉽다. Worker는 저장한 cursor부터 재시작하고, 작은 block window를 사용한다. 이 구조는 기능 조합에 대한 설계 제안이다. PostgreSQL만 설치한다고 persistence worker와 retry가 자동으로 생기지는 않는다.

Node.js 구성의 장점은 long-running watcher, backfill, provider별 retry, reorg window, DB transaction을 한 환경에서 직접 제어할 수 있다는 점이다. 비용은 process supervisor, graceful shutdown, health check, DB connection, migration, metrics, alerting을 직접 운영해야 한다는 점이다.

## Push 알림의 경계

Expo 문서는 Expo Push Service가 Android의 FCM과 iOS의 APNs 통신 복잡성을 줄인다고 설명한다. push는 원격 server가 device로 보내는 notification이다. 서버는 device token을 저장하고, notification request를 보내고, ticket와 receipt를 확인해야 한다. [Expo Push overview](https://docs.expo.dev/push-notifications/overview/), [Expo send notifications](https://docs.expo.dev/push-notifications/sending-notifications/)

따라서 `push sent`와 `user saw notification`은 같은 상태가 아니다. provider 오류와 등록 해제 token을 별도로 저장한다. 네트워크 timeout 뒤 재전송은 duplicate가 될 수 있으므로 `notificationId`를 저장하고 앱이 알림을 열 때 현재 transaction 상태를 다시 조회한다.

## Wallet 상태 규칙

- pending receipt 부재를 failure로 바꾸지 않는다.
- receipt `status = 0`인 실행 실패와 RPC timeout을 구분한다.
- `confirmed`는 testnet과 제품 정책을 정한 뒤 block confirmation 기준으로 판정한다.
- ERC-20 incoming은 지정 contract의 `Transfer` log를 사용한다.
- event identity는 최소 `(chainId, txHash, logIndex)`를 사용한다.
- native coin direct transfer는 transaction의 `to`와 `value`를 확인한다.
- internal native transfer 지원 여부는 별도 범위로 둔다. balance 증가만으로 한 입금 event를 만들지 않는다.
- `blockNumber`, `blockHash`, scan cursor를 저장한다. reorg 가능 구간은 재검사한다.
- notification unique key로 같은 event의 push row 중복 생성을 막는다.

## 선택 전 결정할 질문

1. incoming 감지 지연을 분 단위로 허용하는가?
2. native direct transfer만 지원하는가? internal transfer도 필요한가?
3. `confirmed`에 필요한 block 수와 reorg 정책은 무엇인가?
4. RPC provider와 EVM testnet은 무엇인가?
5. Expo Push Service를 사용할 것인가? 직접 APNs/FCM을 사용할 것인가?
6. Cloudflare managed operation을 우선하는가? Node.js watcher 제어를 우선하는가?

## 최소 검증 항목

- API process를 재시작해도 저장한 watch와 cursor에서 polling이 재개되는가?
- 같은 event, webhook, Queue message를 두 번 받아도 notification row가 하나인가?
- DB commit 직후와 push 호출 직후 crash 뒤 상태가 복구되는가?
- RPC timeout, pending, receipt failure, confirmed가 서로 다른 상태인가?
- native direct transfer와 지정 ERC-20 입금을 각각 감지하는가?
- block range 누락과 reorg window를 재검색하는가?
- push provider receipt 오류와 invalid token을 운영자가 확인할 수 있는가?
- 실제 기기에서 앱이 닫힌 상태로 push를 받고, 알림 선택 뒤 최신 상태를 읽는가?

이 문서는 research finding만 기록한다. 코드, 배포 리소스, credential, Figma, token source, release 상태는 변경하지 않았다.
