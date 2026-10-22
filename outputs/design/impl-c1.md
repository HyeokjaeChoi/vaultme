# VaultMe C1 구현 기록

작성일: 2026-10-13 · 범위: monorepo 뼈대 + `packages/wallet-core` + 테스트 · 근거: [LLD](lld.md) §1–§3, §6, §11, §14

## 1. 만든 것

```text
vaultme/
├─ package.json            private, packageManager pnpm@11.17.0, node >=24
├─ pnpm-workspace.yaml     apps/*, packages/*, minimumReleaseAge 10080, strictDepBuilds true
├─ turbo.json              build, test, typecheck, lint
├─ tsconfig.base.json      strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes
├─ .gitignore
└─ packages/
   ├─ config/              eslint.config.js (flat), tsconfig.lib.json
   └─ wallet-core/
      ├─ src/  constants, mnemonic, amount, risk, state, send, index
      └─ test/ fixtures, mnemonic, amount, risk, state, send
```

- `.npmrc`는 만들지 않았다. 필요하지 않다.
- `wallet-core`는 TS 원본을 그대로 export한다 (`exports: ./src/index.ts`). 별도 build가 없다. 앱의 번들러가 컴파일한다.
- IO는 모두 주입한다. 네트워크 호출이 없다.

## 2. wallet-core 요약

| 영역 | 내용 |
|---|---|
| 상수 | `CHAIN`, `ASSETS`, `DERIVATION_PATH`, `ABS_MAX_FEE_WEI` (0.005 ETH), `BURN_ADDRESSES` |
| 키 | `Mnemonic` class. 단어는 `#private` 필드에 있다. `toString`, `toJSON`, `inspect`, `Symbol.toPrimitive`는 마스킹 문구를 반환한다. 단어는 `reveal()`로만 나온다 |
| 검증 | `validateMnemonic`: `ok`, `wrongLength`, `unknownWord(index)`, `badChecksum` (12·24단어) |
| 금액 | `toUnits`, `fromUnits`, `maxSendable`. 반올림 없음. `Number`는 쓰지 않는다 |
| 주소 | `recipientRisk`: burn > tokenContract > lookalike > first > known. 대소문자 무관 |
| 상태 | `reduce` (표에 없는 전이는 상태 유지 + hook 호출, throw 없음), `canStartDraft` |
| 송신 | `prepare` (Review 모델), `signAndSubmit` (상한 재검사, 서명, 로컬 hash, 제출, hash 비교) |

`signAndSubmit` 결과는 상태 이벤트로 이렇게 매핑한다.

| 결과 | 이벤트 |
|---|---|
| `NeedsReview` | `FEE_CAP_EXCEEDED` |
| `Blocked` | `ABS_CAP_EXCEEDED` |
| `Pending` | `SUBMITTED(hash)` |
| `Unknown` | `SUBMIT_UNKNOWN(hash)` (hash 불일치 또는 제출 오류) |

## 3. 선택한 버전 (lockfile 기준)

| 패키지 | 버전 |
|---|---|
| pnpm | 11.17.0 |
| Node (실행 환경) | 24.14.1 |
| typescript | 6.0.3 (npm `latest`는 7.0.2. LLD대로 6.x 고정) |
| turbo | 2.11.7 |
| viem | 2.57.3 |
| @scure/bip39 | 2.4.0 (viem 내부는 1.6.0을 따로 쓴다) |
| vitest | 5.0.3 |
| fast-check | 4.10.2 |
| eslint / typescript-eslint / @eslint/js | 10.12.0 / 8.71.1 / 10.0.1 |

`minimumReleaseAge`가 켜져 있어 pnpm이 7일 미만 버전을 자동으로 피했다.

## 4. LLD와 다른 점

| 항목 | 내용 | 이유 |
|---|---|---|
| `Mnemonic` | branded string이 아니라 `class`이다 | `#private` 필드는 `JSON.stringify`, `Object.keys`에도 나오지 않는다. branded string은 단어가 값 자체에 있어 새기 쉽다 |
| `BURN_ADDRESSES` | `as const satisfies readonly Address[]` | LLD 형태 그대로. tuple 타입 유지 |
| `validateMnemonic` 반환 | `{ kind: ... }` union | LLD는 `MnemonicCheck`만 정했다. 형태는 새로 정했다 |
| `prepare` 반환 | `{ ok, review }` 또는 `{ ok: false, error }` | LLD에 오류 형태가 없다. 오류: `invalidAddress`, `invalidAmount`, `tooManyDecimals`, `zeroAmount`, `insufficientFunds`, `overAbsCap` |
| 수수료 계산 | `maxFeePerGas = 2 × baseFee + tip` | 흔한 EIP-1559 규칙. LLD에 식이 없다. C2에서 실측 후 조정 |
| 상태 | `Reviewing`에 `blocked`, `requiresAck`를 둔다. `CONFIRM`은 `ack`를 가진다 | §6 비고 "유사 주소면 명시 확인 필요"와 ABS 차단을 reducer 안에서 지키기 위함 |
| `signAndSubmit` 순서 | 절대 상한을 먼저 검사한다 | 두 상한을 모두 넘으면 차단이 더 강한 결과다 |
| lint | `Number`, `parseFloat`, `parseInt`를 `src/amount.ts`, `src/send.ts`에서 금지 | LLD §12 "lint 규칙 후보"를 적용 |
| `tsconfig` extends | `wallet-core/tsconfig.json`이 `../config/tsconfig.lib.json`을 상대 경로로 extends | package 이름 extends는 Vitest(oxc)가 읽지 못했다 |
| 새 라이브러리 | 없음. LLD §2 안의 것만 썼다 | `@eslint/js`는 typescript-eslint의 기본 짝이다 |
| 테스트 전용 d.ts | `test/node-util.d.ts` | `@types/node` 추가를 피했다 |
| CI 의존성 허용 목록 검사 | 아직 없다 | CI는 이후 단계 |
| `build` task | 정의만 했다. 패키지에 script가 없다 | 번들러가 원본을 쓴다 |

## 5. 테스트 결과

| 명령 | 결과 |
|---|---|
| `pnpm -r test` | 5 파일, 61 테스트 통과 |
| `pnpm -r typecheck` | 통과 |
| `pnpm -r lint` | 통과. 규칙이 실제로 막는지 임시 파일로 확인했다 |
| `pnpm turbo run test typecheck lint` | 3 task 성공 |

| LLD §11 위험 | 테스트 |
|---|---|
| 금액 | 예시, 쓰레기 입력 14종, 자릿수 초과, 6·18 decimals 왕복 property 2개, `maxSendable` property |
| 상태 전이 | §6 표의 각 행, 유사 주소 확인, 알 수 없는 전이 hook, 무작위 이벤트 500열 property |
| 주소 오염 | lookalike, burn, USDC 컨트랙트, 대소문자, 우선순위 |
| Mnemonic 마스킹 | `String`, template, `JSON.stringify`, `inspect`, `Object.keys` 모두 단어 없음 |
| 송신 | match → Pending, 불일치 → Unknown, throw → Unknown, 수수료 상승 → NeedsReview, 절대 상한 → Blocked. 서명자 복구 주소와 USDC `transfer` calldata 확인 |

공개 test vector (scripts/check-repo-rules.sh R10):

- `test test … junk` → `0xf39Fd6e5…2266`. 출처: viem `mnemonicToAccount.test.ts` (GitHub wevm/viem). 직접 읽어 확인했다.
- `abandon … about` → 주소는 **출처에서 확인하지 못했다**. viem으로 도출해 안정성(inline snapshot)만 검사한다. 이 줄은 출처 확인 전까지 정답 증거가 아니다.
- BIP39 검증용 `abandon … about` (12), `abandon … art` (24): trezor `python-mnemonic` vectors.json의 공개 vector이다.
- 테스트에서 만든 임의 phrase는 출력하지 않는다.

## 6. 하지 않은 것

- Expo 앱, API(Workers), web, `contracts`, `tokens`, `i18n` package
- 실제 RPC 호출, Keychain, MMKV, 생체 인증
- CI workflow, 의존성 허용 목록 검사, Renovate
- `git init`과 commit (요청대로)
- 실제 gas 추정과 fee 실측. 모두 주입값으로만 시험했다

## 7. 열린 질문

1. `abandon … about`의 예상 주소를 출처에서 확인할 것인가? (확인되면 snapshot을 값 검사로 바꾼다)
2. `maxFeePerGas = 2 × baseFee + tip` 식을 확정할 것인가?
3. `burn`과 `tokenContract`를 UI에서 차단할 것인가, 경고만 할 것인가? (지금 `wallet-core`는 경고만 낸다. `requiresAck`는 호출 쪽이 정한다)

## 8. 다음 단계

- **C2**: Expo 앱 뼈대 + Figma prototype 화면. `features/send`가 `prepare`와 `signAndSubmit`을 부른다. Keychain·MMKV를 붙인다.
- **C3**: API (Hono, Workers). `/v1/rpc` proxy, `/v1/history`, `contracts` package.

## 열린 질문 처리 (2026-10-13)

- burn·토큰 컨트랙트 주소: UI에서 막지 않는다. Q79 결정대로 Danger 경고 + 명시 확인(`requiresAck`)을 요구한다.
- 수수료 식 `maxFeePerGas = 2 × baseFee + tip`: 기본값으로 정한다. base fee가 연속으로 올라도 여러 block 동안 유효하다. 실측 후 바꾸면 결정 기록에 남긴다.
- "abandon … about" 주소: 출처 확인 전까지 snapshot 검사만 둔다. 정답 검증은 viem test suite의 vector로 한다.
