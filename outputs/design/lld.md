# VaultMe LLD (Low-Level Design)

작성일: 2026-10-12 · 상태: 설계 초안 (코드 없음) · 상위 문서: [HLD](hld.md) · 근거: [요구사항 결정 기록](../vaultme-requirements-session.md)

이 문서는 코드 수준 구조, 라이브러리, interface, schema, pipeline을 정한다. 코드 예시는 설계 설명용이다. 아직 구현되지 않았다.

표의 `Qn`은 결정 기록의 질문 번호다. **기본값**은 grilling에서 따로 묻지 않고 이 문서에서 정한 값이다. 바꾸려면 결정 기록에 남긴다.

## 1. Repository 구조

```text
vaultme/
├─ apps/
│  ├─ mobile/                  # Expo dev build (Q33)
│  │  ├─ app/                  # Expo Router route 파일만. pages를 re-export (Q59)
│  │  └─ src/
│  │     ├─ app/               # FSD app layer: provider, 잠금 gate, 전역 설정
│  │     ├─ pages/             # home, send, receive, activity, settings, onboarding
│  │     ├─ widgets/           # portfolio-balance(C23), review-panel(C15), activity-list
│  │     ├─ features/          # send, receive, backup, restore, push-optin, app-lock
│  │     ├─ entities/          # account, asset, transaction, recipient
│  │     └─ shared/            # api client, storage, i18n, ui primitives, tokens 연결
│  ├─ web/                     # React Router v7 framework mode (Q45)
│  │  ├─ app/routes/           # route 파일만
│  │  ├─ src/{pages,widgets,features,entities,shared}
│  │  ├─ public/{_headers,_redirects}  # 보안 header, /admin 및 /admin/* → /__spa-fallback 200 rewrite
│  │  └─ wrangler.jsonc        # assets.directory=./build/client, SPA fallback, env: staging, production
│  └─ api/                     # Cloudflare Workers (Q38)
│     ├─ src/
│     │  ├─ http/              # Hono app, route, middleware
│     │  ├─ jobs/              # cron: watcher, alert, purge
│     │  ├─ queue/             # push consumer
│     │  ├─ chain/             # RPC client + failover, Etherscan client
│     │  ├─ db/                # Drizzle schema, query
│     │  └─ obs/               # log, metric
│     ├─ migrations/           # drizzle-kit 생성 SQL (commit)
│     └─ wrangler.jsonc        # env: staging, production
├─ packages/
│  ├─ wallet-core/             # 순수 TS + viem. React·RN 의존 금지 (Q59, Q74)
│  ├─ contracts/               # zod schema + OpenAPI 생성물 (Q61)
│  ├─ tokens/                  # Style Dictionary 생성물 (Q64)
│  ├─ i18n/                    # ko 문구 (Q49)
│  └─ config/                  # eslint, tsconfig, prettier, stylelint 공유 설정
├─ docs/openapi/v1.json        # 생성 후 commit, CI diff 대상
├─ turbo.json
└─ pnpm-workspace.yaml
```

### 1.1 Import 규칙 (Q59, Q68)

| 규칙 | 강제 도구 |
|---|---|
| FSD 방향: app → pages → widgets → features → entities → shared | Steiger, ESLint restricted imports |
| 같은 layer의 slice끼리 import 금지 | Steiger |
| `@vaultme/wallet-core` import 허용: `features/send`, `features/backup`, `features/restore`, `entities/transaction` | ESLint path별 override |
| `wallet-core`는 viem, `@noble/*`, `@scure/*` 외 의존 금지 | CI 의존성 허용 목록 검사 (Q74) |
| 색상 hex·rgb, 숫자 spacing 직접 사용 금지 | ESLint `no-restricted-syntax`, Stylelint (Q64) |
| `apps/*`끼리 import 금지. 공유는 `packages/*`로 | ESLint |

## 2. 라이브러리

| 영역 | 선택 | 결정 |
|---|---|---|
| Package manager | pnpm 11 (`minimumReleaseAge` 10080, `strictDepBuilds`) | Q51, Q74 |
| Build orchestration | Turborepo | Q51 |
| TypeScript | 6.x 고정 (typescript-eslint가 TS 7 미지원) | Q68 |
| EVM | viem (`mnemonicToAccount`, `parseUnits`/`formatUnits`) | Q60 |
| Schema | zod + `@hono/zod-openapi` | Q61 |
| API server | Hono | Q38 |
| DB | Drizzle + drizzle-kit, D1 | Q66 |
| 서버 상태 | TanStack Query (+ persist) | Q62 |
| 송신 흐름 상태 | `wallet-core` 순수 reducer | Q62 |
| 앱 UI 상태 | Zustand | Q62 |
| 폼 | react-hook-form + zod resolver | Q65 |
| 모바일 라우팅 | Expo Router | Q70 |
| Phrase 저장 | `react-native-keychain` | Q34 |
| 기기 저장 | `react-native-mmkv` v4 (`encryptionKey`, New Architecture 필수 아님) | Q63 |
| 난수 | `react-native-get-random-values` 또는 `expo-crypto` (실측 후) | Q70 |
| QR | `expo-camera` scan, `react-native-qrcode-svg` 생성 | Q70 |
| 캡처 차단 | `expo-screen-capture` | Q43 |
| Push | `expo-notifications`, Expo Push Service | Q39 |
| i18n | i18next + react-i18next | Q49, Q70 |
| 스타일 | Style Dictionary → RN `StyleSheet`, CSS Modules | Q64 |
| 글꼴 | `expo-font` + `@expo-google-fonts/inter` (400/500/600/700), `@expo-google-fonts/ibm-plex-mono` (400/500). 무게별 subpath import | Foundation typography (C2a 추가, 2026-10-13) |
| Icon | `phosphor-react-native` (regular만) | `wallet-icon-guide.md` (C2a 추가) |
| SVG 렌더 | `react-native-svg` (Expo 번들 버전 15.15.4) | `phosphor-react-native`의 peer 의존 (C2a 추가) |
| 관측 | `@sentry/react-native`, `@sentry/cloudflare`, Workers Analytics Engine | Q50, Q56 |
| Lint | ESLint flat + typescript-eslint + Prettier + Steiger + Stylelint | Q68 |
| 루팅·탈옥 탐지 | `expo-device` `isRootedExperimentalAsync` | 기본값 검토 |
| 테스트 | Vitest, fast-check, `@cloudflare/vitest-plugin` (구 vitest-pool-workers, rename·deprecated), anvil (`anvil_reorg`, `anvil_snapshot`/`anvil_revert`), Maestro, Playwright + axe, oasdiff | Q67, Q76 |
| 의존성 갱신 | Renovate | Q74 |

## 3. `wallet-core` interface

화면은 아래 함수만 호출한다. 이름과 형태는 설계안이다.

```ts
// 상수: 서버에서 받지 않는다 (Q73)
export const CHAIN = { id: 11155111, name: 'Sepolia' } as const
export const ASSETS = {
  ETH:  { kind: 'native', decimals: 18 },
  USDC: { kind: 'erc20', decimals: 6, address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' }, // Circle 문서 + on-chain decimals()=6, symbol()=USDC 확인 (2026-10-12)
} as const
export const DERIVATION_PATH = "m/44'/60'/0'/0/0"     // Q40
export const ABS_MAX_FEE_WEI = parseEther('0.005')     // 기본값, testnet 전용 (Q73)

// 키
export function generateMnemonic(): Mnemonic            // 12단어
export function validateMnemonic(words: string): MnemonicCheck   // 12·24단어
export function deriveAddress(m: Mnemonic): Address

// 송신
export function prepare(intent: SendIntent, chain: ChainSnapshot): PrepareResult
//  → Review 모델: 금액, 예상 수수료, 최대 수수료(상한), 경고(첫 수신자, 유사 주소, native 수수료 부족)
export function signAndSubmit(
  approved: ApprovedSend, latest: ChainSnapshot, deps: { mnemonic: Mnemonic; submit: SubmitFn }
): Promise<SubmitResult>
//  → 상한 재검사(초과 시 NeedsReview), 절대 상한 검사, 서명, hash 직접 계산, 제출, hash 비교

// 금액 (decimal 문자열 ↔ bigint, Q48)
export function toUnits(decimal: string, asset: AssetId): bigint
export function fromUnits(raw: bigint, asset: AssetId): string   // 반올림 없음
export function maxSendable(balance: bigint, asset: AssetId, feeCap: bigint, nativeBalance: bigint): MaxResult

// 주소 오염 방어 (Q71) + burn·토큰 컨트랙트 (Q79). 우선순위: burn > tokenContract > lookalike > first > known
export const BURN_ADDRESSES = ['0x0000000000000000000000000000000000000000', '0x000000000000000000000000000000000000dEaD'] as const
export function recipientRisk(to: Address, previous: readonly Address[]): 'known' | 'first' | 'lookalike' | 'burn' | 'tokenContract'

// 상태 전이 (§6)
export function reduce(state: SendState, event: SendEvent): SendState
```

- `Mnemonic`은 branded type이다. 로그·Sentry로 나가지 않게 `toString`/`toJSON`이 마스킹된다.
- Keychain 접근은 앱의 `features/backup`·`features/send`가 맡는다. `wallet-core`는 저장소를 모른다. 그래서 Node에서 테스트할 수 있다.

## 4. API 계약 (v1)

모든 요청은 `X-App-Version` header를 보낸다. 서버는 최소 지원 버전 미만이면 `426`과 업데이트 안내를 응답한다 (Q53). 앱 요청은 설치 token + `ts`·`nonce`·서명 header를 붙인다 (Q57).

| Method · Path | 인증 | 용도 | 결정 |
|---|---|---|---|
| `POST /v1/installs` | 없음 (rate limit) | 익명 설치 등록, 짧은 수명 token 발급 | Q57 |
| `POST /v1/installs/token` | 설치 서명 | token 갱신 | Q57 |
| `POST /v1/rpc` | 설치 | JSON-RPC proxy. 허용 method 목록만 통과 | Q58 |
| `POST /v1/history` (body `{address, cursor}`) | 설치 | Etherscan 3종 병합·중복 제거·0원 표시 flag. 주소를 URL(log)에 남기지 않으려고 POST body로 받는다 (owner 결정 2026-10-14) | Q30, Q32, Q71 |
| `POST /v1/push/challenge` | 설치 | SIWE challenge 발급 (nonce, 만료) | Q28 |
| `POST /v1/push/subscriptions` | 설치 + SIWE 서명 | 구독 생성, 기기 session 발급 | Q27, Q28 |
| `PUT /v1/push/subscriptions/token` | 기기 session | push token 교체 | Q28 |
| `DELETE /v1/push/subscriptions` | 기기 session | 해지, 연결 삭제 | Q27 |
| `POST /v1/push/tracked-tx` | 기기 session | 송신 hash·nonce 추적 등록 | Q24 |
| `GET /v1/ops/metrics` | Cloudflare Access | Admin 집계 지표 | Q44 |

- RPC 허용 method (기본값): `eth_chainId`, `eth_blockNumber`, `eth_getBalance`, `eth_getTransactionCount`, `eth_estimateGas`, `eth_maxPriorityFeePerGas`, `eth_feeHistory`, `eth_getBlockByNumber`, `eth_call`(USDC `balanceOf`만), `eth_sendRawTransaction`, `eth_getTransactionReceipt`.
- 오류 응답 형식: `{ code, message, retryable }`. `code`는 `contracts`의 enum이다. 앱은 모르는 `code`를 `Unknown`으로 처리한다 (Q61).

## 5. Rate limit

### 5.0 구현 방식

Redis·Valkey 같은 별도 저장소를 쓰지 않는다. Cloudflare 기본 기능으로 처리한다 (Q38).

| 대상 | 구현 | 이유 |
|---|---|---|
| 사용자 요청 (설치·IP 단위) | **Workers Rate Limiting binding** (`env.X.limit({ key })`) | 설정만으로 동작. 한도는 Cloudflare location별이고 대략적이다. 남용 억제에는 충분하다 |
| Etherscan 전체 호출 (초당 3회) | **Durable Object** token bucket (§5.1) | 서버 전체에서 정확한 한도가 필요하다. Rate Limiting binding은 location별이라 맞지 않는다 |

Rate Limiting binding 제약 (Cloudflare 문서): period는 10초 또는 60초만 가능하다. 한도는 location마다 따로 센다. Cloudflare는 IP를 key로 쓰지 말라고 권장한다(모바일 망에서 여러 사용자가 공유). 그래서 IP는 보조 key로만 쓰고 한도를 크게 둔다.

### 5.0.1 값 (기본값)

| 대상 | key | 한도 |
|---|---|---|
| `POST /v1/installs` | IP | 60초당 3회 |
| `/v1/rpc`, `/v1/history` | 설치 ID | 60초당 60회 |
| `/v1/rpc`, `/v1/history` | IP | 60초당 300회 |
| `/v1/push/*` | 설치 ID | 60초당 10회 |

초과 시 `429` + `Retry-After`. 앱은 cache를 보여주고 그 뒤 재시도한다. 실측 후 조정한다.

### 5.1 Etherscan 호출 줄 세우기

Etherscan 무료 한도는 key 하나당 초당 3회다 (Q36 조사). 사용자별 rate limit과 별개로 서버 전체 호출을 이 한도 아래로 유지한다.

- **Durable Object 1개**를 token bucket으로 쓴다 (초당 3 token, 기본값으로 2.5/초 사용해 여유를 둔다). Worker isolate가 여러 개여도 한 곳에서 판정해야 하기 때문이다. Durable Object는 Q38 구성에 추가되는 Cloudflare 구성 요소다.
- `/v1/history` 응답은 주소별로 **30초** cache한다 (Cache API, 기본값). 같은 사용자의 반복 새로고침이 Etherscan을 다시 부르지 않는다. Cache key에는 주소를 hash해서 쓴다.
- Token을 얻지 못하면 최대 2초 기다린다. 그래도 없으면 `503` + `retryable: true`를 응답한다. 앱은 기기 cache와 업데이트 시각을 보여준다 (Q58).
- 지표: `etherscan_throttled_total`, `etherscan_429_total`. Admin에 표시하고 provider 오류율 알림에 포함한다 (Q44, Q56).

## 6. 송신 상태 전이

`wallet-core`의 `reduce`가 구현한다. 표에 없는 전이는 무시하고 개발 빌드에서 assert한다.

| 현재 | 이벤트 | 다음 | 비고 |
|---|---|---|---|
| Draft | `INPUT_VALID` | Draft | 폼 상태 (Q65) |
| Draft | `REVIEW` | Reviewing | `prepare` 결과 |
| Reviewing | `EDIT` | Draft | 승인 무효 |
| Reviewing | `CONFIRM` | Authenticating | 유사 주소면 명시 확인 필요 (Q71) |
| Authenticating | `AUTH_OK` | Submitting | |
| Authenticating | `AUTH_FAIL` / `AUTH_CANCEL` | Reviewing | 서명하지 않음 (Q12) |
| Submitting | `FEE_CAP_EXCEEDED` | Reviewing | 다시 인증 (Q46) |
| Submitting | `ABS_CAP_EXCEEDED` | Reviewing (차단) | Q73 |
| Submitting | `SUBMITTED(hash)` | Pending | hash 일치 |
| Submitting | `SUBMIT_UNKNOWN` | Unknown | 응답 없음, hash 불일치 |
| Pending / Unknown | `RECEIPT(ok)` | Included | |
| Pending / Unknown | `RECEIPT(reverted)` | Included | 실패 표시는 `safe` 후 |
| Included | `SAFE(ok)` | Confirmed | |
| Included | `SAFE(reverted)` | Failed | |
| Included | `REORGED` | Pending | receipt 사라짐 |
| Pending / Unknown | `NONCE_PASSED_NO_RECEIPT` | Replaced | `safe` nonce > 우리 nonce (Q77) |
| Pending / Unknown | `TIMEOUT` | (변화 없음) | 시간만으로 판정 금지 (Q22) |

- 송신 차단 (Q47): `Pending` 또는 `Unknown`이 하나라도 있으면 새 `Draft`를 만들 수 없다. `Included` 이후는 nonce가 소비되었으므로 차단하지 않는다 (기본값).
- 기기에 저장 (MMKV): `{hash, nonce, asset, to, amount, createdAt, lastCheckedAt, state}`.

## 7. D1 schema 초안 (Drizzle)

| 테이블 | 주요 열 | 보관 (Q31) |
|---|---|---|
| `installs` | `id`, `pubkey`, `created_at`, `last_seen_at` | 90일 미접속 시 삭제 |
| `push_subscriptions` | `id`, `install_id`, `address`, `expo_token`, `session_hash`, `created_at`, `last_seen_at` | 해지·무효·90일 |
| `siwe_nonces` | `nonce`, `install_id`, `expires_at`, `used_at` | 만료 후 삭제 |
| `chain_cursor` | `chain_id`, `block_number`, `block_hash`, `updated_at` | 영구 (1행) |
| `chain_blocks` | `number`, `hash`, `parent_hash` | `safe` 이전 구간만 |
| `deposit_events` | `id`(=`tx_hash:log_index`), `address`, `asset`, `amount_raw`, `block_number`, `block_hash`, `status`(`included`/`safe`/`orphaned`) | 최종 후 7일 |
| `tracked_txs` | `hash`, `subscription_id`, `nonce`, `status`, `updated_at` | 최종 후 7일 |
| `push_outbox` | `id`, `subscription_id`, `kind`, `ref_id`, `status`, `attempts`, `ticket_id`, `receipt_status` | 최종 후 7일 |

- Unique key로 중복 알림을 막는다: `push_outbox(subscription_id, kind, ref_id)`.
- 한 block 범위의 event·outbox·cursor 갱신은 하나의 D1 batch로 쓴다.
- Migration lint: `DROP COLUMN`, `RENAME`, `CREATE TABLE … ; INSERT INTO … SELECT … ; DROP TABLE` 패턴이 있으면 CI가 실패한다 (Q66).

## 8. Watcher (Cron 1분)

1. Lease를 얻는다 (D1 행 하나에 `locked_until`). 실패하면 종료.
2. `head = latest`, `safe = safe` tag를 읽는다.
3. `chain_blocks`의 마지막 hash와 RPC 결과를 비교한다. 다르면 공통 조상까지 되돌리고 그 위 event를 `orphaned`로 표시한다.
4. `cursor+1 .. min(head, cursor+N)` 범위를 읽는다. `N` 기본값 10 block (CPU 제한, Q38).
   - Native: `eth_getBlockByNumber(full)`의 `to`가 구독 주소이고 `value > 0`.
   - USDC: `eth_getLogs`(contract 상수, `Transfer` topic, `to`가 구독 주소). 0원은 저장하되 알리지 않는다 (Q71).
5. event, block, cursor를 한 batch로 저장한다.
6. `safe` 이하가 된 `included` event를 `safe`로 바꾸고 outbox에 넣는다 (Q25, Q37).
7. `tracked_txs`의 receipt와 `safe` nonce를 확인한다. Confirmed·Failed·Replaced를 outbox에 넣는다 (Q77).
8. Outbox 신규 행을 Queue에 넣는다. 지표(`detect_latency_ms`, `cursor_lag_blocks`)를 기록한다.

Queue consumer는 Expo로 보내고 ticket을 저장한다. 다음 Cron이 receipt를 확인한다. `DeviceNotRegistered`면 구독을 삭제한다 (Q39). `max_retries: 5`를 명시한다 (Queues 기본값은 3, 최대 100). Queues에는 내장 backoff가 없으므로 consumer가 `retry({ delaySeconds })`로 30초·1분·2분·4분·8분 간격을 직접 준다. 5회 후 `dead_letter_queue`로 보낸다. 근거: [platform facts](../../work/measurements/platform-facts-2026-10-12.md).

## 9. CI/CD pipeline

GitHub Actions. Action은 commit SHA로 고정 (Q74). Secret은 GitHub Environments `staging`, `production` (Q55).

| Workflow | Trigger | Job |
|---|---|---|
| `ci.yml` | PR | `turbo run lint typecheck test --affected`, Steiger, Stylelint, OpenAPI 생성 → `oasdiff breaking` (main 대비), migration lint, `wallet-core` 의존성 검사, osv-scanner, 웹 미리보기 (Workers Builds 또는 `wrangler versions upload --preview-alias pr-<number>`) |
| `staging.yml` | main push | Workers staging 배포 → `wrangler d1 migrations apply --env staging` → 웹 `wrangler deploy --env staging` → EAS Update `staging` → Maestro (EAS Workflows) + Playwright + Sepolia smoke |
| `release.yml` | `v*` tag | 수동 승인 → D1 migration (expand만) → Workers gradual 10% → 오류율 확인 → 100% → 웹 `wrangler deploy` 100% (실패 시 `wrangler rollback`) → EAS Update `production` 또는 store 빌드 |

- Native 변경 감지: Expo fingerprint가 바뀌면 EAS Update 대신 store 빌드 경로로 간다 (Q53).
- CI 시간과 Turborepo cache 적중률을 기록한다 (Q55).

## 10. 버전·릴리스 규칙 (기본값)

| 대상 | 규칙 |
|---|---|
| Release tag | `vMAJOR.MINOR.PATCH` 하나로 세 앱을 함께 표시 |
| Mobile `runtimeVersion` | `fingerprint` 정책. native가 같으면 OTA 허용 |
| API 최소 지원 앱 버전 | 서버 설정값. 올릴 때는 release note에 이유 기록 |
| API 버전 | `/v1` 필드 추가만. 깨지는 변경은 `/v2` 병행 후 v1 사용량 0 확인 뒤 제거 |
| D1 contract 단계 | expand 배포 후 최소 1개 release 뒤 |

## 11. 테스트 배치

| 위험 (Q54) | 도구 | 예 |
|---|---|---|
| 금액 | Vitest + fast-check | 6/18 decimals 왕복, `maxSendable`이 잔액 초과하지 않음 |
| 상태 전이 | Vitest + fast-check | 무작위 이벤트 열에서 Pending 중 Draft 생성 불가 |
| 주소 오염 | Vitest | 앞뒤 4자리 같은 주소 → `lookalike`; burn 주소 → `burn`; USDC 컨트랙트 → `tokenContract` (대소문자 무관) |
| API 계약 | oasdiff, Vitest round-trip | 예전 앱 요청 fixture 유지 |
| Watcher | vitest-pool-workers + anvil | `anvil_reorg`로 reorg, 같은 event 두 번 → push 1회 |
| Sentry 정보 제거 | Vitest | 가짜 주소·hash가 이벤트에 남지 않음 (Q50) |
| 핵심 흐름 | Maestro | 온보딩 → 수신 → 송신 → 상태 |
| 웹 | Playwright + axe | 랜딩 meta, Admin 비인가 접근 차단 |
| 실기기 | 체크리스트 | 생체 변경 후 phrase 열람, 캡처 차단, VoiceOver·TalkBack 완주 (Q76) |

## 12. 앱 구현 규칙

- 잠금 gate: 첫 render 전에 MMKV에서 잠금 상태를 동기로 읽는다. 백그라운드 30초 기준은 `AppState`로 측정하고, OS 인증창의 일시 inactive는 제외한다 (Q13, Q63).
- Phrase 화면: mount 시 `preventScreenCaptureAsync`, unmount 시 해제. 앱 전환 미리보기 가림도 이 화면에만 적용한다. 복사 버튼 없음. 화면을 벗어나면 state에서 phrase를 지운다 (Q15, Q43).
- 루팅·탈옥 탐지: 첫 실행에 S92 경고를 한 번 보여주고 Settings에서 다시 볼 수 있다. 사용을 막지 않는다. 탐지는 `expo-device`의 `Device.isRootedExperimentalAsync()`를 쓴다 (Android·iOS 지원, experimental, 오탐·우회 가능). 탐지는 우회 가능하므로 보안 장치가 아니라 위험 고지로 취급한다.
- 주소 표시: 4글자 단위 분할. 접근성 label도 4글자 단위로 읽는다 (Q71, Q76).
- 금액: decimal 문자열과 bigint만 쓴다. `Number` 금지 (lint 규칙 후보).
- Push 수신: payload zod 검증 → 알려진 `kind`만 → 서버 재조회. URL 무시 (Q75).
- Sentry `beforeSend`: `0x[0-9a-fA-F]{40}`, `0x[0-9a-fA-F]{64}`, BIP39 단어 연속 패턴을 제거 (Q50).

## 13. 알림 (Slack)

Cron이 조건을 판정하고 incoming webhook으로 보낸다. 같은 조건은 30분에 한 번. 복구 시 1회. 문구에는 지표와 Admin 링크만 넣는다 (Q69).

## 14. 이 문서에서 정한 기본값 목록

| 항목 | 값 |
|---|---|
| 절대 수수료 상한 (testnet) | 0.005 ETH |
| Watcher 범위 | Cron당 10 block |
| Push 재시도 | 5회 후 dead-letter |
| Rate limit | §5 |
| Etherscan 호출 | Durable Object token bucket 2.5/초, history cache 30초 (§5.1) |
| RPC 허용 method | §4 |
| 송신 차단 해제 시점 | `Included` 이후 |
| 앱 전환 미리보기 가림 | phrase 화면만 (사용자 확인) |
| 루팅·탈옥 | 경고만, 차단 없음 (사용자 확인) |
| 버전 규칙 | §10 |
