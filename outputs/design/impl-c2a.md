# VaultMe C2a 구현 기록

작성일: 2026-10-13 · 범위: tokens + i18n + Expo 앱 뼈대 + UI primitive + 정적 화면 · 근거: [LLD](lld.md) §1, §1.1, §2, §12 · 앞 단계: [C1](impl-c1.md)

## 1. 만든 것

```text
packages/
├─ tokens/   build.mjs (Style Dictionary), src/generated/{light,dark,tokens}.ts (생성, git 제외), test/
└─ i18n/     src/ko.ts (타입 있는 ko 문구), src/index.ts (i18next 인스턴스), test/
apps/mobile/
├─ app/                    route 파일만. src/pages를 re-export
│  ├─ _layout.tsx, index.tsx (S01), precheck.tsx (S02), send.tsx, receive.tsx, review.tsx, kit.tsx
│  └─ (tabs)/ _layout.tsx, home.tsx, activity.tsx, settings.tsx
└─ src/
   ├─ shell/providers.tsx  I18nextProvider + ThemeProvider + StatusBar (FSD app layer. 이름 변경: 7장)
   ├─ pages/               start, precheck, home, receive, send, review, activity, settings, kit
   ├─ widgets/review-panel C15 (정적)
   ├─ features/push-optin  S50 시트
   ├─ entities/            account, asset, transaction (fixture만)
   └─ shared/              theme, lib/address, ui (primitive 14개)
```

- `turbo.json`: `typecheck`, `lint`, `test`가 `^build`에 의존한다. `build`는 `src/generated/**`를 출력으로 가진다.
- tokens는 `build` 때 생성한다. 생성물은 commit하지 않는다 (`.gitignore`). tokens의 `typecheck`, `lint`, `test` script는 먼저 `build`를 돌린다. 그래서 `pnpm -r`만 써도 된다.
- `wallet-core`는 건드리지 않았다.

## 2. tokens

- 입력: `outputs/wallet-foundation.tokens.json` (Tokens Studio 형식: `{ value, type }`, alias `{경로}`).
- Style Dictionary 5가 이 형식을 그대로 읽는다. 그래서 `@tokens-studio/sd-transforms`는 쓰지 않았다.
- alias에 layer 접두어가 없다 (`{color.neutral.0}`). preprocessor가 `primitive.`, `semantic.`, `component.`를 붙인다. 두 layer에 같은 경로가 있으면 build가 실패한다.
- 출력: RN용 값으로 푼다. `16px` → `16`, `Semi Bold` → `'600'`, typography는 `lineHeight`, `letterSpacing`을 px 숫자로 바꾼다. 그림자는 RN shadow prop으로 바꾼다. easing은 숫자 4개이다.
- `type`, `font` primitive는 composite 원본이라 출력에서 뺐다. 앱은 `semantic.typography.*`를 쓴다.
- 그룹 안의 키가 `value`이면(`portfolioBalance.value`, `addressBlock.value`) SD가 그룹을 token으로 읽는다. 키를 잠시 `__value`로 바꿨다가 출력에서 되돌린다.
- Theme 타입은 값을 넓힌 타입이다. `light`와 `dark`가 같은 타입이다.

## 3. Dark mode (2026-10-13 수정)

- 임시 `dark.json`은 삭제했다. 승인된 값은 Figma `02 Semantic`(`VariableCollectionId:2:151`)의 `Dark` mode(`298:0`)에서 읽기 전용으로 읽었다. 94개 중 Light와 다른 60개가 모두 기존 Primitive alias이다.
- `outputs/wallet-foundation.tokens.json`에 Tokens Studio 방식으로 넣었다: 최상위 set `semanticDark`(60개 override), `$metadata.tokenSetOrder`, `$themes`(Light, Dark). 기존 path와 값은 그대로이다. 기록은 `vaultme-v2-migration.md`에 있다.
- `build.mjs`는 `semantic` 위에 `semanticDark`를 덮어서 Dark를 만든다. Component 값은 alias로 따라온다.
- 테스트: text 3종이 surface 4종 위에서, status fg가 bg 위에서 4.5:1 이상이다. Light와 Dark 모두 통과한다.
- 확인하지 못한 것: Tokens Studio에서 실제 import. `work/build_foundation.py`(alias 검증)는 이 workspace에 없어 실행하지 못했다.

## 4. i18n

- `ko` 문구는 ux-copy.md와 ux-terminology.md에서 가져왔다. 이번 화면에 쓰는 것만 넣었다.
- 타입 있는 key: `declare module 'i18next'`로 `CustomTypeOptions`를 넣었다. `t('home.send')`가 타입 검사를 받는다.
- 인스턴스는 `initAsync: false`이다. resource가 inline이라 동기로 초기화된다.
- 테스트: key 조회, 금지 용어(`전송`, `송신`, `가스비`, `시드`, `니모닉`, `Testnet`)가 없음.
- S22 본문의 고정 시각 `09:41`은 뺐다 (ux-copy 일관성 메모의 "시안 흔적").

## 5. 앱

### UI primitive (`src/shared/ui`)

| 파일 | 컴포넌트 | 비고 |
|---|---|---|
| Button | C01 | Primary, Secondary, Ghost. 누름 scale 0.97, 120ms (`motion.duration.fastMs`, `easing.standard`). 라벨 2줄. `minHeight`를 쓴다. Reduce Motion이면 scale을 끈다 |
| Input | C03 | 테두리는 기능 이유만 (기본, focus, error) |
| StatusNotice | C25 | tone 6종. 색과 함께 Phosphor icon과 제목 |
| AssetRow | C09 | 가격 없음 문구 |
| ActivityRow | C10 | 상태는 단어로 표시 |
| AddressBlock | C26 | 4글자 묶음. 접근성 label은 묶음마다 글자를 띄어 읽는다. 다른 묶음 강조 |
| ProductHeader | C22 | |
| PortfolioBalance | C23 | Unavailable quote 상태 |
| ListItem | C31 | value, disclosure, custom(Switch) |
| Switch | C29 | |
| Segmented | C30 | |
| BottomSheet | C32 | 최대 높이 90%, 내용만 scroll, 버튼 고정. 열기 250ms `(0.32,0.72,0,1)`, 닫기 200ms (`baseMs`). Reanimated 사용 |
| SensitiveReveal | C33 | 기본 가림. 탭하면 보임. 앱이 foreground를 벗어나면 다시 가림 |
| Text, Screen | 공통 | |

- Reanimated 4.5.1은 Expo 기본 template에 있는 라이브러리이다. 새로 정한 것이 아니다.
- 색과 숫자 spacing은 token에서만 온다. ESLint `no-restricted-syntax`가 hex, rgb, 간격 키의 0 초과 숫자를 막는다. 임시 파일로 막히는 것을 확인했다.
- 예외 상수 두 개: 누름 scale `0.97`, sheet 열기 `250ms` 및 easing. token이 없다.

### 화면 (정적, fixture)

| 화면 | route |
|---|---|
| S01 시작 | `/` |
| S02 시작 전에 확인 | `/precheck` |
| S10 Home 신규(백업 안내) | `/home` |
| S10 Home 복구 | `/home?variant=restored` |
| S30 받기 (임시 QR 상자, 진짜 QR 없음) | `/receive` |
| S50 시트 (받기 위) | `/receive?sheet=1` |
| S20 보내기 입력 | `/send` |
| S22 검토 | `/review` |
| S22 검토 High risk (Danger notice + 다른 묶음 밑줄) | `/review?risk=1` |
| S40 내역 | `/activity` |
| S60 설정 | `/settings` |
| 개발용 primitive 갤러리 | `/kit` |

- 탭: 자산, 내역, 설정. `animation: 'none'`으로 전환 애니메이션이 없다.
- 테마: `useColorScheme`로 OS를 따른다. 앱 안 토글이 없다.
- fixture 주소는 임의 hex이다. 실제 주소나 키가 아니다. 복구 구문은 어디에도 없다. `/kit`은 `word` 자리 표시자만 쓴다.
- 비어 있는 동작: 확인하고 보내기, 백업 시작, 복사, 공유, QR 스캔. wallet-core 연결은 C2b이다.

## 6. 버전 (lockfile 기준, 정확한 값)

| 패키지 | 버전 |
|---|---|
| Expo SDK | 57 (`expo` 57.0.26) |
| expo-font / react-native-svg / phosphor-react-native | 57.0.4 / 15.15.4 / 3.0.6 |
| @expo-google-fonts/inter / ibm-plex-mono | 0.4.2 / 0.4.1 |
| expo-router / expo-constants / expo-linking / expo-status-bar | 57.0.24 / 57.0.20 / 57.0.11 / 57.0.1 |
| react / react-native | 19.2.3 / 0.86.3 |
| react-native-reanimated / react-native-worklets | 4.5.1 / 0.10.1 |
| react-native-safe-area-context / react-native-screens | 5.7.0 / 4.26.2 |
| i18next / react-i18next | 26.4.2 / 17.0.15 |
| style-dictionary | 5.6.0 |
| typescript, vitest, eslint | C1과 같다 |

- 최신 `expo`는 57.0.28이다 (2026-10-12). `minimumReleaseAge` 때문에 pnpm이 7일 지난 57.0.26을 골랐다. `package.json`에는 `~57.0.0`으로 썼다. 최신 patch는 정확히 맞추지 못했다.
- `style-dictionary` 5.6.1(10월 10일)도 같은 이유로 5.6.0이다.

## 7. LLD와 다른 점

| 항목 | 내용 | 이유 |
|---|---|---|
| 글꼴 | 추가함: Inter 400/500/600/700, IBM Plex Mono 400/500 (`@expo-google-fonts/*`, `expo-font`). 무게마다 파일이 달라 `fontFamily`에 무게를 넣고 `fontWeight`는 쓰지 않는다 (`shared/theme/fonts.ts`). 무게별 subpath import로 font 6개만 번들한다 | Foundation typography. LLD §2에 3행 추가함 |
| 아이콘 | 추가함: `phosphor-react-native` 3.0.6 (regular), peer `react-native-svg` 15.15.4. Button icon slot, StatusNotice, AssetRow(대체 icon), ActivityRow 상태, ListItem, 탭에 쓴다. 장식 icon은 스크린 리더에서 숨긴다 | `wallet-icon-guide.md`. 자산 identity SVG(ETH, USDC 원본)는 아직 없다. AssetRow는 중립 fallback icon을 쓴다 |
| FSD app layer 이름 | `src/shell/`로 바꿨다 (LLD는 `src/app/`) | `src/app/`이 있으면 Expo Router가 그것을 route root로 쓴다. 그러면 root `app/`이 무시된다. 처음에는 이것을 놓쳐서 route 없이 번들됐다. 지금은 4700 module로 실제 route가 번들된다 |
| C23 위치 | `shared/ui`에 두었다. `widgets/portfolio-balance`가 아니다 | props만 받는 단순 컴포넌트라 widget을 만들지 않았다 |
| Switch 크기 | 52×32 (`control_lg` × `avatar_sm`). Figma는 51×31 | Switch token이 없다. raw 숫자를 쓸 수 없다 |
| C29–C33 token | Component token이 없어 Semantic token을 썼다 | packages/tokens/test/hierarchy.test.ts |
| typedRoutes | 끔 | `.expo/types` 생성에 의존하지 않기 위해서 |
| 새 라이브러리 | `expo-font`, `@expo-google-fonts/inter`, `@expo-google-fonts/ibm-plex-mono`, `phosphor-react-native`, `react-native-svg`(위 참조), `expo-constants`, `expo-linking`, `expo-status-bar`, `react-native-screens`, `react-native-safe-area-context`, `react-native-worklets`, `react-native-reanimated` | 모두 Expo Router와 Reanimated의 필수 의존이다 |
| Metro | 설정 파일 없음 | SDK 52+는 monorepo를 자동 설정한다. pnpm isolated install로 번들 성공 |
| 탭 route | `/home` | `(tabs)/home.tsx`. route 이름은 영어 |
| `create-expo-app` | 쓰지 않았다 | template가 `src/app`을 route로 쓰고 sample 코드가 많다. LLD는 `app/`을 요구한다. version만 template에서 참고했다 |

## 8. 확인 결과

| 명령 | 결과 |
|---|---|
| `pnpm -r typecheck` | 통과 (5 project) |
| `pnpm -r lint` | 통과 |
| `pnpm -r test` | 통과. wallet-core 61, tokens 19, i18n 2, mobile 3 |
| `pnpm turbo run build typecheck lint test` | 13 task 성공 |
| `npx expo export --platform ios` | 통과. 4700 module, font ttf 6개. Phosphor는 barrel import라 module이 많다 |
| `tokens` build | 통과. alias 해결 실패 없음 |

## 9. Simulator

실패했다. 시도는 2번이다.

1. `npx expo run:ios --no-bundler`
   - `CommandError: No iOS devices available in Simulator.app`
   - 같은 때 `pod install`도 실패했다: `Unicode Normalization not appropriate for ASCII-8BIT (Encoding::CompatibilityError)`. CocoaPods 1.17.0, Ruby 4.0.7 (Homebrew). 한글이 있는 경로나 locale 때문인 것으로 보이나 확인하지 못했다.
2. `xcrun simctl create test-iphone "iPhone 17"` → `Could not find an available runtime for device type 'iPhone 17'`
   - 원인: Xcode 27.0(27A266a)은 있으나 iOS Simulator runtime이 설치돼 있지 않다. `xcrun simctl list runtimes`가 비어 있다. Simulator SDK(iphonesimulator27.0)는 있다.
   - runtime을 받으려면 큰 다운로드가 필요하다. 승인 없이 받지 않았다.

그래서 스크린샷이 없다. Runtime 다운로드는 소유자 결정을 기다린다. `work/c2a/screens/`는 만들지 않았다. 화면은 bundle과 타입 검사로만 확인했다. **눈으로 본 확인은 아직 없다.**
`run:ios`가 만든 `ios/` 폴더는 지웠다. `.gitignore`에 `ios`, `android`, `.expo`를 넣었다.

## 10. 하지 않은 것

- wallet-core 연결, 실제 주소와 키 (C2b)
- Keychain, MMKV, 앱 잠금, 생체 인증
- 카메라와 QR 스캔, 실제 QR 생성 (AGENTS.md judgment rule 3)
- Push, API, `contracts` package
- S03–S06, S23, S24, S31, S41, S50 이외 시트, 위험 확인 시트(S22L+ACK)
- 자산 identity SVG (ETH, USDC 원본)
- Steiger, Prettier, Stylelint, CI
- Figma 대조 (screenshot 비교)
- `git init`과 commit

## 11. 열린 질문

1. 새 `$themes`/`semanticDark`가 Tokens Studio import를 깨지 않는지 확인한다 (`build_foundation.py`가 없다).
2. 자산 identity SVG(ETH, USDC)를 어떻게 싣는가?
3. Phosphor barrel import를 icon별 import로 바꿀까? (module 수, 번들 시간)
4. Switch(51×31), sheet 열기 250ms, 누름 scale 0.97을 Foundation token으로 올리는가?
5. iOS Simulator runtime(`xcodebuild -downloadPlatform iOS`)을 받아도 되는가? CocoaPods 한글 경로 오류도 따로 풀어야 한다.

## 12. 다음 단계

- **C2b**: `features/send`, `features/backup`, `features/restore`가 wallet-core를 부른다. Keychain, MMKV, OS 인증. 나머지 화면(S03–S06, S23, S41, S90).
- **C3**: API (Hono, Workers), `contracts` package, `/v1/rpc`, `/v1/history`.
- 그 전에 Simulator를 준비해서 화면을 눈으로 확인한다. Figma `11 Prototype`과 나란히 비교한다.
