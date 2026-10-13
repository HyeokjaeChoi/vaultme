# VaultMe — Hono, EVM 추적, Push 검토

조사일: 2026-10-11. GPT-5.6 Luna 에이전트 3개 조사와 공식 자료를 취합했다.

상태: 조사와 권고. 코드·DB·서버·provider 계정·실기기 push를 만들거나 검증하지 않았다. Hono와 배포 플랫폼은 미선정이다.

## 요약

Hono는 모바일 앱의 HTTP API 후보로 적합하다. Incoming 입금과 앱 종료 후 outgoing 상태를 감시하려면 Hono 요청 처리와 별도로 지속적인 chain worker, 영속 저장소, 재시도와 중복 억제, push 발송·receipt 처리가 필요하다.

첫 범위는 다음처럼 좁히기를 권고한다.

- 하나의 EVM testnet, EOA 한 개, native coin 한 개와 지정 ERC-20 한 종.
- 직접 native 송금과 지정 ERC-20 `Transfer` 이벤트의 canonical·confirmed 입금만 알린다.
- Contract 내부 native transfer, 임의 token, pending 입금, 전체 과거 이력은 후속 범위.
- Outgoing은 본 앱이 제출한 transaction hash를 추적한다. Receipt 미발견·timeout만으로 실패 판정하지 않는다.
- 알림 전달은 best effort다. 사용자가 알림을 열면 서버/API에서 최신 거래를 다시 읽는다.
- Watch address 등록은 주소를 제어한다는 증명이 필요할 수 있다. SIWE challenge 권고는 미확정 설계안이다.

## 책임 경계 제안

```text
React Native app
  ├─ notification permission + Expo push token
  ├─ wallet 주소 watch 구독 및 해지
  └─ 알림 탭 → transaction/activity API에서 최신 상태 조회

Hono HTTP API
  ├─ device token / watch subscription CRUD
  ├─ outgoing transaction hash 등록
  └─ 거래 상태 / 운영 상태 조회

Durable chain worker
  ├─ JSON-RPC block polling + persistent cursor
  ├─ outgoing receipt 조회 + incoming event 감지
  ├─ reorg reconciliation + event deduplication
  └─ DB notification outbox 기록

Push dispatcher → Expo Push Service → APNs / FCM → device
```

Hono는 route와 request/response 처리를 제공한다. 프로세스 재시작 후 cursor 복구, 재시도, block 감시, 알림 중복 방지는 별도 기능이다. HTTP background API만으로 durable worker가 생기지 않는다. [Hono](https://hono.dev/docs), [Hono RPC](https://hono.dev/docs/guides/rpc)

## 배포·백그라운드 처리 선택

| 후보 | 이점 | 추가 책임 | 어울리는 경우 |
|---|---|---|---|
| Cloudflare Workers + Hono + Cron + Queues + D1 | 관리형 runtime, 주기 polling과 비동기 retry 구성 | Cron 간격만큼 감지 지연, D1 cursor/outbox, 실행 제한, vendor 의존성, Queue at-least-once | 분 단위 감지가 충분하고 낮은 운영 부담을 우선할 때 |
| Node.js + Hono + PostgreSQL + watcher/dispatcher | 긴 실행 작업, 재수집, DB transaction·cursor를 직접 제어 | 프로세스 실행·재시작, health, DB migration, lease/retry, metrics를 직접 운영 | 짧은 감지 지연, 긴 backfill, chain worker 제어를 우선할 때 |

Node.js 구성도 PostgreSQL만으로 job이 자동 실행되지 않는다. 앱/API와 watcher/dispatcher의 process 책임은 분리해야 한다. 배포 환경은 미확인이다. 둘 중 어느 안도 최종 결정되지 않았다.

## 감지·상태 계약

- Direct native inbound: full block transaction의 `to`/`value`, receipt, canonical block을 연결.
- ERC-20 inbound: 선택한 token contract와 `Transfer` topic을 filter하고 recipient를 watch address와 비교.
- `approve`는 transfer가 아니다. Zero-value, self-transfer, mint/burn 정책을 명시한다.
- V1은 internal native transfer trace를 지원하지 않는다. 잔액 증가만으로 sender나 event를 만들지 않는다.
- Cursor는 성공적으로 저장된 범위만 전진시킨다. 이벤트와 notification outbox는 원자적으로 저장하고 unique key로 중복 억제.
- Block hash/parent와 cursor를 저장한다. finality 전 구간을 재확인해 reorg를 정정한다.
- `receipt=null`, RPC timeout, worker offline은 Pending/Unknown 원인이다. 자동 실패나 재송신이 아니다.
- `confirmed`와 `finalized`는 다르다. 선택 chain의 `safe`/`finalized` tag 또는 confirmation 수를 검증한 뒤 정한다. 모든 EVM에 임의 block 수를 쓰지 않는다.
- Receipt status `0`은 포함된 실행 실패다. RPC 조회 실패와 구분한다.

입금 알림은 backend 추적이 시작된 뒤 발생한 이벤트부터로 좁히기를 권고한다. Seed로 가져온 지갑의 이전 내역이 완전하다고 표시하지 않는다. History backfill은 범위·속도·알림 정책을 따로 정한다.

## Push와 개인정보

- Expo Push Service는 첫 구현 후보로 적합하다. React Native 앱은 remote push용 development build가 필요하다.
- Ticket `ok`는 Expo 접수, receipt `ok`는 APNs/FCM 접수다. 실제 기기 표시·열람은 보장되지 않는다. `DeviceNotRegistered` token은 비활성화한다. Push는 best effort다.
- 최소 payload로 불투명 `notificationId`/`eventId`, event kind, 일반 문구를 사용한다. Lock screen에 주소·금액·상대·fee를 넣지 않는다.
- Foreground/background/terminated 동작을 구분한다. 알림 탭 때 서버에서 최신 상태를 다시 조회한다.
- Device push token은 wallet address/watch subscription과 연결되는 개인정보다. 동의·철회·삭제·보관기간을 정한다.
- Watch 등록에서 SIWE를 사용한다면 짧은 nonce, 정확한 domain/URI/chain, expiry와 one-time consume을 검증한다. 서명은 알림 구독 목적에 한정하고 transaction/approval 권한을 요청하지 않는다. Contract wallet 허용 시 ERC-1271 경로가 필요한지 조사한다. SIWE는 제안이며 결정되지 않았다.

## 추천 다음 요구사항

1. Watch address를 앱이 자동 구독할지, 사용자가 별도 동의할지.
2. 입금 알림은 block 포함 직후 Pending인지, 확인 수 이후 Confirmed인지. 추천: Confirmed 후 한 번.
3. 알림에 상태만 보일지 asset/amount도 포함할지. 추천: lock screen에는 일반 상태만 표시.
4. 주소 등록 이후 event만 감지할지, 과거 범위를 가져올지. 추천: 첫 버전은 구독 이후.
5. Address ownership challenge와 구독 철회 방식.
6. 알림 감지 지연 목표. 그 뒤 Cloudflare scheduled polling과 Node always-on worker 중 선택.
7. Testnet, finality/confirmation 기준, ERC-20 contract, RPC/Push provider 선택.
8. Admin은 실제 운영자 작업이 확인될 때만 추가한다.

세부 근거:

- [Hono·durable worker 옵션](../work/research-v2/planning/hono-push-backend-options.md)
- [EVM 이벤트·reorg·RPC 추적](../work/research-v2/planning/evm-push-event-tracking.md)
- [Expo Push·SIWE·개인정보 계약](../work/research-v2/planning/mobile-push-security-contract.md)
