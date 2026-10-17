# VaultMe Redesign B 최종 검수 (1차 + 2차 전체)

날짜: 2026-10-17. 리뷰어: Staff Product Designer(consumer fintech, crypto wallet) + YC founder. 한 번에 검토했다.
범위: `work/v9/screens/*.png` 142장(71 Light/Dark 쌍)을 모두 봤다. Figma `NMXrn0q75G1SX2Bn1L1jP8`은 읽기 전용 `get_metadata`만 썼다(S41 `460:4988`).
방법: impeccable `critique`(native라서 Assessment A만)와 `audit.native`. 색 문제는 PNG 픽셀 값을 직접 읽어서 확인했다(아래 "근거" 열).
기준 문서: 이전 리뷰 2개, `outputs/design/redesign-b.md` §9(다시 따지지 않는다), `PRODUCT.md`, `outputs/design/ux-copy.md`, `outputs/wallet-icon-guide.md`, commit `170e4d3` `b52f359` `c2a454b`.
Mobbin MCP는 로그인이 필요해서 쓰지 않았다. 참고 앱은 이름만 적었다.

## 판정

**아직 production grade가 아니다. 그러나 가깝다.**
- 1차 리뷰의 P0 3개 중 2개는 고쳤다. 1개는 부분만 고쳤다.
- 1차 P1 11개 중 9개는 고쳤다.
- Dark canvas `#11161D`는 맞다. 모든 Dark 화면에서 확인했다(픽셀 `#11161D`).
- 남은 문제는 대부분 "실행 버그"다. 디자인 방향 문제가 아니다. Token에 묶이지 않은 `#000000` 색, 바닥에 붙지 않은 sheet, 옛 Home 배경이 있다.
- P0 3개와 P1 8개를 고치면 Coinbase Wallet, Phantom, Toss 옆에 놓을 수 있다.

| 그룹 | 점수 /10 | 한 줄 이유 |
|---|---|---|
| Onboarding (S02, S03) | 7 | 체크 행, 흐림 가림, 버튼 잠금은 좋다. 화면에 유효한 BIP39 구문이 있다(P0-3) |
| Home (S10, S50) | 7 | 칩, 숫자 hero, 최근 내역, 백업 행은 좋다. 빈 지갑에서 버튼 순서가 바뀐다. Light 계정 아이콘이 `#000` |
| Asset detail (S11) | 6 | 고유 정보는 생겼다. 정보 블록이 빈약하다. 컨트랙트 주소를 복사할 수 없다 |
| Send input (S20a, S20b) | 7 | 자판 화면은 Toss 수준이다. 최근 주소 보조 줄이 Light에서 `#000`이다 |
| Review + risk (S22*) | 8 | 이번 배치에서 가장 좋다. 위험 흐름, Banner 위계, 캡션 규칙이 맞다. Lookalike sheet가 바닥에 붙지 않는다 |
| Results (S23, S24) | 7 | 진행 표시와 버튼 구성은 고쳤다. 테스트 모드 Pending이 아직 모순이다. S24 뒤 Home이 옛 화면이다 |
| Receive (S30, S31) | 8 | 실제 QR, 헤더 칩, 계정 행. S31에 Hangul 고아 글자가 있다 |
| Activity (S40) | 7 | 행 구성은 production 수준이다. Light에서 받은 금액이 초록이 아니고 `#000`이다 |
| Tx detail (S41) | 7 | 시각 행, 테스트 모드 문구, 하단 버튼 정리는 고쳤다. 접힌 선 아래(해시, Etherscan)를 PNG로 확인할 수 없다 |
| Settings + license (S60, S61, S64) | 6 | 그룹과 계정 블록은 좋다. 라이선스 목록이 손으로 만든 불완전한 목록이고 전문이 없다 |
| Brand / lock (S01, S90–S92) | 5 | 브랜드 마크와 가운데 정렬은 좋다. 잠금의 Face ID 상태 문구가 `#000`이라 Dark에서 안 보이고, 아이콘과 줄이 어긋난다 |
| Dark mode | 7 | Canvas와 band는 맞다. 잠금 문구, S50 Secondary, sheet drag handle이 Dark에서 사라진다 |

Native audit(Figma 근거, 코드 아님): Accessibility 2/4 · Performance n/a · Theming 3/4 · Platform conformance 3/4 · Adaptivity n/a.
가장 큰 a11y 문제: Dark 잠금 문구 대비 약 1:1(P0-1). Light에서 색만 다른 받음 금액이 사라졌다(P1-2).

## 이전 지적 상태

### 첫 리뷰 Top 10 (`pd-review-2026-10-17.md`)

| # | 항목 | 상태 | 근거 |
|---|---|---|---|
| 1 | 한글 타이포, 숫자 700, 단위 분리 | 고침 | 모든 hero가 700 숫자 + 분리 단위다. 줄바꿈 고아 글자는 P1-5 |
| 2 | 회색 구획 띠 | 고침 | 검토·결과·상세·설정·자산 상세에 band. Home·내역은 흰색 |
| 3 | Review 3블록 + 위험 버튼 | 고침 | 비용이 hero 줄("총 … 차감 예상")로 첫 화면에 들어왔다 |
| 4 | Results 끝 장면 | 대부분 고침 | 진행 표시, 버튼, 실제 수수료. 테스트 모드 Pending만 남음(P0-2) |
| 5 | 행마다 token identity | 고침 | Light 받음 금액 색 회귀만 남음(P1-2) |
| 6 | 받기 실제 QR | 고침 | `work/v9/qr-decode-proof.json` match true. 앱 CI 해독 테스트는 아직 없다 |
| 7 | 로고 마크, 브랜드 화면 | 부분 | S01·S90·S91 가운데 정렬 + 마크. 잠금 문구 버그(P0-1) |
| 8 | Haptics, motion | 부분 | Home·설정 노트는 있다(`batch2-last.js`). 자판·위험 sheet·확정·실패 노트는 저장소에서 찾지 못했다 |
| 9 | Home 채우기 | 고침 | 칩, 최근 내역 3개, 백업 행, 첫 실행 sheet |
| 10 | 알림 2단계, 꺼진 Primary | 고침 | Banner 제목 600, 꺼진 버튼 `neutral.100` |
| 작은 | 최근 주소, 자산 상세, 설정 그룹, 흐림 가림, 빈 내역 | 고침 | 자산 상세 품질은 P2-1 |

### 1차 리뷰 P0 / P1 (`pd-review-batch1-2026-10-17.md`)

| # | 항목 | 상태 | 근거 |
|---|---|---|---|
| P0-1 | Light 안전 문구 잘림 | 고침 | `send-s20a-recipient-valid`, `send-s20b-amount-error` 모두 보인다 |
| P0-2 | 끝난 거래에 "예상" 수수료 | 고침 | Included·Confirmed·Failed·S41 "네트워크 수수료". Replaced는 행 없음 |
| P0-3 | 테스트 모드 모순 | 부분 | S41은 고침("테스트 거래예요", 상태 "예시", info badge). S23 Pending 테스트 모드는 아직 모순(새 P0-2) |
| P1-1 | Review 첫 화면에 비용 없음 | 고침 | hero 아래 "총 0.050042 ETH 차감 예상" |
| P1-2 | Banner 제목 굵기 | 고침 | 모든 Banner 제목 600 |
| P1-3 | 오류 상태 캡션 | 대부분 고침 | chainError·needsReview·blocked·pendingBlock·prepareError에서 숨김. Rechecking(꺼진 버튼)에는 남음(P2-12) |
| P1-4 | 최근 주소 mono 덩어리 | 부분 | 앞뒤 강조, chevron, 보조 줄은 고침. 보조 줄 색이 Light `#000`(P1-2) |
| P1-5 | 현재 단계 구분 | 고침 | 끝 = 꽉 찬 success, 현재 = ring, 아직 = 빈 원 |
| P1-6 | Results 버튼 | 고침 | "확인" + "거래 상세 보기". Failed에 "다시 보내기" 추가(§9) |
| P1-7 | Tx detail 시각, "홈으로" | 고침 | 시각 행, 하단 버튼 삭제. Etherscan 행은 Figma에만 있고 PNG 밖(P1-7) |
| P1-8 | Unknown·Replaced 금액 | 고침 | Unknown `text/secondary`, Replaced 취소선 |
| P1-9 | Dark sheet Secondary 사라짐 | 부분 | 위험 sheet 3개, S24, 지우기 sheet는 고침. S50 알림 sheet "나중에"는 아직 글자만(P1-4) |
| P1-10 | Pending 경고 문구 | 고침 | Pending·Included 같은 문구. 줄바꿈 고아는 P1-5 |
| P1-11 | S31 경고 2개 | 고침 | 빈 상태 구성. 아이콘·칩 위치는 P2-6 |

### 1차 리뷰 P2

| # | 상태 | 메모 |
|---|---|---|
| P2-1 Hangul 줄바꿈 | 부분 | pendingBlock은 고침. S23 Pending/Included, S31은 남음(P1-5) |
| P2-2 위험 중 안심 캡션 | 고침 | 확인 뒤 다시 보인다. 소각 확인 뒤는 P2-3 |
| P2-3 Lookalike 파란 안내 | 고침 | `text/secondary` info 줄 |
| P2-4 prepareError 버튼 | 고침 | Secondary "금액 수정" |
| P2-5 지우기 sheet 순서 | 고침 | §9 결정대로 "취소" Primary, "지우기" danger Secondary |
| P2-6 S30 칩, QR 크기 | 고침 | 헤더 칩, QR 약 220, 계정 행 |
| P2-7 S40 error-noCache | 고침 | 빈 상태 구성. 아이콘 의미는 P2-5 |
| P2-8 S40 테스트 Inline | 고침 | 칩만 남음 |
| P2-9 빈 내역 Duotone 색 | 고침 | 파랑 50% |
| P2-10 Dark Banner 채움 | 부분 | 아직 진하다. 새 canvas에서는 견딜 만하다 |
| P2-11 탭 바 선택 | 부분 | 비선택 라벨이 회색으로 낮아졌다. `list` 아이콘은 내역으로 읽기 어렵다(P2-14) |
| P2-12 Pending badge 갈색 | 부분 | `#A9660A`로 밝아졌다. 흰 glyph 대비 3:1 확인은 기록이 없다 |
| P2-13 아이콘 카탈로그 문구 | 확인 안 함 | `work/v9/icons/icons-catalog.png`는 이번 범위 밖 |
| P2-14 오류 시 최대값 | 고침 | 오류 아래 "보낼 수 있는 금액 1.284732 ETH" |
| P2-15 Motion·haptic 노트 | 부분 | 첫 리뷰 #8과 같음 |

### 1차 리뷰 Copy 표

| 화면 | Before → 요청한 After | 상태 |
|---|---|---|
| S22 받는 사람 캡션 | "…확인하세요." → "…확인해 주세요." | 고침 |
| S23 Pending 경고 | "보냈어요. 다시 보내지 마세요." → "이미 네트워크에 보냈어요. 같은 거래를 다시 보내지 마세요." | 고침(줄바꿈은 P1-5) |
| S23 Included 경고 | "다시 보내지 마세요." → 같은 문구 | 고침 |
| S23·S41 수수료 라벨 | "예상 네트워크 수수료" → "네트워크 수수료" | 고침 |
| S23 Replaced 수수료 | 행 삭제 | 고침 |
| S41 테스트 hero 제목 / 본문 / 상태 | "테스트 거래예요" / "이 기기에서 만든 예시예요. 네트워크로 보내지 않았어요." / "예시" | 고침 |
| S23 Pending 테스트 경고 2개 | 한 줄 "테스트 거래예요. 네트워크로 보내지 않았어요." | 부분: 줄은 합쳤다. hero와 진행 표시는 그대로라 모순(P0-2) |
| S22L sheet 본문 | 2줄로 | 고침 |
| S22L sheet 안내 줄 | "아래 빨간 글자가 다른 부분이에요" | 고침 |
| S40 error-cached 본문 | "아래는 10월 13일 09:12에 받은 내역이에요." | 고침 |
| S41 지우기 sheet 본문 | "지우면 다시 보내기를 시험할 수 있어요." | 고침 |
| S20a 보조 줄 위치 | 주소 아래 2줄 | 고침 |
| S23 하단 버튼 | "확인 / 거래 상세 보기" | 고침 |

## 새 Findings

### P0: 코드 전에 반드시 고친다

**P0-1. 잠금 화면의 Face ID 상태 문구가 `#000000`이다. Dark에서 보이지 않는다.**
- 화면: `brand-s90-lock-faceid-dark.png`(안 보임), `brand-s90-lock-faceid.png`.
- 근거: 두 모드 모두 문구 픽셀이 `#000000`이다. Dark 배경은 `#11161D`다. 대비가 약 1.1:1이다.
- 두 번째 문제: Face ID 아이콘(y≈778)과 문구(y≈760)의 세로 중심이 다르다. 아이콘이 문구 왼쪽 아래로 떨어져 있다.
- 왜 P0인가: 사용자는 앱을 열 때마다 이 화면을 본다. 상태 문구가 유일한 피드백이다. 색이 token에 묶이지 않았다는 증거이기도 하다(`audit.js`가 놓쳤다).
- 고침:
  - 문구 fill을 `text/secondary`에 묶는다.
  - 아이콘(`face`, Solar `face-scan-circle`)과 문구를 가로 Auto layout 한 줄로 묶는다. Align center, gap `space/2`(8), 높이 56(실패 상태 버튼 자리와 같게).
  - `audit.js`에 "TEXT fill이 variable에 묶이지 않음 = 0" 검사를 추가한다. 아래 P1-2와 같은 원인이다.
- 참고: Toss, KakaoBank 잠금은 상태 줄을 마크 바로 아래 또는 버튼 자리에 한 줄로 둔다.

**P0-2. 테스트 모드 Pending 결과가 아직 "보내는 중"이라고 말한다.**
- 화면: `send-s23-pending-testmode(-dark).png`.
- 문제: 제목 "보내는 중이에요", 본문 "네트워크 처리를 기다리는 중이에요", 진행 표시 "보냄" 단계 초록 완료. 바로 아래 줄은 "네트워크로 보내지 않았어요". 1차 P0-3과 같은 모순이 이 화면에 남았다. PRODUCT.md "관찰한 범위만 완료로 기록"을 어긴다.
- 고침: S41 테스트 모드와 같은 hero를 쓴다.
  - badge `info` Bold. 제목 "테스트 거래예요". 본문 "이 기기에서 만든 예시예요. 네트워크로 보내지 않았어요."
  - 진행 표시는 숨긴다. 진행 표시는 실제 네트워크 상태 전용이다(§9 "결과 진행 표시").
  - 경고 줄은 지운다. 칩 "테스트 데이터"가 이미 알린다.
  - "예상 네트워크 수수료" 행도 숨긴다. 보내지 않은 거래는 수수료가 없다(S41 테스트 모드도 같다, P2-11).

**P0-3. 화면에 유효한 BIP39 복구 구문과 그 주소가 있다.**
- 화면: `onboarding-s03-revealed*`, `onboarding-s03-revealed-checked*`. 주소 `0x9858…da94`는 `send-s30-receive*`, `settings-s60*`에도 있다.
- 문제: "abandon ×11 + about"은 공개된 test vector다. 체크섬이 맞는 실제 구문이다. 첫 계정 주소가 `0x9858EfFD…EcaEda94`다(QR proof의 expected 값과 같다). AGENTS.md Foundation 4는 "실제 recovery phrase를 Figma에 넣지 않는다"고 한다. 첫 리뷰도 "단어1…" placeholder를 맞다고 했다.
- 위험: 공개 키라 돈을 잃지는 않는다. 그러나 이 화면을 복사한 코드·문서·스크린샷이 "유효한 구문 예시"를 퍼뜨린다. 규칙 위반을 검수가 통과시킨 선례가 된다.
- 고침(하나 선택):
  1. 권장: 단어를 체크섬이 맞지 않는 placeholder로 바꾼다(예: "단어 1" … "단어 12", 또는 BIP39 목록에 없는 글자). 주소도 체크섬 없는 예시로 바꾼다. QR proof를 다시 만든다.
  2. 오너가 "공개 test vector는 실제 구문이 아니다"라고 명시해서 예외를 기록한다. 그러면 P0에서 뺀다.

### P1: 출시 전에 고친다

**P1-1. Sheet가 화면 바닥에 붙지 않는다.**
- 화면: `send-s22l-lookalike-sheet(-dark)`, `activity-s41-testmode-clear-sheet(-dark)`.
- 문제: sheet 아래 끝이 y≈795에서 멈춘다. home indicator 영역에 뒤 화면이 보인다. Lookalike에서는 뒤의 "위험 확인하기" pill이, 지우기 sheet에서는 "예상 네트워크 수수료" 행이 sheet 아래로 보인다. 소각·토큰·첫 실행 sheet는 바닥까지 채운다. 같은 component인데 결과가 다르다.
- 고침: `B/Sheet` 프레임을 바닥 constraint(Bottom)로 고정한다. 아래 padding은 `space/4`(16) + safe area 34로 둔다. 모든 sheet 프레임을 같은 instance로 맞춘다.
- 참고: iOS 기본 sheet, Phantom confirm sheet는 항상 바닥까지 채운다.

**P1-2. Light에서 token에 묶이지 않은 `#000000` 글자·아이콘이 있다.**
- 화면과 근거(픽셀 값):
  - `activity-s40-list`, `-testmode`, `-unknown-replaced`, `-error-cached`: 받은 금액 "+12.5 USDC"가 `#000000`이다. Home은 `#116D48`(초록)이다. Dark는 초록이다. Light 내역에서만 받음과 보냄이 같은 검정이다.
  - `send-s20a-recipient-empty`: 보조 줄 "10월 12일 · 0.02 ETH 보냄"이 `#000000`이다. 1차 고침 요청은 `text/tertiary`였다.
  - `home-s10*`(Light 8장): 헤더 계정 `wallet` 아이콘이 `#000000`이다.
- 고침: 받은 금액은 `status/success` text, 보조 줄은 `text/tertiary`, 계정 아이콘은 `icon/default`에 묶는다. P0-1의 `audit.js` 검사로 다시 막는다.

**P1-3. S24 뒤 배경이 옛 Home이다.**
- 화면: `send-s24-blocked-sheet(-dark)`.
- 문제: 뒤 화면에 "Sepolia" 계정 줄, "···" 메뉴, hero 라벨 "Sepolia 테스트넷", 붙은 단위 "0.05 ETH", "진행 중" 구역이 있다. 새 S10과 다르다. 1차 리뷰가 이미 지적했다. 코드로 옮기면 개발자가 옛 Home을 참고할 수 있다.
- 고침: 배경을 `home-s10-pending` instance(새 S10)로 바꾼다.

**P1-4. Dark에서 일부 sheet의 Secondary 버튼과 drag handle이 사라진다.**
- 화면: `home-s50-push-optin-dark`("나중에"가 글자만 남음), `home-s10-firstlaunch-sheet-dark`, `home-s10-testdata-sheet-dark`(drag handle 안 보임).
- 고침: S50 "나중에"에 위험 sheet와 같은 `button/secondary/bgOnRaised` alias를 쓴다. Handle은 Dark에서 `border/strong` 계열 alias로 바꾼다. 1차 P1-9를 모든 sheet instance에 적용했는지 다시 확인한다.

**P1-5. 주요 흐름에 Hangul 고아 글자가 있다.**
- 화면: `send-s23-pending`, `send-s23-included`(+dark): "…다시 보내지 마세/요." `send-s31-backup-required`(+dark): "…복구 구문이 필요해/요."
- 문제: 매일 보는 결과 화면에서 "요."가 혼자 다음 줄로 간다. 다듬지 않은 화면으로 보인다.
- 고침: Figma는 문장을 두 줄로 나눈다(ux-copy가 지우기 sheet에서 쓴 방법). 예: "이미 네트워크에 보냈어요. / 같은 거래를 다시 보내지 마세요." 코드는 1차 P2-1의 `lineBreakStrategyIOS="hangul-word"`를 ctx7로 확인한 뒤 쓴다.

**P1-6. 오픈소스 라이선스 화면이 법적 고지로 충분하지 않다.**
- 화면: `settings-s64-licenses(-full)(-dark)`.
- 문제:
  - MIT는 "저작권 고지와 허가 문구를 포함"하라고 한다. OFL-1.1도 고지와 라이선스 문구를 함께 배포하라고 한다. 지금은 이름과 라이선스 종류만 있다. 전문도, 저작권자도 없다.
  - 목록을 손으로 만들었다. `apps/mobile/package.json`과 맞지 않는다. 설치되지 않은 `@solar-icons/react-native`가 있다. 설치된 `expo-router`, `expo-local-authentication`, `react-native-svg`, `react-native-screens`, `react-i18next`, `phosphor-react-native` 등이 없다. 실제 QR encoder도 아직 의존성에 없다. 간접 의존성은 하나도 없다.
  - 행 높이가 68이다. 정보 행으로는 너무 넓다. 25개 이상이면 4화면이 넘는다.
- 고침:
  - 행을 누르면 라이선스 전문 화면(S64a)을 연다. 내용: 패키지 이름, 버전, 저작권 줄, 라이선스 전문(mono 아님, `Body Small`). 같은 라이선스 전문은 공유해도 된다.
  - 목록은 빌드 때 lockfile에서 생성한다. Figma에는 "생성 목록" 노트와 대표 행 몇 개만 둔다.
  - 행은 `B/Row` 기본 높이(48–52)로 줄이고 버전을 보조 줄 Caption으로 둔다.
  - Solar 행에는 CC BY 4.0 출처 문구 원문("Solar Icons by 480 Design, CC BY 4.0")과 라이선스 링크를 그대로 둔다. 지금 구성은 맞다.
- 참고: iOS 설정 앱의 "법적 고지", Coinbase·Revolut "Open source licenses"(목록 → 전문).

**P1-7. S41의 접힌 선 아래를 검수할 수 없다.**
- 화면: `activity-s41-confirmed`와 `activity-s41-realchain`은 PNG가 같은 화면이다(1차 commit에서 바이트 크기도 같았다).
- 근거: Figma `460:4988`에는 "Block 거래 해시"(y 746)와 "Row Etherscan에서 보기"가 있다. Content 높이 712 밖이라 PNG에 없다. 테스트 모드의 "테스트 거래 지우기" 행도 보이지 않는다.
- 고침: S41 4상태(confirmed, realchain, testmode, unknown)의 `-full` PNG를 S22·S60처럼 export한다. 그 뒤 해시 블록과 Etherscan 행을 다시 검수한다.

**P1-8. 빈 지갑에서 받기·보내기 버튼 자리가 바뀐다.**
- 화면: `home-s10-empty(-dark)`, `home-s10-newwallet(-dark)`. 일반 Home은 왼쪽 "보내기"(Primary), 빈 지갑은 왼쪽 "받기"(Primary) + 오른쪽 꺼진 "보내기".
- 문제: 같은 자리의 버튼이 상태에 따라 뜻이 바뀐다. 근육 기억이 깨진다. 잔액이 생기는 순간 사용자가 "받기"를 누르려다 "보내기"를 누른다.
- 고침: 자리는 그대로 둔다(왼쪽 보내기, 오른쪽 받기). 빈 지갑에서는 "보내기"를 꺼진 상태로 두고 "받기"를 Primary 색으로만 바꾼다. 또는 빈 상태 안의 CTA 하나("받기 주소 보기", 빈 내역과 같은 pill)로 유도한다.
- 참고: Toss, Coinbase는 주 행동 버튼 순서를 상태와 상관없이 고정한다.

### P2: 다음 pass

| # | 화면 | 문제 | 고침 |
|---|---|---|---|
| P2-1 | `asset-s11-eth`, `-usdc` | 금액이 이름보다 위에 있고 Nav에 제목이 없다. "자산 정보"가 행 1개 + 안내 1개라 빈약하다. 컨트랙트 주소를 복사할 수 없다 | Nav 제목 "Sepolia ETH". hero는 logo → 금액. 컨트랙트 행 오른쪽에 "복사"(S60 계정 블록과 같은 pill). ETH는 "자산 정보"에 "이 계정 주소로 받기" 행을 더하지 말고 블록을 안내와 합친다 |
| P2-2 | `send-s20a-recipient-valid` | 주소를 넣은 뒤에도 "붙여넣기"가 남는다. 지울 방법이 없다 | 값이 있으면 "지우기"(Solar `close-circle` + label). 입력 값에도 앞6·뒤4 강조를 쓴다 |
| P2-3 | `send-s22b-burn-acknowledged` | 소각 주소로 판명된 뒤에 "주소 형식만 확인했어요…" 캡션이 다시 나온다 | 소각·토큰 확인 뒤에는 이 캡션을 숨긴다. Lookalike 확인 뒤에만 다시 보인다 |
| P2-4 | `send-s22t-token*` | 예시 주소 "0xc0de c0de …"가 장난처럼 보인다 | `packages/contracts`의 USDC Sepolia 주소(0x1c7D…7238)를 쓴다. 실제로 감지할 대상이다 |
| P2-5 | `activity-s40-error-nocache` | 네트워크 오류에 `question-circle`(Unknown 결과 아이콘)을 쓴다. 의미가 섞인다 | 오류용 Duotone(`danger-circle` 또는 Solar `cloud-cross`)을 hero master로 추가한다 |
| P2-6 | `send-s31-backup-required` | 칩이 제목 옆에 있다(다른 화면은 헤더 오른쪽). "백업 안 됨"에 `shield-check`(체크)를 쓴다. 체크는 안전 증거처럼 읽힌다(icon guide) | 칩을 헤더 오른쪽으로. hero는 `shield-warning` Duotone(이미 `Icon / status / device-warning` 원형이 있다) |
| P2-7 | `settings-s61-phrase` | "OS 인증을 마쳤어요"는 개발자 말이다 | "Face ID로 확인했어요." 기기별 이름은 S90 규칙을 따른다 |
| P2-8 | `settings-s60*` | "기기 보안 경고" 행이 경고가 있다는 뜻으로 읽힌다. "네트워크 Sepolia ›"는 고를 것이 하나뿐인데 chevron이 있다 | 행 이름 "기기 보안 상태", 값 "확인됨"/"주의". 네트워크는 chevron 없는 값 행 |
| P2-9 | `send-s23-failed` | 실패 이유가 없다 | hero 본문 아래 Caption 한 줄(예: "수수료 한도가 부족했어요"). 이유를 모르면 "거래 상세에서 확인할 수 있어요" |
| P2-10 | `home-s10-pending`, `asset-s11-eth` | 잔액 0.05 ETH에서 0.05 ETH를 보내는 중이다. 수수료를 낼 수 없는 예시 값이다 | 잔액 1.284732 ETH(S20b와 같은 값)로 맞춘다 |
| P2-11 | `activity-s41-testmode` | 테스트 거래에 "예상 네트워크 수수료" 행이 있다 | 행을 숨긴다(P0-2와 같은 규칙) |
| P2-12 | `send-s22-review-rechecking` | 버튼이 꺼졌는데 "보내면 취소할 수 없어요" 캡션이 있다. 상태 줄에 진행 표시가 없다 | 캡션 숨김(1차 P1-3 규칙). info 아이콘 대신 작은 spinner(움직임 줄이기면 정지) |
| P2-13 | `send-s22-chainerror`, `-needsreview` | 네트워크 정보를 못 가져왔는데 hero에 수수료가 들어간 총액이 있다. "거래 순서"는 nonce를 모르는 사람에게 뜻이 없다 | chainError는 hero 둘째 줄을 "수수료를 다시 확인해야 해요"로. needsReview 본문은 copy 표 |
| P2-14 | 탭 바 전체 | 내역 탭 `list` 아이콘이 정렬·메뉴 아이콘처럼 보인다 | Solar `history` 또는 `clipboard-list` 후보를 아이콘 안내에 추가해 비교한다(오너 확인 대상은 아님, icon guide 범위) |
| P2-15 | `send-s20b-amount-full` | 전액이 소수 5자리(1.28469), 다른 곳은 6자리다 | 금액 표시 규칙을 하나로(최대 6자리, 끝 0 제거) |
| P2-16 | `brand-s92-root` | Danger Duotone 방패가 Light에서 바랜 분홍이다 | 마스터 Duotone 색(같은 역할 색 + 50%)을 따른다. instance override를 지운다 |
| P2-17 | Send·결과 흐름 | 자판, 위험 sheet, 확정, 실패의 haptic·motion 노트가 저장소 기록에 없다 | Home·설정처럼 프레임 옆 노트를 단다(§9 Haptics 결정) |
| P2-18 | `send-s22l-lookalike-sheet` | sheet 안 주소 블록의 왼쪽이 32px이다. 제목·본문은 16px이다 | 블록 왼쪽 inset을 16으로 맞춘다 |

### 잘 된 것 (유지)
- Review 위험 흐름: 회색 "위험 확인하기" → sheet(안전한 "취소" Primary) → 확인 줄 → 파란 버튼. Phantom보다 명확하다.
- Banner 위계: 600 제목 + 2줄 본문. 결과 버튼 "확인 / 거래 상세 보기".
- 진행 표시 3상태와 결과 hero(logo + badge + 700 금액).
- Onboarding 체크 행과 흐림 가림. Coinbase Wallet 백업 동의와 같은 수준이다.
- 받기: 실제 QR, Dark 흰 타일, 앞뒤 강조 주소, 헤더 칩.
- Dark canvas `#11161D`와 band 대비. 1차 때의 `#000` canvas 문제는 사라졌다.

## Copy 수정 (before → after)

| 화면 | 위치 | Before | After | 이유 |
|---|---|---|---|---|
| S23 Pending 테스트 모드 | hero 제목 | 보내는 중이에요 | 테스트 거래예요 | P0-2 |
| S23 Pending 테스트 모드 | hero 본문 | 네트워크 처리를 기다리는 중이에요. | 이 기기에서 만든 예시예요. 네트워크로 보내지 않았어요. | P0-2. 아래 경고 줄은 지운다 |
| S23 Pending, Included | 경고 (두 줄로 나눔) | 이미 네트워크에 보냈어요. 같은 거래를 다시 보내지 마세요. | 이미 네트워크에 보냈어요. / 같은 거래를 다시 보내지 마세요. | P1-5. 문구는 같고 줄만 나눈다 |
| S31 | 본문 (두 줄로 나눔) | 기기를 잃어도 이 지갑을 되찾으려면 복구 구문이 필요해요. | 기기를 잃어도 지갑을 되찾으려면 / 복구 구문이 필요해요. | P1-5 |
| S61 | 안내 | OS 인증을 마쳤어요. 화면을 캡처하지 마세요. | Face ID로 확인했어요. 화면을 캡처하지 마세요. | P2-7. 기기별 이름 규칙 |
| S22 needsReview | Banner 본문 | 수수료나 거래 순서가 바뀌어서 보내지 않았어요. | 보내기 전에 수수료나 거래 정보가 바뀌었어요. | "거래 순서"(nonce)는 일반 사용자가 모른다. "보내지 않았어요"는 제목과 버튼이 이미 말한다 |
| S22 chainError | hero 둘째 줄 | 총 0.050042 ETH 차감 예상 | 수수료를 다시 확인해야 해요 | P2-13. 가져오지 못한 값을 예상으로 보이지 않는다 |
| S60 | 행 | 기기 보안 경고 › | 기기 보안 상태 · 확인됨 › | P2-8 |
| S23 Failed | hero 아래 (새 줄) | (없음) | 수수료 한도가 부족했어요. (이유를 모르면) 거래 상세에서 이유를 볼 수 있어요. | P2-9. 실제 이유 값이 있을 때만 앞 문구 |
| S64 | 행 누름 (새 화면 S64a) | (아무 일 없음) | 제목 = 패키지 이름. 본문 = 버전 · 저작권 줄 · 라이선스 전문 | P1-6 |
| S20a | 입력 칸 버튼 (값 있음) | 붙여넣기 | 지우기 | P2-2 |

## 오너 결정이 필요한 것 (§9에 없는 것만)

1. **라이선스 화면에서 패키지를 누르면 전문을 열지.**
   - 권장: 연다. MIT·OFL은 고지와 라이선스 문구를 함께 배포하라고 요구한다. 이름 목록만으로는 고지가 충분하지 않다. iOS 설정, Coinbase, Revolut 모두 목록 → 전문 구조다.
   - 대안: 화면 하나에 모든 전문을 이어 붙인다(구현은 쉽고, 읽기는 나쁘다).
   - 함께 정할 것: 목록을 빌드 때 lockfile에서 자동 생성할지(권장), 간접 의존성까지 넣을지(권장: 넣는다, 생성이라 비용이 없다).
2. **Figma 예시에 공개 BIP39 test vector("abandon … about")를 써도 되는지.** AGENTS.md는 "실제 복구 구문 금지"다. 공개 vector를 예외로 할지, placeholder로 바꿀지 정한다(P0-3).
3. **빈 지갑의 주 행동 배치.** 버튼 자리를 고정하고 색만 바꿀지(권장), 빈 상태 CTA 하나로 줄일지(P1-8). Home 첫인상을 정하는 제품 선택이다.
4. **실패 이유를 결과 화면에 보일지.** 이유를 보이면 회복이 빨라진다. 그러나 C3 전에는 이유 값의 출처가 없다. "관찰한 것만" 원칙과 충돌하지 않게, 값이 있을 때만 보이는 규칙이 필요하다(P2-9).

## 다음 순서
1. P0-1, P1-2: 색 binding 수정 + `audit.js`에 "묶이지 않은 TEXT/VECTOR fill = 0" 검사. 한 번에 여러 화면이 고쳐진다.
2. P0-2, P1-1, P1-3, P1-4: component·instance 수준 수정(결과 hero 테스트 variant, `B/Sheet` 바닥 고정, S24 배경, sheet Secondary alias).
3. P0-3, P1-6, P1-8: 오너 결정 뒤 반영.
4. P1-5, P1-7: 줄 나눔, S41 `-full` export.
5. 같은 142장 + S41 full 4장을 다시 export하고 이 표로 다시 검수한다.
