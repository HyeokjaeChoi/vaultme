# VaultMe C3 모바일 구현 기록 (실제 ChainPort, API client)

작성일: 2026-10-14 · 범위: 이슈 #43 (C3-6) · 근거: [LLD](lld.md) §3–§5, [HLD](hld.md) §3–§4, [C2b](impl-c2b.md) §8 · 앞 단계: [C2b](impl-c2b.md)

## 1. 한 일

| 부분 | 위치 | 내용 |
|---|---|---|
| API client | `apps/mobile/src/shared/api/client.ts` | `X-App-Version` 전송, `@vaultme/contracts` schema로 응답 검증, 오류 envelope 해석 |
| 기기 key | `shared/api/deviceKey.ts` | P-256 key 생성, compact r‖s 서명, base64url |
| 설치 인증 | `shared/api/client.ts` | `POST /v1/installs` 등록, 서명한 `POST /v1/installs/token`, token cache |
| 실제 ChainPort | `shared/chain/real.ts` | `POST /v1/rpc` 위의 `ChainPort` (`broadcasts = true`) |
| 모드 전환 | `shared/chain/index.ts` | `EXPO_PUBLIC_API_URL`이 있으면 실제, 없으면 fake |
| 내역 adapter | `shared/api/history.ts` | `POST /v1/history` + kv cache (Q58) + 404면 로컬 기록 |

## 2. 결정

- **오류 해석.** `ApiError.code`는 contracts의 `ErrorCode` 또는 `network`, `Unknown`이다. 모르는 code는 `Unknown`이다 (Q61). 426은 envelope이 없어도 `update_required`이다. UI(S91)는 #44이다. 여기서는 타입 오류로 노출만 한다. `clock_skew`도 같다.
- **기기 key.** `@noble/curves` 1.9.1의 `p256`을 쓴다. viem이 이미 끌고 오는 버전이라 lockfile에 이미 있다. `@noble/hashes` 1.8.0도 같다. 둘 다 정확한 버전으로 고정했다 (pnpm `minimumReleaseAge` 7일 충족). 개인 key는 Keychain의 인증 없는 등급(`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, MMKV key와 같은 등급)에 hex로 둔다. phrase 등급은 쓰지 않는다. installId는 kv에 둔다.
- **서명.** 서명 대상은 contracts의 `canonicalString`이다. 서명은 `SHA-256(canonical)`에 대한 ECDSA P-256 compact r‖s(64 byte)이다. 서버의 WebCrypto 검증과 같은 byte이다. 테스트가 WebCrypto로 검증한다. 이 서명은 token 발급에만 쓴다 (LLD §4.1).
- **등록 순서.** key를 먼저 저장하고 등록한다. 등록 전에 죽어도 다시 등록하면 된다. key가 사라졌으면 installId도 버리고 새로 시작한다. 서버가 설치를 모르면(`unauthorized`, 예: 로컬 D1 초기화) 같은 key로 한 번 다시 등록한다.
- **token.** 메모리에만 둔다. `expiresAt` 60초 전에 새로 받는다. 동시 요청은 하나의 발급 요청을 공유한다. API가 `401 unauthorized`를 주면 새 token으로 한 번만 다시 시도한다.
- **ChainPort.**
  - 잔액: `eth_getBalance`, `eth_call`(USDC `balanceOf`, 허용 목록 모양 그대로).
  - nonce: `eth_getTransactionCount`, `pending`. 대기 중인 tx가 있으면 nonce가 올라가 wallet-core가 `NeedsReview`를 낸다.
  - 수수료: `eth_feeHistory(1, latest, [])`의 마지막 `baseFeePerGas`(다음 block)와 `eth_maxPriorityFeePerGas`.
  - gas: `eth_estimateGas`. ERC-20은 20% 여유를 더한다. node가 추정을 거절하면(JSON-RPC error, 예: 잔액 부족) 기본값 21000 / 65000을 쓴다. 그러면 `prepare()`가 진짜 이유(`insufficientFunds`)를 낸다. 전송 실패는 그대로 던진다.
  - 제출: `eth_sendRawTransaction`. 로컬 hash와 비교는 wallet-core `signAndSubmit`이 한다 (Q73). 다르면 `Unknown`이고 앱은 로컬 hash를 보관한다. 제출 오류도 `Unknown`이다.
  - receipt: `getReceipt`를 port에 추가했다. S41 "상태 다시 확인"이 쓴다. receipt가 있으면 상태를 `Included`로 바꾼다. 그러면 Q47 차단이 풀린다.
- **OS 인증.** 보낼 때마다 `loadPhrase`가 인증한다 (Q12). 바꾸지 않았다.
- **fake 모드를 남겼다.** API 없이 개발하고 테스트하려면 필요하다. fake에서는 "테스트 데이터예요", "네트워크로 보내지 않았어요", "테스트 거래 지우기", fake nonce가 여전히 필요하다 (fake tx는 확정되지 않아 Q47 차단이 영원하다). 이미 `broadcasts` 값으로 가려져 있어서 실제 모드에서는 보이지 않는다. 그대로 두었다.
- **실제 모드에서 예시 데이터를 숨긴다.** Activity는 예시 행을 그리지 않고, 실제 pending 행만 그린다. Home 잔액은 `getBalances`로 읽고, 읽기 전/실패면 `—`이다.
- **내역.** body는 `{address, cursor}`이다. 응답 형태는 아직 정해지지 않았으므로(#42) 그대로 돌려준다. 첫 page만 kv에 cache하고 가져온 시각을 같이 둔다. 404는 로컬에 기록한 보낸 tx를 돌려준다. 그 밖의 오류는 cache(+오류)를 돌려주고, cache가 없으면 던진다. `update_required`는 항상 던진다. 화면에는 아직 연결하지 않았다 (#44).

## 3. 로컬 `wrangler dev`로 앱 실행

1. API (한 번만): `cd apps/api && cp .dev.vars.example .dev.vars`. `TOKEN_SECRET`을 `openssl rand -base64 48` 값으로 바꾼다. 그다음 `pnpm db:migrate:local`, `pnpm dev` (포트 8787). `INFURA_KEY`, `ALCHEMY_KEY`가 없으면 `/v1/rpc`는 500이다. 등록과 token은 동작한다. 실제 잔액과 전송을 보려면 두 key가 필요하다 (본인 key, 출력 금지).
2. 앱: `EXPO_PUBLIC_API_URL`을 정하고 Metro를 시작한다. 값은 build 때 번들에 들어가므로 바꾸면 Metro를 다시 시작한다 (`npx expo start -c`).

| 실행 환경 | `EXPO_PUBLIC_API_URL` |
|---|---|
| iOS simulator | `http://localhost:8787` |
| Android emulator | `http://10.0.2.2:8787` |
| 실제 기기 | 같은 망의 PC IP, 예: `http://192.168.0.10:8787` |

- Android는 평문 HTTP가 막힐 수 있다. dev build가 `localhost` 외 평문을 거절하면 `usesCleartextTraffic`을 dev에서만 켠다 (아직 시험하지 않았다).
- 값을 비우면 fake 모드이다.

## 4. 검증

- `pnpm turbo run typecheck lint test`, `scripts/check-repo-rules.sh` 통과.
- 새 테스트 (mobile 73 -> 108, mock fetch, 네트워크 없음):
  - 서명: contracts의 vector 문자열을 앱 입력으로 다시 만들고, noble 서명을 WebCrypto로 검증한다. key와 서명이 contracts의 `PublicKey`, `Signature` 형태이다.
  - client: 등록 1회, token 재사용, 만료 전 갱신, 401 한 번 재시도, 설치 재등록, 426, 모르는 code, `clock_skew`, 네트워크 오류, JSON-RPC error, null result.
  - ChainPort: 메서드별 request 모양, 잔액/가스/수수료 파싱, 추정 거절 fallback, 나쁜 응답.
  - 송신: node가 다른 hash를 주면 `Unknown`, 같은 hash면 `Pending`, 제출 오류면 `Unknown`.
  - 내역: cache, 404 fallback, 오류 시 cache, `update_required`.
- 로컬 `wrangler dev` (D1 로컬 migrate, RPC key 없음)에 실제 client 코드를 붙여 확인했다: `POST /v1/installs` 201, 서명한 `POST /v1/installs/token` 200 (서버가 서명을 검증함), `POST /v1/rpc` 500 (key 없음, 예상), `POST /v1/history` 404 (예상).
- `expo export --platform ios`가 `EXPO_PUBLIC_API_URL`을 준 상태로 성공했다 (Metro가 `@noble/*`, contracts를 해석함).

## 5. 하지 못한 것 / 한계

- Android emulator와 iOS simulator에서 앱을 실행해 보지 않았다. Keychain 기기 key 저장과 kv installId는 단위 테스트에서 mock이다.
- 실제 Sepolia 전송과 잔액은 확인하지 못했다 (RPC key 없음).
- `Included`는 receipt가 있다는 뜻이다. reverted(Failed)와 `safe` 확정(Q37)은 구분하지 않는다. 화면은 `Included`를 "블록에 포함됨"(ux-terminology)으로 그린다. 실패와 확정은 #44에서 정한다.
- 보내기 직후 Pending이 영원히 남지 않게 "상태 다시 확인"을 눌러야 한다. 자동 재조회는 없다.
- Activity는 실제 모드에서 pending 한 건만 보인다. API 내역은 #42(서버)와 #44(화면)가 끝나야 보인다.
- 사용자에게 보이는 `network`, `unavailable`, `update_required`, `clock_skew` 문구와 화면은 없다. 오류는 지금 `ChainError` 등으로만 드러난다.
- `getBalances` 실패는 `—`로만 보인다.

## 6. 이슈 #44 (화면과 상태)

- **상태 판정.** `features/send/model/txState.ts`의 `deriveState`. receipt가 `safe` block 이하면 성공=Confirmed, reverted=Failed. 위면 Included. receipt가 없고 `safe` 기준 nonce가 우리 nonce보다 크면 Replaced (Q77). 시간만으로는 바꾸지 않고 자동 재송신도 없다 (Q22). `ChainPort`에 `getSafeBlock`, `getSafeNonce`를 더했다.
- **자동 재확인.** S41, S23이 focus일 때 Pending, Included를 15초마다 확인한다. blur, 백그라운드, 최종 상태에서 멈춘다. Unknown은 수동 "상태 다시 확인"만.
- **내역.** `POST /v1/history` 응답 형태는 #42가 정할 때까지 임시 형태(`{ items: [...] }`)로 읽는다 (`features/history/model/view.ts`). 404는 이 기기의 보낸 tx만 보인다.
- **426.** API client가 `onUpdateRequired`를 부르면 `shell/UpdateGate`가 앱을 S91로 바꾼다. 스토어 URL은 자리표시자다 (TODO).
- **확인.** Android emulator에서 mock API(`http://10.0.2.2:8787`)로 평문 HTTP 요청이 동작함을 확인했다.
