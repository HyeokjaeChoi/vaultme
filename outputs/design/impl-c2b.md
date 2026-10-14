# VaultMe C2b 구현 기록

작성일: 2026-10-14 · 범위: 개발 빌드 + 저장소 + 백업 + 복구 + 앱 잠금 + 보내기(fake ChainPort) · 근거: [LLD](lld.md), [HLD](hld.md) §5, 이슈 #17–#25 · 앞 단계: [C2a](impl-c2a.md) · 출처: 병합된 PR #26–#31, 해당 이슈와 review thread, `main`의 코드 (`ab909d2`)

## 1. 목표와 범위

- C2a의 정적 화면을 wallet-core에 연결한다. 키는 기기에 두고, 지갑을 만들고, 복구하고, 잠그고, 보낸다.
- 소유자 결정 (2026-10-14): C2b의 체인 접근은 **fake ChainPort**이다. fixture snapshot, 로컬 keccak hash, 네트워크 호출 없음. 실제 broadcast는 C3이다.
- 그래서 앱 화면은 "보내지 않았다"고 말한다. 잔액과 내역은 예시이다.

| 이슈 | PR | 내용 |
|---|---|---|
| #17 | #26 | Expo dev build (iOS, Android) |
| #18 | (Figma) | S03–S06, S23, S41, S90 프레임 |
| #19 | #27 | 보안 저장소: Keychain + 암호화 MMKV |
| #20 | #28 | 백업 S03/S04, 지갑 만들기 |
| #21 | #29 | 복구 S05/S06 |
| #22 | #30 | 앱 잠금 S90 |
| #23, #24 | #31 | 보내기 연결, 결과 S23, 거래 상세 S41 |
| #25 | 이 문서 | 구현 기록 |

## 2. 결정

### 2.1 Q 결정을 코드에 적용한 방식

| Q | 적용 | 위치 |
|---|---|---|
| Q12 | 보낼 때마다 OS 인증. phrase를 읽는 일이 인증이다. 취소하면 서명하지 않는다 | `features/send/model/runSend.ts` |
| Q13 | 백그라운드 30초 이상이면 잠금. `inactive`는 이탈이 아니다. OS 인증창 중 background는 무시한다 | `shell/lockTimer.ts`, `shell/LockGate.tsx` |
| Q15 | phrase는 화면 state에만 둔다. blur, background에서 지운다. 인증 중에 화면을 벗어나면 결과를 버린다 | `pages/backup`, `pages/restore` |
| Q16 | 복구는 백업 증거가 아니다. `backupDone`은 false로 둔다. kv `wallet.restored`가 Home과 Receive의 백업 gate를 건너뛴다 | `features/restore` |
| Q33 | Expo dev build. Expo Go 없음 | `app.json`, `devbuild.md` |
| Q34 | phrase: `BIOMETRY_ANY_OR_DEVICE_PASSCODE` + `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`, `cloudSync: false`. Android `allowBackup: false`. OS 인증은 기기 암호 fallback 허용 | `shared/storage/keychain.ts`, `shared/auth` |
| Q40 | 경로 `m/44'/60'/0'/0/0` 하나. 12단어 생성, 12/24단어 복구. passphrase 입력칸 없음, 안내만 둔다. S06에 전체 주소 | `features/restore`, `pages/restore` |
| Q43 | S03에서만 `expo-screen-capture`로 차단한다. 복사 버튼 없음. 문구는 차단을 약속하지 않는다 ("화면을 캡처하지 마세요") | `pages/backup` |
| Q47 | Pending, Unknown, 손상된 기록이면 새 보내기를 막는다. Home 보내기가 차단 시트를 연다. `runSend`도 인증 전에 거절한다 | `blocksNewSend`, `usePendingTx` |
| Q58 | `ChainPort`는 `/v1/rpc` 모양을 따른다. C3에서 어댑터만 바꾼다 | `shared/chain/port.ts` |
| Q63 | 기기 데이터는 AES-256 MMKV 하나. 암호화 key는 Keychain의 인증 없는 등급 (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`). 첫 render 전에 sync로 읽는다 | `shared/storage/kv.ts` |
| Q73 | tx hash는 서명한 raw tx에서 앱이 계산한다 (`txHash`). 수수료 상한과 총액은 `prepare()`가 낸다 | `shared/chain/fake.ts`, wallet-core |

### 2.2 그 밖의 결정

- **S05 한 칸 패턴.** 업계 패턴(MetaMask mobile, Rainbow, Trust, Phantom mobile)을 따랐다. 입력칸 하나와 붙여넣기. 12/24단어는 자동으로 센다. 목록 밖의 첫 단어를 이름으로 알린다 (`'{{word}}'는 복구 구문 단어가 아니에요.`). 12 또는 24단어일 때 "복구"가 켜진다. (이슈 #18 comment, 소유자 승인.) 칸은 여러 줄이고, Enter는 줄바꿈이다. 공백은 정규화한다.
- **주소 파생.** 주소는 `deriveAddress`로 만들 때(생성, 복구) 한 번 계산해 kv `account.address`에 둔다. Receive와 Home은 phrase 없이 주소를 보여 준다. 이미 phrase가 있고 주소가 없으면 (생성이 중간에 끊긴 경우) OS 인증 뒤 phrase에서 주소를 복구한다. 인증 실패면 던진다. phrase는 절대 덮어쓰지 않는다. 복구도 이미 저장된 phrase가 있으면 거절한다 ("이 기기에 이미 지갑이 있어요").
- **fail-closed 잠금 gate.** 루트 layout이 첫 render 전에 `openKv()` 뒤 `hasPhrase()`를 읽는다. 지갑 = kv 주소가 있거나, Keychain에 phrase가 있다. `hasPhrase()`가 실패하면 지갑이 있는 것으로 보고 잠근다. 잠금은 OS 인증만 필요하므로 지갑이 있는 사용자를 가두지 않는다. kv가 열리지 못하면 gate는 닫힌 채 빈 화면이다. 잠긴 동안에도 navigator는 mount된 채 `display: none`이다 (deep link, 유예 잠금 뒤 route 유지).
- **테스트 데이터 고지.** fake adapter(`broadcasts=false`) 동안 두 곳에 고지한다.
  - Home과 Activity: info notice "테스트 데이터예요".
  - S23과 S41: warning notice "네트워크로 보내지 않았어요 (테스트)".
  - `TestDataNotice`는 `chain.broadcasts`가 true이면 아무것도 그리지 않는다. S41의 "Etherscan에서 보기"도 같은 조건으로 숨긴다 (`explorerUrl`이 null).
- **테스트 거래 지우기.** fake adapter는 tx를 확정하지 않는다. 그러면 Q47 차단이 영원히 남는다. S41에 "테스트 거래 지우기"(확인 시트 포함)를 두었다. `broadcasts`가 false일 때만 보이고, 숨긴 Etherscan 버튼 자리를 쓴다. 지우면 새로 보낼 수 있다. `clearTestTx`는 실제 adapter에서는 아무것도 지우지 않는다. 문구는 coordinator가 승인했다 (2026-10-14).
- **"상태 다시 확인".** fake adapter에서는 `lastCheckedAt`만 갱신한다. 상태는 바뀌지 않는다.
- **제출은 했지만 기록하지 못한 경우.** kv 쓰기가 실패하면 tx를 메모리에 둔다 (`writePendingTx`). Q47 차단과 S23이 메모리 값을 읽는다. `runSend` 안에서 저장이 던지면 `Unknown`을 낸다. 깨끗한 실패로 보이면 안 된다.
- **fixture 주소.** EIP-55 checksum 주소로 바꿨다. wallet-core `isAddress`가 옛 혼합 대소문자를 거절해 `prepare`가 실패했다.
- **보내는 계정.** 저장된 주소. 지갑이 없으면 fixture 계정.
- **dev 전용 fixture.** `?demo=1` 경로(`/backup`, `/backup/check`, `/restore`, `/restore/done`)와 `?backedUp=1`, `?variant=restored`는 `__DEV__`에서만 동작한다. placeholder 단어("단어 N")만 쓴다. demo는 실제 `backupDone`을 쓰지 않는다.
- **Hermes에 Web Crypto가 없다.** 루트 layout 맨 위에서 `expo-crypto`로 `crypto.getRandomValues` polyfill을 넣는다. wallet-core(@noble)가 import 때 읽기 때문에 import 순서가 중요하다.

### 2.3 Review에서 바뀐 것

CodeRabbit 지적 중 코드를 바꾼 것만 적는다.

- #27: `deletePhrase`는 reset이 false이고 항목이 남아 있을 때만 던진다. `openKv`는 어떤 초기화 실패든 cache를 비워 재시도할 수 있게 한다.
- #28: 인증 결과는 blur, background에 버린다 (generation counter). 캡처 차단(`preventScreenCaptureAsync`)을 phrase 로드 앞에서 await한다. 차단이 실패하면 보여 주지 않는다. S04에서 background로 가면 세션과 답을 지우고 S03(가림)으로 돌아간다. `kvReady`는 `openKv()`가 성공해야 true이다. precheck는 화면을 떠났으면 `router.replace`를 하지 않는다. `focusable={false}`는 TalkBack 위험으로 되돌렸다.
- #29: 클립보드 읽기는 요청 counter가 현재이고 앱이 active일 때만 적용한다.
- #30: navigator는 mount된 채 둔다. `hasPhrase()`는 첫 render 전에 읽는다. 실패는 잠금이다.
- #31: 저장 실패한 tx는 메모리에 둔다. review 화면 비교 캡처(s22)를 추가했다.

## 3. 구조

```text
apps/mobile/
├─ app/                      route 파일만. src/pages를 re-export
│  ├─ _layout.tsx            polyfill → 글꼴 → openKv → hasPhrase → LockGate → Navigator
│  ├─ backup/{index,check}.tsx, restore/{index,done}.tsx
│  ├─ send/{index,amount,result}.tsx, review.tsx, activity/[hash].tsx
│  └─ (C2a route 그대로)
├─ plugins/withSceneLifecycle.js   iOS 27 UIScene 요구 대응 (템플릿이 따라잡으면 삭제)
└─ src/
   ├─ shell/        LockGate, lockTimer (순수 reducer), providers
   ├─ pages/        backup, restore, lock, send, activity/detail 외
   ├─ widgets/      review-panel, test-data-notice
   ├─ features/
   │  ├─ backup/    createWallet, check (3단어), useBackupDone, useAccountAddress
   │  ├─ restore/   phrase (inspectPhrase), restoreWallet, useRestored
   │  └─ send/      runSend, useReviewCore, usePendingTx, clearTestTx
   ├─ entities/     account, asset, transaction (fixture, EIP-55 주소)
   └─ shared/
      ├─ storage/   keychain.ts (phrase, kv key), kv.ts (MMKV 동기 helper)
      ├─ auth/      authenticate (ok / cancelled / error / unavailable), inProgress
      ├─ chain/     port.ts (ChainPort), fake.ts, index.ts (adapter 하나)
      └─ lib/       crypto-polyfill 외
```

### shared/storage

- `keychain.ts`: `savePhrase`, `loadPhrase`, `hasPhrase`, `deletePhrase`, `biometryType`, `getOrCreateKvKey`.
- `loadPhrase`는 던지지 않는다. `ok`, `cancelled`, `error`를 돌려준다. 취소는 오류 메시지의 `/cancel/i`로 가린다. 오류는 phrase를 싣지 않는다. 로그도 쓰지 않는다.
- MMKV key는 `expo-crypto`의 16 byte를 32자 hex로 만든 값이다. 한 번 만들고 재사용한다.
- `kv.ts`: `openKv()`를 부팅 때 한 번 await한다. 그 뒤 helper는 모두 동기이다: `backupDone`, `wallet.restored`, `account.address`, 잠금 설정과 상태, `pendingTx`, fake nonce.
- 손상된 `pendingTx`는 던진다. "없음"으로 읽으면 Q47 차단이 풀리기 때문이다.

### shared/auth

- `authenticate(reason)`는 `expo-local-authentication`, `disableDeviceFallback: false`이다. 보호 수준이 NONE이면 `unavailable`이다.
- `withAuthInProgress`가 OS 인증 중임을 표시한다. 잠금 timer는 이 구간의 background를 무시한다. Keychain의 phrase 저장과 읽기도 같은 표시를 쓴다.

### shared/chain

- `ChainPort { getSnapshot, submit, broadcasts }`. `getSnapshot`은 `eth_getBalance`, `balanceOf`, nonce, gas 추정, fee history에 해당한다. `submit`은 `eth_sendRawTransaction`이다.
- fake adapter: fixture 잔액, nonce는 kv 카운터, gas limit ETH 21000 / USDC 65000, base fee 1.5 gwei, tip 0.5 gwei, hash는 `keccak256(raw)`. `broadcasts = false`.
- `shared/chain/index.ts`의 `chain` export 한 줄이 C3에서 바뀐다.

### features

- `backup`: `createWallet(prompt)`는 12단어를 만들고, 인증 뒤 저장하고, 주소를 kv에 둔다. S04는 12개 중 무작위 3개 위치를 오름차순으로 묻는다. S03은 S04에 그 3단어만 메모리로 넘긴다.
- `restore`: `inspectPhrase`는 단어 수와 첫 비목록 단어를 판단한다. `restoreWallet`은 검증하고, 덮어쓰지 않고, 저장하고, 주소를 계산한다.
- `send`: `useReviewCore`가 `prepare()`로 Review의 수수료, 상한, 총액을 낸다. 확인하면 (비슷한 주소 시트 ACK) → `loadPhrase` → 새 snapshot → `signAndSubmit`. 결과는 `Pending`, `Unknown`, `NeedsReview`(Review를 새 값으로 갱신하고 notice), `Blocked`, `Cancelled`(조용히), `AuthError`, `ChainError`, `PendingExists`.
- wallet-core 변경: `txHash`, `isMnemonicWord`, `Address/Hash/Hex` 타입 re-export, `PendingTx.fee?`.

### 새 의존성 (모두 Expo 호환 버전)

`react-native-keychain ^10`, `react-native-mmkv ^4.3.2` + `react-native-nitro-modules`, `expo-screen-capture`, `expo-crypto`, `expo-local-authentication`, `expo-clipboard` (native; dev build를 다시 만들어야 한다), `expo-dev-client`.
`app.json`: `NSFaceIDUsageDescription`(ko), Android `package app.vaultme.mobile`, `USE_BIOMETRIC`, `allowBackup: false`, scheme `vaultme`.

## 4. 화면과 Figma

Figma 파일 `NMXrn0q75G1SX2Bn1L1jP8`, page 13 Redesign A. 소유자 승인 2026-10-14. 모든 프레임 `audit.js` 0.

| 화면 | route | Figma node |
|---|---|---|
| S03 phrase (가림) | `/backup` | C2b-S03H `364:849` |
| S03 phrase (공개) | `/backup` (탭 뒤) | C2b-S03R `364:929` |
| S04 단어 확인 | `/backup/check` | C2b-S04 `364:1030` |
| S05 복구 입력 | `/restore` | C2b-S05 `364:1107` |
| S05E 모르는 단어 | `/restore` | C2b-S05E `368:1112` |
| S06 복구 완료 | `/restore/done` | C2b-S06 `365:965` |
| S22 검토 | `/review` | R-S22 `336:390` |
| S23 보내기 결과 | `/send/result` | C2b-S23 `365:1049`, Dark `365:1345` |
| S41 거래 상세 | `/activity/[hash]` | C2b-S41 `365:1171` |
| S41 테스트 모드 | `/activity/[hash]` | C2b-S41 Test mode `371:1344` |
| S10R 테스트 데이터 | `/home` | C2b-S10R Test data `370:1126` |
| S40 테스트 데이터 | `/activity` | C2b-S40 Test data `370:1195` |
| S90 잠금 | 앱 전체를 덮는 `LockPage` (route 아님) | C2b-S90 `365:1285` |

- 비교 캡처: `work/c2b/compare/` (`README.md`에 행별 차이). 앱은 iPhone 18 Pro simulator 402×874 pt, Figma는 390×844.
- S90에는 Figma dark 프레임이 없다. dark 캡처는 앱 쪽만 있고 값은 token mode에서 온다. S03H, S05E도 같다.
- 알려진 차이: S03 가림 카드 240 pt (token) vs Figma 210. S04에 autofocus 없음. S05 Figma는 칸이 focus로 그려지고 "단어 1…" 텍스트를 쓴다 (앱은 이를 비목록 단어로 본다. 캡처는 실제 목록 단어를 썼다). S90 Mark icon 32 vs Figma 30 (token).

## 5. 검증

### 자동

- CI (`ab909d2`, `main`): `scripts/check-repo-rules.sh` + `pnpm turbo run typecheck lint test` 통과.
- 테스트 수 (최신 CI): mobile 73, wallet-core 64, tokens 19, i18n 6. 합계 162.
- 테스트는 published vector("abandon … about")와 placeholder 단어만 쓴다.
- 단위 테스트 범위: storage(mock), createWallet, backup-check, restore, lockTimer, runSend, chain-fake, review.
- UI 테스트는 없다 (React renderer 없음). 캡처 차단과 blur 때 지우기는 단위로 확인하지 못했다.

### Android emulator (`signaldock-api37`, 화면 잠금 PIN 설정)

- 개발 빌드가 `/`로 부팅한다. `/kit`의 `native: mmkv ok / keychain biometry …` 줄 (dev 전용).
- 생성: "지갑 만들기" → 한국어 인증 시트 → Home. 백업 안내 카드.
- 백업: 탭해서 보기 → 인증 → 12단어. S04 틀리면 오류, 맞으면 Receive (뒤에 Home). 캡처가 차단된다 (FLAG_SECURE).
- 복구 (published vector): S06이 `0x9858…da94`를 보인다. Home에 백업 카드가 없다. Receive가 같은 주소를 보인다. 잘못된 단어, 잘못된 checksum, 이미 지갑이 있는 경우를 캡처했다.
- 잠금: cold start → 인증 → Home. background 10초는 잠그지 않는다. 35초는 잠그고 인증창이 뜬다. 취소하면 S90에 남고 버튼이 다시 묻는다.
- 보내기: Home → 보내기 → Review → 확인하고 보내기 → 인증 → S23 Pending → 내역 보기 → 맨 위 행 → S41 (Etherscan 없음) → Home 보내기가 차단 시트를 연다.

### iOS simulator (iPhone 18 Pro, iOS 27)

- 개발 빌드가 부팅한다. 저장소 smoke 줄이 보인다.
- 잠금: `notifyutil`로 Face ID를 등록했다. 인증창과 match가 동작한다. 10초는 잠그지 않고 35초는 잠근다. 지갑이 없으면 잠그지 않는다. 이 시험은 임시 로컬 수정("지갑 있음")으로 했다. 머지된 코드에는 없다.
- 화면 비교 캡처 (S03H, S04 등)는 `?demo=1` fixture로 찍었다.

### 하지 못한 것

- 실제 Face ID와 Touch ID 기기 (7장).
- Android 생체 등록 변경 뒤 동작 (Q34).
- 캡처 차단의 iOS 버전별 실측 (Q43).

## 6. 하지 않은 것 / 알려진 한계

### 한계

- **iOS simulator는 phrase를 저장하지 못한다.** simulator에 passcode가 없다. `WHEN_PASSCODE_SET` 등급이 거절한다 (`errSecParam`). Face ID를 등록해도 같다. 그래서 iOS에서는 생성, 복구, 보내기 전체 흐름을 못 돌렸다. 이 흐름은 Android로 확인했다. iOS는 fixture(`?demo=1`)로 화면만 봤다.
- **기기 잠금 30초 미만은 못 가린다.** Q13은 기기 잠금 뒤 재인증을 요구한다. 앱은 기기 잠금과 background를 구분하지 못한다. 30초 미만의 기기 잠금은 앱을 잠그지 않는다.
- **Android 회색 상자.** adb로 hardware key를 누르면 focus 강조가 보인다 (Home, S23의 상태 pill 뒤). 터치만 쓰면 나오지 않는다. 그대로 두었다.
- **Figma frame이 없는 상태.** S23/S41의 Unknown 상태, 그리고 NeedsReview, Blocked, 인증 오류 notice는 frame이 없다. `StatusNotice` 변형을 재사용했다.
- **S23/S41의 계정, 네트워크 행**은 승인된 Figma에 없다. pending 기록에 계정 필드도 없다. 후속이다.
- **붙여넣기 버튼 미검증.** S05 붙여넣기(`expo-clipboard`)는 기기에서 시험하지 않았다. 경합은 코드로 막았다 (§2.3).
- **iOS app-switcher 미리보기.** 앱 전체에는 가림막이 없다 (ux-flow §9, Q43: S03/S61만). 잠금 화면이 미리보기에 어떻게 보이는지, S03의 차단이 iOS app-switcher를 가리는지는 실측하지 않았다.
- **취소 판단은 오류 메시지** (`/cancel/i`)에 의존한다. Android 문구는 확인하지 못했다.
- **kv 열기 실패는 빈 화면**이다. boot 오류 화면은 없다 (코드에 `ponytail` 주석).
- 잠금 켜기/끄기 설정이 없다. 문서에 정의가 없어 Settings는 그대로이다.
- 복구한 지갑은 첫 계정만 가진다 (Q40, Q16).
- 이 PR들은 로컬 CodeRabbit이 "Failed to start review"로 실패한 경우가 있었다 (#26, #27, #29). 그때는 PR review에 의존했다.

### 범위 밖

- 실제 broadcast, RPC, 내역 API (C3). 잔액과 내역은 fixture이다.
- 실제 QR 생성과 QR 스캔, Etherscan 링크 (fake 동안 숨김).
- Settings의 phrase 재열람 (S61, Q15). "복구 구문 보기" 행은 아직 아무것도 열지 않는다.
- Push, S50 실제 등록.
- 다중 계정. 자동 UI 테스트.

## 7. 실기기 체크리스트

이 시험은 사람이 실제 기기에서 한다. 결과는 PR이나 이 문서에 날짜와 함께 적는다.

### 실제 iPhone

- [ ] 지갑 만들기: Face ID 인증창이 뜬다. 문구가 `NSFaceIDUsageDescription`과 인증 문구에 맞다.
- [ ] 기기 암호가 없을 때 만들기가 오류 notice로 끝난다 ("기기에 화면 잠금을 설정한 뒤 다시 시도하세요"). 앱이 죽지 않는다.
- [ ] Keychain `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`: 기기 암호를 지우면 phrase에 접근할 수 없다. 다시 설정하면 어떻게 되는지 적는다. 새 기기로 복원해도 phrase가 따라가지 않는다.
- [ ] Face ID 등록을 바꾼 뒤에도 phrase를 열 수 있다 (`BIOMETRY_ANY`).
- [ ] S03에서 스크린샷과 화면 녹화가 막히는지 iOS 버전별로 적는다 (Q43). 막히지 않으면 Q43의 대안(스크린샷 감지 뒤 경고)이 필요하다. UI는 차단을 약속하지 않는다.
- [ ] app-switcher에서 S03이 가려지는지, 잠금 중 화면과 Home이 어떻게 보이는지 본다.
- [ ] 잠금: background 30초 미만과 이상, 기기 잠금, 앱 종료 뒤 재진입.
- [ ] 보낼 때마다 인증창이 뜬다. 취소하면 아무것도 저장되지 않는다.
- [ ] 붙여넣기 버튼 (S05).

### Android 실기기

- [ ] 생체 등록 변경 (지문 추가, 삭제) 뒤에도 phrase를 열 수 있다 (Q34). 무효화되면 기록한다.
- [ ] S03에서 스크린샷, 녹화, 최근 앱 미리보기가 막힌다 (`FLAG_SECURE`).
- [ ] 생체가 없고 PIN만 있는 기기에서 인증 fallback이 동작한다.
- [ ] 화면 잠금이 없는 기기에서 지갑 만들기와 잠금 해제가 오류 notice로 끝난다.
- [ ] 기기 인증창(자격 증명 화면)이 background로 잡혀 잠금 timer를 시작하지 않는다.
- [ ] 앱 데이터가 백업에서 빠진다 (`allowBackup: false`).
- [ ] 취소 오류 문구가 `/cancel/i`에 걸린다.
- [ ] TalkBack에서 S23/S41, 활동 행이 읽힌다.

## 8. 다음 단계

- **C3**: Hono/Workers API, `/v1/rpc`, `/v1/history`, `contracts` package. `shared/chain/index.ts`의 adapter를 실제 `/v1/rpc` adapter로 바꾼다. 내역은 API에서 받는다.
- `broadcasts`가 true가 되면 같이 지운다: "테스트 데이터예요" notice (Home, Activity), "네트워크로 보내지 않았어요 (테스트)" notice (S23, S41), "테스트 거래 지우기"와 `clearTestTx`. Etherscan 버튼이 나타난다. fixture 잔액과 내역, `fakeChain.nonce`도 지운다.
- Settings의 phrase 재열람 (S61)과 잠금 설정.
- 5장의 하지 못한 시험과 7장 체크리스트를 닫는다.
- Figma frame이 없는 상태(Unknown, NeedsReview, Blocked)와 S23/S41의 계정, 네트워크 행을 정한다.
