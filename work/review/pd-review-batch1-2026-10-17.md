# VaultMe Redesign B 1차(보내기·받기·내역): product design review

날짜: 2026-10-17. 리뷰어: Staff Product Designer + YC founder (한 번에 검토).
범위: `work/v9/screens/*.png` 92장(46 Light/Dark 쌍), `work/v9/icons/*.png` 4장. Figma `NMXrn0q75G1SX2Bn1L1jP8`, 페이지 Send & receive `486:17419`, Activity `486:17436`.
방법: impeccable `critique`(native라서 Assessment A만 함. detector는 적용하지 않음)와 `audit.native`. PNG가 불분명한 곳은 Figma `get_screenshot`, `get_metadata`로 확인했다(읽기 전용).
Mobbin은 로그인이 필요해서 쓰지 않았다. 참고 앱은 내가 아는 화면을 이름으로만 적었다. 링크는 확인하지 못해서 넣지 않았다.
§9 오너 결정은 다시 따지지 않는다. 실행 품질만 본다.

## 판정

**아직 production grade가 아니다.** 방향은 맞다. 이전 리뷰보다 확실히 좋아졌다. 그러나 코드로 넘기기 전에 고칠 버그 3개(P0)가 있다.
- Light 모드에서 안전 문구 2개가 보이지 않는다.
- 끝난 거래에 "예상" 수수료를 보인다.
- 테스트 모드 화면이 "보냈어요 / 확정됐어요"와 "네트워크로 보내지 않았어요"를 동시에 말한다.

P0을 고치고 P1 절반을 고치면 Mobbin의 Coinbase Wallet, Phantom과 나란히 놓을 수 있는 수준이다.

| 화면 그룹 | 점수 /10 | 한 줄 이유 |
|---|---|---|
| Send input (S20a, S20b) | 6 | 자판 화면은 좋다. Light에서 안내·오류 문구가 잘려 안 보인다(P0). 최근 주소가 mono 덩어리다 |
| Review + risk (S22, S22L/B/T, sheet) | 7 | 블록 3개와 위험 버튼 흐름은 맞다. 비용 블록이 첫 화면 밖에 있다. Banner 제목에 위계가 없다. 오류 상태의 캡션이 틀렸다 |
| Results (S23, S24) | 6 | 금액 hero, 상태 badge, 진행 표시는 좋다. 확정 뒤에도 "예상" 수수료다. 현재 단계 표시가 모호하다. 버튼 구성이 어색하다 |
| Receive (S30, S31) | 7 | 실제 QR과 주소 강조는 좋다. S31은 경고 2개를 쌓은 화면이다 |
| Activity (S40) | 7 | 자산 logo + 방향 badge, 초록 받음, 취소선 실패. 이번 배치에서 가장 production에 가깝다. Unknown·Replaced 금액 처리가 일관되지 않다 |
| Tx detail (S41) | 5 | 시각(날짜·시간)이 없다. "예상" 수수료다. 내역 탭 안에서 "홈으로" 버튼을 쓴다. 테스트 모드 문구가 서로 모순이다 |
| Dark mode | 6 | 전체 parity는 좋다. 모든 sheet에서 Secondary 버튼 배경이 사라진다. 상태 Banner 채움이 너무 진하다 |

Native audit(Figma 근거, 코드 아님): Accessibility 2 · Performance n/a · Theming 3 · Platform conformance 3 · Adaptivity n/a. 가장 큰 a11y 문제는 Light의 잘린 문구(P0-1)와 Hangul 글자 단위 줄바꿈이다.

## 이전 Top 10 상태

이번 배치는 보내기·받기·내역만 다룬다. Home, 시작·잠금·업데이트는 범위 밖이다.

| # | 항목 | 상태 | 근거 |
|---|---|---|---|
| 1 | 한글 타이포, 숫자 700, 단위 분리 | 부분 | 금액 hero는 700 + 단위 분리로 바뀌었다(S20b, S22, S23, S41). 본문은 여전히 글자 단위로 줄을 바꾼다("나갈 수 있/어요", "필/요해요"). S24 뒤의 Home은 아직 옛 스타일이다 |
| 2 | 회색 구획 띠 | 고침 | Review, Results, Tx detail에 12px band가 있다. 내역은 흰색이다 |
| 3 | Review 3블록 + 위험 버튼 | 대부분 고침 | 받는 사람 / 보내는 것 / 비용 블록, 앞6·뒤4 강조, 위험 시 회색 "위험 확인하기". 남은 문제: 비용 블록이 첫 화면 밖(P1-1), 오류 상태 캡션(P1-3). 예전 겹침 버그는 이번 PNG에 없다 |
| 4 | Results를 끝 장면으로 | 부분 | hero(logo 56 + badge + 금액 + 제목)와 3단계 진행 표시가 생겼다. Failed 문구도 고쳤다. "예상" 수수료(P0-2), 현재 단계가 모호함(P1-5), motion·haptic 명세가 Figma에 없음 |
| 5 | 행마다 token identity | 고침 | 자산 logo 40 + Solar Bold badge, 받음은 초록, 실패는 취소선. Unknown·Replaced 금액만 남았다(P1-8) |
| 6 | 받기: 실제 QR | 고침 | 실제 QR, 흰 타일(Dark), 칩, 캡션. 해독 확인은 ux-copy 기록만 봤다. 나는 QR을 직접 해독하지 않았다 |
| 7 | 로고 마크, 브랜드 화면 | 범위 밖 | 이번 배치에 화면이 없다 |
| 8 | Haptics, motion | 증거 없음 | Figma 프레임이나 노트에서 motion·haptic 명세를 찾지 못했다. 코드 전에 S20b 자판, 복사, 위험 sheet, 확정, 실패에 노트를 단다 |
| 9 | Home 채우기 | 범위 밖 / 미반영 | S24 뒤 Home은 옛 hero 라벨, 단위가 붙은 금액, 헤더 칩 없음 상태다 |
| 10 | 알림 2단계, 꺼진 Primary | 부분 | Banner tint와 `neutral.100` 꺼진 버튼은 맞다. Banner 제목이 본문과 같은 굵기다(P1-2). Inline 안내가 아직 겹쳐 쌓인다(S31, S40 testmode, S23 testmode) |
| 작은 항목 | 최근 보낸 주소, 빈 내역 | 부분 / 고침 | 최근 주소는 생겼지만 읽기 어렵다(P1-4). 빈 내역은 받기 아이콘 + Primary로 고쳤다 |

## Findings

### P0: 코드 전에 반드시 고친다

**P0-1. Light 모드에서 안전 문구가 잘려 보이지 않는다**
- 화면: `send-s20a-recipient-valid.png`, `send-s20b-amount-error.png`. Dark 쌍은 정상이다.
- 문제:
  - S20a에는 info 아이콘만 있다. "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."가 없다.
  - S20b에는 "보낼 수 있는 금액보다 많아요"가 위아래가 잘린 한 줄로 보인다.
  - Figma에서도 같다(`423:885`, `423:1071`). 원인: `B/Notice inline` instance(`423:912`, `429:2176`)가 높이 36으로 고정됐다. Dark instance(`494:21907`)는 60이다. Text가 hug되지 않는다.
- 위험: 오류를 색으로만 알린다(빨간 "2"). 이것은 색에만 의존하는 a11y 실패다. 안전 문구도 사라진다.
- 고침: 두 instance를 Hug height로 바꾼다. 텍스트 레이어 auto-resize는 height로 둔다. Light 프레임 전체에서 `B/Notice inline` 높이를 다시 확인한다. `audit.js`에 "Notice instance의 text가 잘림" 검사를 더한다.

**P0-2. 끝난 거래에 "예상 네트워크 수수료"를 쓴다**
- 화면: `send-s23-included`, `send-s23-confirmed`, `send-s23-failed`, `send-s23-replaced`, `activity-s41-confirmed`, `activity-s41-realchain`(+ dark).
- 문제: Foundation 계약 3은 예상과 확정을 구분하라고 한다. 블록에 포함되면 실제 수수료(gasUsed × effectiveGasPrice)가 정해진다. Failed hero는 "네트워크 수수료는 나갔어요"라고 하는데, 아래 행은 "예상"이라고 한다.
- 고침:
  - Included / Confirmed / Failed: 라벨 "네트워크 수수료", 값은 실제 수수료.
  - Pending / Unknown: "예상 네트워크 수수료" 유지.
  - Replaced: 이 거래는 수수료를 내지 않았다. 행을 숨기거나 값을 "없음"으로 한다.
- 참고: Revolut, Coinbase Wallet 거래 상세는 확정 뒤 실제 "Network fee"만 보인다.

**P0-3. 테스트 모드 화면이 자기 말을 뒤집는다**
- 화면: `activity-s41-testmode(-dark)`, `activity-s41-testmode-clear-sheet`, `send-s23-pending-testmode(-dark)`.
- 문제:
  - S41: 제목 "보냈어요", 본문 "이 거래는 네트워크에서 확정됐어요.", 아래 경고 "네트워크로 보내지 않았어요 (테스트)". 같은 화면에 두 사실이 있다.
  - S23: "보냈어요. 다시 보내지 마세요." 바로 아래에 "네트워크로 보내지 않았어요 (테스트)".
  - PRODUCT.md 원칙 "관찰한 범위만 완료로 기록"을 어긴다.
- 고침: 테스트 모드에서 hero 문구를 바꾼다. 경고 행은 지운다(칩 "테스트 데이터"가 이미 알린다. 칩을 누르면 sheet가 열린다).
  - 제목: "테스트 거래예요"
  - 본문: "이 기기에서 만든 예시예요. 네트워크로 보내지 않았어요."
  - 상태 행 값: "테스트(확정 표시)" 대신 "예시"
  - badge: 확정 check 대신 `info` Bold.

### P1: 출시 전에 고친다

**P1-1. Review 첫 화면에 비용이 없다**
- 화면: `send-s22-review.png`(844 높이). 비용 블록이 접힌 선 아래에 있다. 사용자는 수수료와 총 차감액을 보지 않고 고정된 "확인하고 보내기"를 누를 수 있다. 이전 리뷰가 말한 "무엇, 누구에게, 얼마 비용을 2초 안에"를 아직 지키지 못한다.
- 고침(둘 중 하나, 앞의 것 권장):
  1. "보내는 것" 블록을 압축한다. 자산·네트워크·계정 3행(각 56px)을 행 높이 40으로 줄인다. hero 문장이 이미 "계정 1"을 말하고 칩이 Sepolia를 말한다. 그러면 비용 블록의 "예상 총 차감액"이 첫 화면에 들어온다.
  2. hero 아래 보조 줄에 "총 0.050042 ETH 차감 예상"을 Body Small `text/secondary`로 둔다. 비용 블록은 그대로 둔다.
- 참고: Coinbase Wallet send preview, Phantom confirm은 fee와 total을 CTA 바로 위 첫 화면에 둔다.

**P1-2. Banner 제목과 본문의 굵기가 같다**
- 화면: S22 needsReview / blocked / pendingBlock / autherror / chainError / prepareError, S31, S40 error, S41 api-error. Figma `494:20666`에서 확인했다.
- 문제: 결정 9.2-3은 Banner 제목을 Headline으로 정했다. 지금은 제목과 본문 모두 Body Small 400처럼 보인다. 3줄 문단으로 읽힌다.
- 고침: `B/Notice` Banner의 Title 레이어를 `Product B / Headline`(17/24, 600)으로 바꾸고, 본문은 `Body Small` `text/secondary`로 둔다. 제목과 본문 사이 간격은 `space/1`(4)로 둔다.

**P1-3. 오류 상태에서 버튼 위 캡션이 틀렸다**
- 화면: `send-s22-chainerror(-dark)`, `send-s22-needsreview(-dark)`.
- 문제: "다시 시도"는 네트워크 정보를 다시 가져온다. "다시 검토"는 값을 새로 고친다. 둘 다 서명이 아니다. 그런데 "보내면 취소할 수 없어요 · 다음 단계에서 Face ID로 확인해요"가 남아 있다. autherror는 다음 단계가 실제로 Face ID라서 캡션을 유지해도 된다.
- 고침: chainError, needsReview, prepareError, blocked, pendingBlock에서 캡션 레이어를 숨긴다. 캡션은 버튼이 "확인하고 보내기"(켜짐)일 때만 보인다. 이 규칙을 component 속성(`showIrreversibleCaption`)으로 만든다.

**P1-4. 최근 보낸 주소가 mono 덩어리로 읽힌다** (§9 결정: 전체 주소 4글자 묶음 유지. 실행만 고친다)
- 화면: `send-s20a-recipient-empty(-dark)`.
- 문제: 세 행이 모두 같은 회색 mono 2줄이다. 행인지, 누를 수 있는지 알 수 없다. 앞뒤 강조도 없다. 그래서 Review와 lookalike sheet에서 쓰는 비교 규칙과 다르다.
- 고침:
  - Review에서 쓰는 Address 표시(`Address` instance)를 그대로 쓴다. 앞 6자와 뒤 4자는 `text/primary` 600, 가운데는 `text/secondary` 400.
  - 각 행을 `B/Row`로 만든다. 최소 높이 44, 오른쪽 `navigation/disclosure` chevron, 행 사이 `space/3`(12).
  - 순서: 1줄 주소(강조), 2줄 Caption `text/tertiary` "10월 12일 · 0.02 ETH 보냄".
  - 누르면 입력 칸을 채운다. 비슷한 주소 검사는 그대로 실행한다.
- 참고: Coinbase Wallet "Recents", Rainbow send "Recent" 목록(행 + 식별 요소 + 짧은 보조 줄).

**P1-5. 진행 표시에서 현재 단계와 끝난 단계를 구분할 수 없다**
- 화면: `send-s23-pending`, `send-s23-included`(+ dark).
- 문제: Pending에서 "블록 포함" 점이 꽉 찬 amber다. 끝난 단계처럼 보인다. 선 색도 "보냄 → 블록 포함" 구간이 amber라서 "지나간 구간"인지 "기다리는 구간"인지 모호하다.
- 고침: 끝난 점은 꽉 찬 `status/success`. 현재 단계는 빈 원 + 2px `status/warning` ring(움직임 줄이기가 꺼져 있으면 1.2s pulse). 아직 오지 않은 단계는 `border/subtle` 빈 원. 끝난 구간 선만 success, 나머지는 `border/subtle`. 진행 표시 아래와 band 사이 간격을 16 이상으로 둔다(지금은 라벨이 band에 거의 붙어 있다).
- 참고: Robinhood order status timeline, Toss 송금 진행 단계.

**P1-6. Results의 버튼과 "거래 상세" 링크 위치가 어색하다**
- 화면: `send-s23-*`. 블록 제목 "받는 주소" 오른쪽에 "거래 상세" 링크가 있다. 같은 화면에 "내역 보기" Primary도 있다. 상세로 가는 길이 두 개이고, 링크는 주소 블록과 관계가 없다.
- 고침:
  - 블록 링크를 지운다.
  - 하단: Primary "확인"(홈으로), Ghost "거래 상세 보기".
  - Unknown: Primary "상태 다시 확인", Ghost "거래 상세 보기".
  - "내역 보기"는 지운다. 거래 상세에서 뒤로 가면 내역이다.
- 참고: Toss 송금 완료(Primary "확인" 하나), Coinbase send success("Done" + "View transaction").

**P1-7. 거래 상세에 시각이 없고, 내역 탭 안에서 "홈으로"를 쓴다**
- 화면: `activity-s41-confirmed`, `-realchain`, `-testmode`, `-unknown`(+ dark).
- 문제:
  - "거래 정보"에 날짜·시간이 없다. 거래 상세에서 가장 기본 정보다.
  - 이 화면은 내역 탭에서 열린다. 뒤로 버튼이 있다. 그런데 하단 고정 "홈으로"가 있다. 탭 구조와 맞지 않는다.
  - realchain은 하단에 텍스트 버튼 2개("Etherscan에서 보기", "홈으로")만 있다. 미완성처럼 보인다.
- 고침:
  - "거래 정보" 첫 행에 "시각 · 10월 16일 (금) 09:41"을 둔다.
  - 하단 고정 영역을 지운다(Unknown만 Primary "상태 다시 확인" 유지).
  - "Etherscan에서 보기"는 거래 해시 블록 안의 행으로 옮긴다. 오른쪽에 `external` 아이콘을 둔다(Solar `square-arrow-right-up`, Figma master 추가 필요).
  - 테스트 모드의 "테스트 거래 지우기"는 맨 아래 행(Danger text)으로 둔다.
- 참고: Revolut transaction detail(시각, 상태, 수수료, 상단 band), Coinbase Wallet transaction detail("View on explorer" 행).

**P1-8. 내역에서 Unknown·Replaced 금액 처리가 일관되지 않다**
- 화면: `activity-s40-unknown-replaced(-dark)`.
- 문제: "보내기 확인 못 함 −0.05 ETH"는 확정된 "보냄"과 같은 진한 색이다. 나갔는지 모르는 금액을 나간 금액처럼 보인다. "실행되지 않음 −0.01 ETH"는 회색이고 취소선이 없다. 실패는 취소선이다. 둘 다 나가지 않은 금액인데 처리가 다르다.
- 고침: 금액 색과 모양을 상태에 묶는다.
  - Confirmed: `text/primary`
  - Pending, Unknown: `text/secondary`
  - Failed, Replaced: `text/tertiary` + 취소선
  - Unknown 보조 줄은 다른 행과 같이 "Sepolia ETH · 07:20 · 상태를 확인해 주세요" 형식으로 시각을 남긴다.

**P1-9. Dark에서 sheet의 Secondary 버튼 배경이 사라진다**
- 화면: `send-s22l-lookalike-sheet-dark`, `send-s22b-burn-sheet-dark`, `send-s22t-token-sheet-dark`, `send-s24-blocked-sheet-dark`, `activity-s41-testmode-clear-sheet-dark`.
- 문제: "확인했어요, 보내기", "닫기", "취소"가 글자만 남는다. Light에서는 회색 pill이다. Dark sheet 배경(`surface/raised` 계열)과 Secondary 배경이 같은 값이다. 버튼이 버튼처럼 보이지 않는다.
- 고침: sheet 안 Secondary는 Dark에서 한 단계 밝은 neutral(예: `neutral.700` 계열 Component alias `button/secondary/bgOnRaised`)을 쓴다. Primitive 값을 새로 만들지 않고 기존 neutral을 alias한다. 대비 3:1 이상(경계 인지)을 확인한다.

**P1-10. Pending 경고 문구가 제목과 충돌한다**
- 화면: `send-s23-pending`.
- 문제: 제목은 "보내는 중이에요", 경고는 "보냈어요. 다시 보내지 마세요." Included는 "다시 보내지 마세요."만 쓴다. 같은 뜻인데 문구가 다르다.
- 고침: 아래 copy 표의 문구로 둘 다 맞춘다.

**P1-11. S31(백업 필요)은 경고 2개를 쌓은 화면이다**
- 화면: `send-s31-backup-required(-dark)`.
- 문제: amber Banner 아래에 다시 경고 아이콘 + "종이에 적어 두세요…"가 있다. 아래 60%는 비어 있다. 이전 리뷰 근본 원인 4(경고 벽)가 남아 있다. 종이 보관 안내는 백업 흐름 안에서 할 말이다.
- 고침: 빈 상태 구성으로 바꾼다. 가운데 `Icon / hero / shield`(Duotone 48, `506:26171`), Title 2 "먼저 복구 구문을 백업하세요", 본문 2줄, Primary "백업 시작", Ghost "나중에". 두 번째 경고는 지운다.
- 참고: Coinbase Wallet "Back up your wallet" 게이트, Phantom 백업 유도 화면.

### P2: 다음 pass

| # | 화면 | 문제 | 고침 |
|---|---|---|---|
| P2-1 | S22 pendingBlock, blocked, S31, S40 testmode, S41 testmode, clear sheet | Hangul을 글자 단위로 줄바꿈한다("있/어요", "나중/에", "필/요해요") | Figma는 문장 끝을 손으로 조정하거나 폭을 맞춘다. 코드는 iOS `lineBreakStrategyIOS="hangul-word"`, Android `android:lineBreakWordStyle="phrase"`(API 33+). 코드 전에 RN 지원 여부를 ctx7로 확인한다 |
| P2-2 | S22 risk 상태(L/B/T) | 위험 Banner 아래에 "주소 형식만 확인했어요…" 캡션이 계속 있다. 위험 문구와 안심 문구가 섞인다 | 위험 상태에서는 이 캡션을 숨긴다. 확인 뒤(acknowledged)에 다시 보인다 |
| P2-3 | S22L sheet | "전에 보낸 주소와 비교하세요" 줄이 `text/link` 파랑이다. 누를 수 있는 링크처럼 보인다. 본문 4줄과 뜻이 겹친다 | `text/secondary`로 바꾸거나 지운다. 본문을 2줄로 줄인다(copy 표) |
| P2-4 | S22 prepareError | 꺼진 "확인하고 보내기"만 있다. 무엇을 고칠지 알려 주지 않는다 | 하단 버튼을 Secondary "금액 수정"으로 바꾼다. 또는 Banner에 원인 한 줄을 넣는다 |
| P2-5 | S41 clear sheet | 지우는 행동이 파란 Primary다. 위험 sheet에서는 안전한 행동("취소")이 Primary다. 같은 sheet 패턴에서 순서가 반대다 | 오너 결정 목록 3 참조 |
| P2-6 | S30 | 칩이 제목 옆에 있다. 다른 모든 화면은 오른쪽 위 헤더에 있다 | 헤더 오른쪽으로 옮긴다. QR을 176에서 220으로 키운다. 계정 이름 아래 "계정 1" 대신 계정 행(아이콘 + 이름)을 둔다 |
| P2-7 | S40 error-noCache | Banner 하나와 빈 흰 화면이다 | 빈 상태 구성(Duotone hero + 제목 + Primary "다시 시도")을 쓴다. error-cached Banner 본문은 2줄로 줄인다(copy 표) |
| P2-8 | S40 testmode | 칩 "테스트 데이터"와 Inline 안내가 같은 말을 한다. §9는 칩 + sheet로 정했다 | Inline 안내를 지운다. 칩을 누르면 sheet가 열린다 |
| P2-9 | S40 empty | Duotone 보조 층이 회색이다. 아이콘 안내(§0)는 "같은 역할 색 50%"다. 마스터 시트는 파랑 50%다. 화면 instance와 마스터가 다르다 | instance override를 지우고 마스터 색을 따른다. Dark에서 보조 층 대비도 확인한다 |
| P2-10 | Dark 전체 Banner | Danger·Warning 채움이 진한 maroon·brown이다. 2–4줄 본문과 합쳐 무겁다 | Dark `status/*/bg`를 채도와 명도를 낮춘 기존 Primitive alias로 바꾼다. 본문 대비 4.5:1은 유지한다 |
| P2-11 | S40 탭 바 | 선택 상태가 색만 바뀐다. "내역" Bold 아이콘이 Linear와 거의 같다. 비선택 라벨도 600 진한 색이라 선택이 약하다 | 비선택 라벨을 `text/secondary` 500으로 낮춘다. Activity Bold glyph를 확인한다 |
| P2-12 | Row badge | Pending amber badge가 갈색으로 보인다(`#8A5A00` 근처) | badge 채움을 `status/warning` 아이콘 색으로 맞추고, 흰 glyph 대비 3:1을 확인한다 |
| P2-13 | `work/v9/icons/icons-catalog.png` | 카탈로그 설명이 아직 "23 functional Phosphor regular icons"다 | Solar 문구와 CC BY 4.0 표기로 바꾼다 |
| P2-14 | S20b error | 오류가 "보낼 수 있는 금액 1.284732 ETH"를 대신한다. 사용자는 최대값을 잃는다 | 오류 줄 뒤에 "보낼 수 있는 금액 1.284732 ETH"를 Caption으로 남긴다. 또는 "전액" 칩을 강조한다 |
| P2-15 | 모든 결과·상세 | Motion·haptic 명세가 Figma에 없다(Top 10 #8) | S23 확정 check 그리기 400ms + `notificationSuccess`, 실패 `notificationError`, 위험 sheet `notificationWarning`, 자판 `selection` 노트를 프레임 옆에 단다 |

### 잘 된 것 (유지)
- S20b 자판 화면: 700 숫자 + 분리된 단위, 25%/50%/전액, "최대 수수료를 뺀 금액이에요". Toss 수준이다.
- Review 위험 흐름: 회색 "위험 확인하기" → sheet(안전한 "취소"가 Primary) → 확인 뒤에만 파란 버튼. Phantom보다 명확하다.
- Lookalike: 다른 글자 묶음에 빨간 밑줄 + sheet 안에서 전·후 주소 비교.
- 내역 행: 자산 logo + 상태 badge, 받음 초록, 실패 취소선, 요일이 있는 날짜 묶음.
- 받기: 실제 QR, Dark에서 흰 타일, 앞뒤 강조 주소.
- 구획 띠: border·shadow 없이 블록을 나눈다. Dark에서도 보인다.

## Copy 수정 (before → after)

| 화면 | 위치 | Before | After | 이유 |
|---|---|---|---|---|
| S22 (모든 상태) | 받는 사람 캡션 | 주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인하세요. | 주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요. | S20a와 같은 문장으로 맞춘다(ux-copy 승인 원문) |
| S23 Pending | 경고 | 보냈어요. 다시 보내지 마세요. | 이미 네트워크에 보냈어요. 같은 거래를 다시 보내지 마세요. | 제목 "보내는 중이에요"와 충돌하지 않는다. "보냈어요" 완료형은 Confirmed에만 쓴다는 규칙을 지킨다 |
| S23 Included | 경고 | 다시 보내지 마세요. | 이미 네트워크에 보냈어요. 같은 거래를 다시 보내지 마세요. | Pending과 같은 문구 |
| S23 Included/Confirmed/Failed, S41 Confirmed | 수수료 라벨 | 예상 네트워크 수수료 | 네트워크 수수료 | P0-2. 값은 실제 수수료 |
| S23 Replaced | 수수료 행 | 예상 네트워크 수수료 0.000042 ETH | (행 삭제) 또는 네트워크 수수료 · 없음 | 실행되지 않은 거래는 수수료를 내지 않는다 |
| S41 testmode | hero 제목 | 보냈어요 | 테스트 거래예요 | P0-3 |
| S41 testmode | hero 본문 | 이 거래는 네트워크에서 확정됐어요. | 이 기기에서 만든 예시예요. 네트워크로 보내지 않았어요. | P0-3. 아래 경고 행은 지운다 |
| S41 testmode | 상태 값 | 확정 | 예시 | 확정은 관찰한 사실이 아니다 |
| S23 Pending testmode | 경고 2개 | 보냈어요. 다시 보내지 마세요. / 네트워크로 보내지 않았어요 (테스트) … | 테스트 거래예요. 네트워크로 보내지 않았어요. | 한 줄로 합친다. 모순을 없앤다 |
| S22L sheet | 본문 | 전에 보낸 주소와 앞뒤 글자는 같지만 가운데가 달라요. 주소 오염 공격일 수 있어요. 전체 주소를 한 글자씩 비교하세요. | 전에 보낸 주소와 앞뒤는 같고 가운데가 달라요. 주소 오염 공격일 수 있어요. | 비교 지시는 아래 비교 블록이 한다. Review Banner 문구와 맞춘다 |
| S22L sheet | 안내 줄 | 전에 보낸 주소와 비교하세요 (파란 글자) | 아래 빨간 글자가 다른 부분이에요 | 링크처럼 보이지 않게 `text/secondary`로. 무엇을 보면 되는지 말한다 |
| S40 error-cached | Banner 본문 | 마지막 업데이트 10월 13일 09:12 / 연결을 확인하고 다시 시도하세요. / 아래는 마지막으로 받은 내역이에요. | 아래는 10월 13일 09:12에 받은 내역이에요. | 4줄 → 1줄. 제목과 "다시 시도" 링크가 나머지를 말한다 |
| S41 clear sheet | 본문 | 이 기기에서 만든 예시 거래예요. 지우면 새로 보낼 수 있어요. | 이 기기에서 만든 예시 거래예요. 지우면 다시 보내기를 시험할 수 있어요. | "새로 보낼 수 있어요"는 실제 송금처럼 읽힌다 |
| S20a | 최근 주소 행 보조 줄 | 10월 12일 · 0.02 ETH 보냄 | 10월 12일 · 0.02 ETH 보냄 (유지, 주소 아래 2줄로 이동) | 순서만 바꾼다(P1-4) |
| S23 | 하단 버튼 | 내역 보기 / 홈으로 | 확인 / 거래 상세 보기 | P1-6 |

## 오너 결정이 필요한 것 (§9에 없는 것만)

1. **Failed 결과에 "다시 보내기"(같은 주소·금액으로 S22 열기)를 둘지.** 사용자 회복 경로가 생긴다. 그러나 새 기능이고, 중복 송금 위험 문구와 균형을 봐야 한다. Coinbase는 "Try again"을 둔다.
2. **내역 행 보조 줄: 자산 이름 대신 상대 주소(짧은 형식 `0x1234…5678`)를 쓸지.** 자산은 logo와 금액 단위가 이미 말한다. 주소는 "누구와 거래했는지"를 준다. Foundation 계약은 목록에서 짧은 주소를 막지 않는다. 그러나 주소 오염 공격에서 짧은 주소는 속이기 쉽다.
3. **테스트 거래 지우기 sheet의 버튼 순서.** 위험 sheet처럼 "취소"를 Primary로 할지, 일반 확인 sheet처럼 "지우기"를 Primary(Danger 톤)로 할지. 한 번 정하면 모든 sheet에 같은 규칙을 쓴다.

## 다음 순서
1. P0-1~3을 Figma에서 고친다(vaultme-figma-screen, `audit.js` 0).
2. P1-2, P1-3, P1-9는 component 수준이다(B/Notice, footer caption 속성, sheet Secondary alias). 한 번 고치면 여러 화면이 같이 고쳐진다.
3. P1-1, P1-4~8, P1-11 화면 수정.
4. 수정 뒤 같은 92장을 다시 export해서 이 표로 다시 검수한다.
