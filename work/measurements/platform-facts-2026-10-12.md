# VaultMe 플랫폼 사실 확인 (2026-10-12)

범례: **Verified** = 공식 문서에서 직접 확인 / **Unverified** = 공식 출처 미확인 또는 2차 출처만 있음 / **Stale 주의** = 오래되었거나 상충하는 정보

---

## 1. Expo Push Service: access token 요구 설정

| 항목 | 내용 | 상태 |
|---|---|---|
| 설정 이름 | 공식 문서 본문은 "enhanced push security"로 표기. 대시보드 정확한 라벨(대소문자 포함)은 확인 못 함 | Verified (이름 표기), 라벨 Unverified |
| 설정 위치 | EAS Dashboard. 액세스 토큰 페이지 링크: expo.dev/settings/access-tokens | Verified (문서 링크 기준) |
| 인증 방식 | raw HTTP: `Authorization: Bearer <accessToken>` | Verified |
| SDK 사용 시 | `expo-server-sdk-node` v3.6.0 이상, 생성자 옵션 `accessToken` | Verified |
| 미인증 요청 | 설정 활성화 후 토큰 없거나 무효면 에러 코드 `UNAUTHORIZED`, 사용자에게 전달되지 않음 | Verified |

- 주의: 문서 본문은 "push token + access token" 둘 다 필요하다고 명시.
- 2차 확인: `push-notifications-setup` 페이지에는 해당 설정 언급 없음. 발송 페이지를 기준으로 봐야 함.

## 2. Cloudflare Queues: 재시도 / DLQ

| 항목 | 내용 | 상태 |
|---|---|---|
| 기본 `max_retries` | 3 | Verified |
| `max_retries` 최대값 | 100 | Verified (Limits 페이지) |
| 재시도 지연 | 메시지 단위 `msg.retry({ delaySeconds })`, `batch.retryAll({ delaySeconds })`. 최대 24시간 | Verified |
| 큐 전체 재시도 지연 설정 | 공식 문서에서 찾지 못함 | Unverified |
| `retry_delay` 소비자 설정 키 | 공식 문서에 없음. 제3자 스킬 페이지만 언급 | **Stale 주의 / Unverified (존재 여부 불확실)** |
| 백오프 옵션 | 내장 옵션 없음. 직접 `attempts` 기반 계산 후 `delaySeconds` 전달 | Verified |
| DLQ 설정 | `[[queues.consumers]]` 안에 `dead_letter_queue = "..."` | Verified |
| DLQ 없을 때 | 최대 재시도 도달 시 메시지 삭제 | Verified |
| DLQ에 소비자 없을 때 | 4일 보관 후 삭제 | Verified (dead-letter 페이지) |
| CLI | `wrangler queues consumer add ... --dead-letter-queue` | Verified |
| 큐 delivery delay | `wrangler queues update --delivery-delay-secs`. 상한 값이 문서 스냅샷마다 다름(86400 vs 43200) | Unverified (현행 limits 페이지 재확인 필요) |
| `visibilityTimeout` | pull 큐 최대 12시간 | Verified (Limits) |

- 주의: 소비자 예시에 `max_retries: 10`이 들어간 페이지도 있음. 기본값은 3이며 예시 값과 혼동 금지.

## 3. react-native-mmkv

| 항목 | 내용 | 상태 |
|---|---|---|
| 최신 메이저 | V4 (README 기준) | Verified |
| 최신 릴리스 | v4.3.2, 2026-06-22 (2차 미러 기준, `recoveryStrategy` 옵션 추가) | Unverified (2차 출처) |
| New Architecture | README에 필수라는 문구 없음. V4는 Nitro Module. 릴리스 노트: "V4 now works again on the old-architecture, until react-native 0.82 at least" | Verified (릴리스 노트 2차 미러) |
| RN 최소 버전 | `react-native 0.76 or higher` | Verified (README) |
| Expo 설치 | `npx expo install react-native-mmkv react-native-nitro-modules` 후 `npx expo prebuild` | Verified (README) |
| Expo config plugin | 문서에 언급 없음 | Unverified |
| Expo Go | 문서에 언급 없음. prebuild 필요 흐름상 Expo Go 불가로 추정 | Unverified |
| `encryptionKey` | 인스턴스 생성 옵션. `id` 필수. 기본 AES-128, `encryptionType`으로 AES-256 선택 | Verified |
| 기존 인스턴스 암호화 | `storage.encrypt(...)`, `storage.decrypt()` | Verified |
| API 변경 | `new MMKV()` → `createMMKV()`, `delete` → `remove` | Verified (베타 5 릴리스 노트, 2차 미러) |

- Stale 주의: V3 가이드(그리스어 블로그)의 "Expo Go 불가, New Architecture 필수" 주장은 V3 기준이므로 V4에 그대로 적용하지 말 것.

## 4. Foundry anvil: reorg / rollback / snapshot

출처: getfoundry.sh anvil RPC 메서드 페이지.

| 메서드 | 파라미터 | 비고 | 상태 |
|---|---|---|---|
| `anvil_snapshot` (별칭 `evm_snapshot`) | 없음 | 현재 블록의 snapshot ID 반환 | Verified |
| `anvil_revert` (별칭 `evm_revert`) | `id` | 성공 시 `true`. 사용된 snapshot ID는 재사용 불가 | Verified |
| `anvil_reorg` | `depth`, `tx_block_pairs` (`[tx, blockIndex]` 배열, `blockIndex` 0-based, `< depth`) | `depth`는 현재 체인 높이 이하. 빈 대체 블록은 `[]` | Verified |
| `anvil_rollback` | `depth` (선택, 기본 1) | 블록을 제거만 하고 대체 블록 생성 안 함. `depth`는 현재 체인 높이 이하 | Verified |
| `evm_reorg`, `evm_rollback` | - | 별칭 없음으로 표기 | Verified (문서상 없음) |
| `hardhat_snapshot`, `hardhat_revert` | - | 문서에는 `evm_` 별칭만 나열 | Verified (문서상 없음) |

- 도입 Foundry 버전: **Unverified**. 검색으로 확인하지 못함. 참고 링크(확인 안 함): foundry-rs/foundry issue #7966, PR #11934.
- 로컬 확인 방법: `anvil --version` 후 `rpc_modules` 또는 호출 시 "method not found" 여부 확인.

## 5. Drizzle ORM: Cloudflare D1 / drizzle-kit

| 항목 | 내용 | 상태 |
|---|---|---|
| D1 공식 지원 | "fully supports the Cloudflare D1 database and Cloudflare Workers environment" | Verified |
| 드라이버 import | `import { drizzle } from 'drizzle-orm/d1'`, `drizzle(env.BINDING)` | Verified |
| 설치 | 문서는 `drizzle-orm@rc`, `drizzle-kit@rc` 사용 | **Stale 주의**: RC 기준, 현재 안정 버전 여부 Unverified |
| drizzle-kit 설정 | `dialect: 'sqlite'`, `driver: 'd1-http'`, `accountId`, `databaseId`, `token` | Verified |
| D1 HTTP로 가능한 명령 | `migrate`, `push`, `introspect`, `studio` | Verified |
| `generate` (D1) | D1 전용 문서 설명 없음. 일반 generate 흐름만 확인 | Unverified |
| wrangler 마이그레이션 디렉터리 | `d1_databases[].migrations_dir` | Verified |
| `wrangler d1 migrations apply` | 공식 Drizzle 페이지에 없음 (Cloudflare 측 명령) | Unverified (Drizzle 문서 기준) |
| SQLite ALTER 제약 및 테이블 재생성 | 공식 Drizzle 문서에서 확인 못 함. 커뮤니티/릴리스 노트 기준: 복합 FK 추가/삭제, PK 변경, FK 컬럼 변경 시 `__new_` 테이블 생성 → 복사 → 삭제 → 이름 변경 | **Unverified** (2차 출처) |
| D1 실패 패턴 | 같은 마이그레이션에서 컬럼 추가 + 재생성 시 `INSERT ... SELECT`가 없는 컬럼 참조해 실패 가능. 기본값 변경도 재생성 유발 | Unverified (커뮤니티) |

- 권장: 생성된 `.sql`을 적용 전에 읽고, 단순 컬럼 추가는 `ALTER TABLE ... ADD COLUMN`으로 수동 편집 검토. 로컬과 원격 모두 적용 확인.

## 6. expo-device 루트 / 탈옥 감지

| 항목 | 내용 | 상태 |
|---|---|---|
| API | `Device.isRootedExperimentalAsync()`. 이름에 Experimental 포함 | Verified |
| 플랫폼 | Android, iOS, tvOS, Web (Web은 항상 `false`) | Verified |
| 오류 | 시스템 파일 접근 불가 시 `ERR_DEVICE_ROOT_DETECTION` | Verified |
| Android 한계 | `su` 실행 파일 경로 탐색. 비루팅 기기에도 `su`가 있을 수 있어 오탐 가능 | Verified |
| iOS 한계 | 탈옥 체크 기반. 은닉 도구(예: xCon)로 우회 가능 | Verified |
| 잘못된 정보 | 검색 요약에서 "isDeviceRooted" 또는 "isDeviceJailbroken" 프로퍼티 언급. 공식 문서와 불일치 | **Stale/오류 주의** |
| jail-monkey | `JailMonkey.isJailBroken()`. v3.0.0부터 New Architecture 지원, 2.x는 Old Architecture용 | Unverified (npm/GitHub 기준 확인 필요) |
| jail-monkey Expo 호환 | 네이티브 모듈이라 Expo Go 불가, development build 필요로 추정 | **Unverified** |
| `root-jailbreak-detection-expo` | Expo 대안. 관리형 Expo 지원 여부 Unverified | Unverified |

- 주의: 루트 감지는 위험 신호일 뿐 보안 경계가 아님. 서버 측 검증과 병행.

---

## 권장 조치 (사실 기반)

- Expo push: 프로덕션 발송 전 EAS 대시보드에서 해당 설정 활성화 후 서버 측 `Authorization: Bearer` 헤더 추가 여부 점검.
- Queues: `max_retries`, DLQ, 메시지 단위 `delaySeconds`로 설계. `retry_delay` 키는 사용하지 말 것(공식 확인 안 됨).
- MMKV: V4 설치 시 `react-native` 0.76 이상, Nitro 패키지 동시 설치, `prebuild` 필요.
- 루트 감지: `isRootedExperimentalAsync`는 보조 신호로만 사용하고 jail-monkey 등 대안은 버전 확인 후 도입.

## 출처

Expo
- https://docs.expo.dev/push-notifications/sending-notifications/ (access token, UNAUTHORIZED)
- https://docs.expo.dev/push-notifications/push-notifications-setup/ (설정 언급 없음 확인용)
- https://docs.expo.dev/versions/latest/sdk/device/ (isRootedExperimentalAsync)

Cloudflare Queues
- https://developers.cloudflare.com/queues/configuration/configure-queues/ (max_retries 기본값, consumer 설정)
- https://developers.cloudflare.com/queues/platform/limits/ (max_retries 100, delaySeconds 24h, visibilityTimeout 12h)
- https://developers.cloudflare.com/queues/configuration/dead-letter-queues/ (DLQ 설정, 4일 보관)
- https://developers.cloudflare.com/queues/configuration/batching-retries/ (msg.retry, retryAll, 백오프 직접 구현)

react-native-mmkv
- https://raw.githubusercontent.com/mrousavy/react-native-mmkv/main/README.md (V4, 0.76+, Expo 설치, encryption)
- https://newreleases.io/project/github/margelo/react-native-mmkv/release/v4.0.0 (old architecture 0.82까지, 2차 미러)
- https://newreleases.io/project/github/margelo/react-native-mmkv/release/v4.0.0-beta.5 (createMMKV, remove, 2차 미러)
- https://newreleases.io/project/github/margelo/react-native-mmkv/release/v4.3.2 (최신 버전, 2차 미러)

Foundry anvil
- https://www.getfoundry.sh/anvil/rpc-methods (anvil_reorg, anvil_rollback, anvil_snapshot, anvil_revert)
- https://getfoundry.sh/reference/anvil/ (CLI 플래그만 있음, RPC 메서드 없음)
- https://github.com/foundry-rs/foundry/issues/7966 (도입 버전 확인 필요, 미확인)
- https://github.com/foundry-rs/foundry/pull/11934 (도입 버전 확인 필요, 미확인)

Drizzle
- https://orm.drizzle.team/docs/connect-cloudflare-d1 (D1 지원, 드라이버, wrangler 설정)
- https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit (drizzle.config.ts, d1-http, migrate)
- https://orm.drizzle.team/docs/drizzle-kit-generate (SQLite 재생성 관련 내용 없음)
- https://newreleases.io/project/npm/drizzle-orm/release/0.34.0 (SQLite 재생성 관련, 2차)
- https://tessl.io/registry/skills/github/jezweb/claude-skills/d1-migration (D1 실패 패턴, 커뮤니티)

루트 감지
- https://www.npmjs.com/package/jail-monkey (npm, 확인 필요)
- https://github.com/gantman/jail-monkey (GitHub, 확인 필요)
