# Design System 벤치마크 (VaultMe Foundation vs 레퍼런스)

작성: 2026-10-13 · 범위: 읽기 전용 웹 조사. 확인 못한 것은 "확인 못함"으로 표시.

## 0. 결론 먼저

- 현재 Foundation(C01–C28)은 **첫 버전 출시에 충분하다.** 필수 변경 없음.
- 빈 곳은 **화면 레벨 부품**이다 (Switch, Segmented, 단어 칩, 설정 행, QR 프레임). 작은 컴포넌트 5개면 메운다.
- Dark mode는 **첫 버전에 안 해도 된다.** 다만 토큰 구조는 이미 Semantic 레이어가 있어서 나중에 추가 가능.
- 한글 폰트는 **Pretendard 하나로 통일**이 가장 단순하다. (Hangul 포함, Inter 기반)

## 1. 출처 표

| # | 출처 | URL | 확인 상태 |
|---|---|---|---|
| 1 | CDS 소개 | https://cds.coinbase.com/getting-started/introduction | 직접 열람 |
| 2 | CDS 홈 | https://cds.coinbase.com | 직접 열람 |
| 3 | CDS 설치/요구사항 (검색 요약) | https://cds.coinbase.com/guides/integrate-with-build-tools | 검색 요약만 |
| 4 | CDS GitHub | https://github.com/coinbase/cds | 검색 결과로만 확인. 직접 열람 안 함 |
| 5 | getdesign.md | https://getdesign.md | 직접 열람 |
| 6 | designsystem.one | https://designsystem.one | **접속 실패** (TLS 인증서가 vdx.nl용. 다른 사이트로 보임) |
| 7 | MetaMask design system repo | https://github.com/MetaMask/metamask-design-system | 직접 열람 (README 수준) |
| 8 | Uniswap interface repo | https://github.com/Uniswap/interface | 검색 요약만 |
| 9 | 지갑 주소 포이즈닝 연구 | https://arxiv.org/html/2508.12107v1 | 검색 요약만 |
| 10 | Trust Wallet 주소 포이즈닝 보호 | https://cointelegraph.com/news/trust-wallet-address-poisoning-protection-32-evm-chains | 검색 요약만 |
| 11 | Trust Wallet 안전 가이드 | https://trustwallet.com/blog/academy/top-5-tips-to-stay-safe-with-defi-wallets | 검색 요약만 |
| 12 | Pretendard | https://cdn.jsdelivr.net/npm/pretendard@1.3.9/docs/en/README.md | 검색 요약만 |
| 13 | Expo Font | https://docs.expo.dev/versions/latest/sdk/font.md | 검색 요약만 |

## 2. 레퍼런스별 발견

### Coinbase CDS
- 오픈소스. React DOM + React Native 둘 다 지원. 소스를 최대한 같게 유지한다고 함. [1]
- 패키지: `@coinbase/cds-web`, `@coinbase/cds-mobile`. [2]
- 컴포넌트 분류: Layout, Typography, Inputs, Media, Cards, Data Display, Feedback, Overlay, Navigation, Charts, Numbers, Animation, Other. [2]
- Theming: `ThemeProvider` + `useTheme`. light/dark 지원. [1][3]
- 스타일: StyleProps로 theme 값 접근. 웹은 빌드 시 atomic CSS. [1]
- 숫자/상태 관련 컴포넌트 이름: `RollingNumber`, `DotStatusColor`. 사용 지침은 해당 페이지에 없음. [1]
- 컴포넌트 수 "120개 이상"은 서드파티 글 주장. 공식 확인 못함.
- 토큰 체계 이름, 폰트 정책, 주소 표시 규칙: **확인 못함.**
- 시사점: CDS는 범용 제품군이라 크다. VaultMe는 지갑 특화 28개로 범위가 더 좁고 맞다. 가져올 것은 "Switch/Tag/Segmented 같은 기본 입력군이 있다"는 사실 정도.

### getdesign.md
- AI 코딩 에이전트용 `DESIGN.md` 모음. 550개 이상 사이트 분석. 색/타이포/간격/컴포넌트 설명. [5]
- Coinbase, Revolut, Wise, Stripe, Binance, Kraken 등 있음. **지갑 전용(MetaMask 등) 파일은 목록에서 못 봄.** [5]
- 시사점: 참고용 분위기/색 확인에는 쓸 수 있음. VaultMe는 자체 Foundation이 있으므로 도입 이유 약함. 라이선스/품질 확인 못함.

### designsystem.one
- **접속 불가.** 인증서가 vdx.nl용이라 다른 조직 사이트로 보인다. 내용 확인 못함. 지갑/핀테크 제공 여부 확인 못함. 추측하지 않음.

### MetaMask Design System (MMDS)
- 모노레포. 패키지 6개: design-system-react, design-system-react-native, design-system-shared, tailwind-preset, twrnc-preset, design-tokens. [7]
- RN 컴포넌트 목록, dark mode: README에 없음 → **확인 못함.**
- 시사점: 토큰 → RN/Web 패키지 분리 구조. VaultMe의 Primitive/Semantic/Component → RN theme 변환과 같은 방향.

### Uniswap Wallet
- 공개 repo에 web/mobile/extension 앱과 공유 UI 패키지 존재. [8]
- 요청에서 말한 "Spore"라는 이름은 **검색에서 확인 못함.**

### Rainbow / Phantom / Rabby / Coinbase Wallet / Trust Wallet
- 시드 구문 표시/검증, send review, 빈 상태, 설정, QR 화면의 구체 UI: **이번 조사에서 1차 자료를 못 찾음 → 확인 못함.** (앱 직접 설치/스크린샷 비교가 필요한 영역)
- Trust Wallet: 백업 중 스크린샷 차단, 의심 주소 DB 대조(EVM 32체인). [10][11]
- 연구(arXiv): 피싱 주소 전송 시 명확한 경고를 보여준 지갑은 소수. [9]
- Rabby/Phantom이 악성 거래 사전 필터링 예시로 언급됨. 구체 기능은 확인 못함. (Rabby 사칭 도메인 주의: rabby.pw가 피싱으로 표시됨)
- 일반 합의(출처 종합, 일부는 내 합성): 전체 주소 표시, 필수 백업 검증, 유사 주소 경고.
- VaultMe는 이미 이 셋을 설계함 (ux-flow: S03 캡처 차단, S04 확인, S22 전체 주소 4글자 분할 + 유사 주소 확인).

### 한글 타이포
- Pretendard: Inter + Source Han Sans + M PLUS 1p 기반. Hangul 내장. 별도 한글 fallback 불필요. [12]
- React Native `fontFamily`는 CSS식 fallback 목록이 아니라 단일 이름. [검색 요약, 1차 확인은 못함]
- Expo: `expo-font` config plugin(빌드 시 임베드, 권장) 또는 `useFonts`. [13]
- 굵기는 파일별 family 이름으로 등록하는 방식이 일반적 (일반 지식, 출처 확인 못함).
- Mono(주소/hash)는 숫자와 영문만이라 IBM Plex Mono 유지 가능.

## 3. 비교표 (우리 Foundation vs 레퍼런스)

| 영역 | VaultMe Foundation | 레퍼런스 | 판단 |
|---|---|---|---|
| 버튼/아이콘 버튼/입력 | C01–C03 | CDS Inputs 군 | 충분 |
| 상태 표시 | C05 Status label 6종, C25 Notice 5종 | CDS DotStatusColor/Feedback | 충분. 우리가 더 지갑 특화 |
| 주소 표시 | C11, C26 (Compact/Full), 4글자 분할 | 규칙 문서 못 찾음 | 충분 |
| 금액/수수료 | C13, C14, C22/C23 | CDS Numbers (RollingNumber) | 충분. 애니메이션 숫자는 불필요 |
| 빈/로딩/오류 | C27 | CDS Feedback | 충분 |
| 서명/승인 | C16–C18, C20, C21, C15 등 | 일반 라이브러리엔 없음 | 우리 강점 (첫 버전은 미사용 가능) |
| 토글 | **없음** | CDS Inputs 군에 있을 가능성 (확인 못함) | 갭 |
| 12/24 선택 | **없음** | — | 갭 (대안: Button Secondary 2개) |
| 시드 단어 그리드 | **없음** | 지갑 앱 공통 패턴 (1차 자료 확인 못함) | 갭 |
| 설정 행 (disclosure) | **없음** | List/Cell류 일반적 | 갭 |
| QR 스캔 프레임 | **없음** | — | 갭 (카메라 영역은 네이티브) |
| Dark mode | Light만 | CDS, ThemeProvider light/dark | 선택 |
| RN 코드 지원 | Figma + tokens JSON | CDS/MMDS는 코드 패키지 제공 | 구현 단계에서 theme 변환 필요 |
| 한글 폰트 | Inter (Hangul 없음) | Pretendard | 갭 (작지만 확실) |

## 4. 추천

### 고치지 않아도 되는 것
| 항목 | 이유 | 노력 |
|---|---|---|
| C01–C28 전체 구조 | 첫 버전 화면 S01–S92를 모두 덮음. 레퍼런스에 없는 서명/승인/주소 규칙까지 있음 | — |
| Primitive/Semantic/Component 토큰 3층 | MMDS, CDS와 같은 방향. 변경 불필요 | — |
| Light만 지원 | 첫 버전 범위에 dark 요구 없음. 나중에 Semantic만 추가하면 됨 | — |
| IBM Plex Mono (주소/hash) | 숫자/영문 전용이라 한글 문제 없음 | — |
| 전체 주소 + 4글자 분할, 유사 주소 확인 | 연구에서 경고 부재가 약점으로 지적됨. 우리는 이미 설계함 | — |
| getdesign.md / CDS 도입 | 자체 Foundation이 있어 중복. 이득 작음 | — |

### 추가 권장 (작은 것)
| 항목 | 이유 | 노력 |
|---|---|---|
| Pretendard로 한글+라틴 통일 (또는 한글 텍스트만 Pretendard) | Inter에 Hangul 없음. RN은 fallback 목록 없음. Pretendard는 Inter 기반이라 Latin 모양도 비슷 | S |
| 설정 행 (Settings row, disclosure 포함) | S60–S63 Settings 화면에 필요. Card/Group + 텍스트로 임시 가능하지만 반복됨 | S |
| Switch | S62, S63 on/off. 네이티브 `Switch`로 대체 가능. Figma엔 모양 정의만 | S |
| 시드 단어 칩 (번호 + 단어, 상태: 기본/숨김/오류) | S03/S04/S05 핵심 화면. 보안 UX라 일관성 가치 큼 | S |
| Segmented control (12/24) | S05 하나에서만 쓰임. Button 2개로 대체 가능하면 생략 | S |

### 선택 사항
| 항목 | 이유 | 노력 |
|---|---|---|
| QR 스캔 프레임 오버레이 | 카메라 뷰는 네이티브. 프레임/가이드 문구만 정의하면 됨 | S |
| Dark mode | 출시에 불필요. 필요해지면 Semantic 값 세트 추가 + 대비 검증 | M |
| RN 코드용 theme 변환 (tokens JSON → theme 객체) | 구현 단계에서 필요. MMDS식 패키지 분리는 과함 | M |
| 지갑 앱(MetaMask, Rainbow 등) 직접 설치 비교 | 이번 조사로 확인 못한 영역(시드 UI, send review, 빈 상태) 보완 | M |
| 알림/오류 문구 한글 UX 라이팅 | 디자인 시스템과 별개. ux-flow의 문구 초안 확정 단계 | M |

## 5. 확인 못함 목록
- designsystem.one (접속 실패)
- CDS 토큰 구조, 폰트, 주소 규칙, 컴포넌트 정확한 수
- MMDS RN 컴포넌트 목록, dark mode
- Uniswap "Spore" 존재 여부
- Rainbow/Phantom/Rabby/Coinbase Wallet/Trust Wallet의 시드 표시, send review, 빈 상태, 설정, QR 세부 UI
- RN에서 fontFamily fallback 불가 여부의 1차 문서 확인

---

## 직접 확인 (2026-10-13, 브라우저로 1차 자료 열람)

이 절은 위 내용보다 우선한다. 위에서 "확인 못함"이던 항목 일부를 직접 확인했다.

| 벤더 | 확인한 1차 자료 | 확인 결과 |
|---|---|---|
| Coinbase CDS | cds.coinbase.com 홈, Theming, 컴포넌트 목록 | 컴포넌트 약 150개. `Switch`, `SegmentedControl`, `ListCell`, `Banner`, `Tray`(bottom sheet), `Numpad`, `Stepper` 있음. light/dark `activeColorScheme`. 모든 타입 스케일에 mono 버전(`fontFamilyMono-*`). 주소·tx 전용 컴포넌트는 없음 (범용 DS) |
| MetaMask MMDS | GitHub `design-system-react-native/src/components`, `design-tokens/src/js` | RN 컴포넌트 약 70개. `Switch`, `SegmentedControl`, `ListItem`, `KeyValueRow`, `BannerAlert`, `BottomSheet`, `SensitiveText`(값 가림), `Skeleton`, `TabEmptyState`. 테마 `lightTheme`/`darkTheme`. 기본 폰트 `Inter` |
| MetaMask Mobile | `ManualBackupStep1/2`, `ProtectWalletMandatoryModal`, `SecureContentView`, `ScreenshotDeterrent`, `locales/en.json` | 복구 구문: 3열 grid, "Tap to reveal" 가림, "Make sure no one is watching your screen." Android `FLAG_SECURE`, iOS는 스크린샷 감지 후 "Safety alert" 모달. 자산 유입 후 백업 강제. 경고: `address_poisoning`("closely resembles one you've used before", 배지 "Poisoned"), 첫 송신 주소, `burn_address`, `token_contract_warning`, pending tx 있을 때 차단. 한국어(`ko.json`) 지원하지만 번들 폰트는 Inter·MMSans·MMPoly뿐 (한글 폰트 미포함 → OS fallback) |
| Uniswap | GitHub `Uniswap/interface/packages/ui` | Tamagui 기반. 폰트 Basel Grotesk + InputMono. `colorsLight`/`colorsDark`. `switch`, `QRCode`, `Unicon`(주소 아이콘), `AnimatedCopyLabel` 컴포넌트 |
| Rainbow | GitHub `rainbow-me/rainbow/src/design-system`, `src/languages` | DS는 레이아웃 primitive만 (Box, Stack, Inline, Text 등). 폰트 SF Pro Rounded. 설정에 Theme System/Dark/Light. "First time send" 표시. 한국어 locale 없음 |
| Phantom | help.phantom.com 문서 | 스팸 토큰 자동 숨김 + 숨긴 목록에서 해제 가능. verified 체크 표시. 주소록(contact list) 기능 |
| Coinbase Wallet | help.coinbase.com | 추정 URL 404. 확인 못함 |
| getdesign.md | 홈 직접 열람 | 브랜드 스타일 분석 DESIGN.md 550+ (Google DESIGN.md spec). crypto: Binance, Coinbase, Kraken, Revolut. 지갑 UX 규칙이 아니라 시각 스타일 요약 |
| designsystem.one | 직접 접속 | `ERR_CERT_COMMON_NAME_INVALID`. 우회하지 않음. 확인 못함 |
| Pretendard | GitHub README | Inter + 본고딕 + M PLUS 1p 기반, 9 굵기 + 가변 |
| Mobbin | MCP | 유료 플랜 필요. 실제 앱 스크린샷 비교 못함 |

### 이 확인으로 바뀐 판단

1. **dark mode**: 조사한 주요 4곳(CDS, MetaMask, Uniswap, Rainbow)이 모두 지원한다. "선택"에서 "업계 기본"으로 올린다. 첫 버전 필수는 아니다.
2. **한글 폰트**: MetaMask는 한국어를 지원하면서도 한글 폰트를 넣지 않았다. Inter 유지 + OS fallback도 업계에서 쓰는 방식이다. Pretendard는 "권장"에서 "선택"으로 내린다.
3. **Switch, SegmentedControl, ListItem/ListCell, BottomSheet**: CDS와 MetaMask가 둘 다 DS 컴포넌트로 둔다. Foundation에 추가할 가치가 있다 (S).
4. **값 가림(SensitiveText)과 tap to reveal**: S03·S61에 추가할 만하다. 지금 설계는 캡처 차단만 있다.
5. **송신 경고 추가 후보**: burn 주소, 토큰 컨트랙트 주소를 수신자로 넣는 경우. 지금 설계에 없다. 요구사항 결정이 필요하다.
6. **iOS 스크린샷 대응**: MetaMask는 iOS에서 막지 않고 감지 후 경고한다. 우리 설계는 expo-screen-capture로 차단이다. 구현 첫 측정 항목(iOS capture blocking)과 같이 확인한다.
