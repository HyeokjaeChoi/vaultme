# VaultMe 제품 디자인 독립 리뷰 (Staff Product Designer) — 2026-10-17

READ-ONLY. 코드, Figma, 시뮬레이터는 건드리지 않았다. 다른 rr-* 보고서는 읽지 않았다.
근거: `work/compare/*-app.png` 20장 직접 확인 (Light 18, Dark 1, 대표 화면), `outputs/design/redesign-b.md` §9, `PRODUCT.md`, https://stack-line.dev 실측 (브라우저 DOM 계측), Mobbin iOS 화면 (아래 링크).
알려진 non-defect는 제외했다: "테스트 데이터" 칩, 402 pt vs 390.

## 0. 사용한 skill과 판단이 바뀐 점

| Skill | 어떻게 썼나 | 판단이 바뀐 점 |
|---|---|---|
| impeccable (critique + audit, native iOS) | 앱은 Operate 모드로 봤다. 위계, 색 규율, 상태, 카피를 휴리스틱으로 점검했다. | "예쁘다"가 아니라 "돈 앱에서 절제가 야심이다"로 기준을 잡았다. 장식 대신 색 수와 정렬을 셌다. accent가 4개 이상이면 감점했다. |
| emil-design-eng | 반복 빈도로 모션을 판단했다. press scale, sheet 곡선, 키패드 모션을 봤다. | 정지 캡처로는 모션을 채점할 수 없다. 그래서 모션은 점수에 넣지 않고 P2 규칙으로만 제시했다. 키패드는 "하루 수십 번"이므로 애니메이션을 더하지 않는 쪽이 맞다고 판단했다. |
| design-taste-frontend | 랜딩 전용 skill이다. 법칙만 가져왔다: 한 ground/ink/accent, 소수의 크기, 선 대신 톤 단계, 빈 화면은 설계된 쉼 1회. | 이 skill은 mono와 hairline을 금지한다. 오너의 기준(stack-line.dev)은 mono micro-label과 기능적 hairline을 쓴다. 오너 기준을 따랐다. 앱 화면에서 "빈 공간 = 설계된 쉼인가, 미완성인가"를 따지게 됐다 (Send, Receive, Start). 스크립트(inspect/draw)는 웹용이라 실행하지 않았다. |

## 1. stack-line.dev 기준 (실측)

- h1: Inter Tight 64px / 700 / 자간 -2.24px (-3.5%) / 행간 1.05. 크고 촘촘하다.
- 본문: 16px / 400 / 행간 1.65 / 회색 (#A7A7A3). 조용하다.
- 사실 정보는 Commit Mono 14px, 자간 +0.02em: `// ONE-PERSON SOFTWARE STUDIO — NAMYANGJU, KR`, `v0.2.0 — latest release`, `E2E verified · 120 seeded events`.
- accent는 amber 하나다. CTA와 포커스에만 쓴다. 나머지는 흑백 회색 3단.
- 카피는 약속이 아니라 사실이다: "Collect at local commit. Confirm after server commit."
- 구분선은 기능이 있는 곳에만 둔다.

번역 원칙: Light-first 한국어 지갑에서는 (1) 큰 숫자는 얇은 자간으로, (2) 사실(체인, 해시, 블록, 시각)은 mono 14px 마이크로 라벨로, (3) accent는 화면당 1곳, (4) 카피는 상태의 사실만.

## 2. 판정

**VaultMe는 "안전하고 정돈된 템플릿"이다. 기억에 남는 제품은 아직 아니다. 전체 7.0 / 10.**

- 잘한 것: Review 화면(주소 4글자 묶음 + 끝 4자 굵게 + 위험 sheet에서 빨간 차이 글자). 이것은 Revolut/Coinbase보다 낫다. 큰 숫자 700과 단위 분리도 좋다. 상태 배지(시계/화살표/x)와 취소선 실패 금액은 읽기 쉽다.
- 약한 것: 색이 stack-line보다 훨씬 많다 (파랑, 파랑 링크, 파랑 칩, amber 칩, 녹색, 빨강, 검정 pill). 화면 위 칩 2개가 모든 화면 제목 줄을 차지한다. 빈 공간이 설계되지 않았다. 사실 정보(해시, 블록, 체인)에 mono 마이크로 라벨 체계가 없다.
- Toss/Coinbase/Phantom 옆에 놓으면 Review와 Restore는 어색하지 않다. Home, Send, Start, Settings는 한 단계 아래로 보인다.

## 3. 점수 /10 (엄격, 9+는 최고 reference 옆에서 어색하지 않을 때만)

| Group | Score | 이유 한 줄 |
|---|---|---|
| Onboarding / Start / Lock | 6.5 | 브랜드 타일은 깔끔하다. 화면 60%가 빈 흰색이다. 사실 라벨 없음. |
| Backup / Restore (S03, S05) | 7 | 흐름과 경고는 좋다. 12칸 굵은 outline이 무겁다. |
| Home | 7 | 숫자 위계 좋다. 같은 수량이 hero와 첫 행에 2번 나온다. accent 5종. |
| Asset detail | 6 | 로고가 홀로 떠 있다. 정보 블록이 비었다. |
| Send amount | 6.5 | 금액과 키패드 사이가 비었다. 금액이 왼쪽이라 집중감이 약하다. |
| Review + risk sheet | 8 | 가장 완성도가 높다. 수수료가 fold 아래다. |
| Result (성공/실패/진행) | 7 | 3단계 진행선이 좋다. 감정의 정점이 없다. 실패의 버튼 위계가 거꾸로다. |
| Receive | 7 | QR과 주소 좋다. 중간이 비었고 안내문이 12pt 회색이다. |
| Activity | 7 | 날짜 묶음과 상태가 깔끔하다. 제목 줄 칩이 경쟁한다. |
| Transaction detail | 6.5 | 구조는 맞다. 해시/Etherscan이 fold 아래. mono 사실 라벨 없음. |
| Settings | 7 | 계정 블록(짧은 주소 mono) 좋다. 행이 크고 라이선스가 탭 바에 가린다. |
| Dark | 7.5 | 잘 이식되었다. 칩 색만 더 조용해야 한다. |
| **Overall** | **7.0** | |

## 4. 화면 그룹별 비교

### 4.1 Home
- 앱: `home-app.png`. 계정 줄 + amber 칩, "Sepolia ETH" 라벨, 700 숫자, 보내기(Primary 파랑) / 받기, 자산 2행, 최근 내역 3행.
- reference: [Coinbase Home](https://mobbin.com/screens/9cc67605-c277-4edc-816d-0c50d010d0b3), [Phantom Home](https://mobbin.com/screens/c8f09680-22fc-48f4-9788-925b8b22cee5), [Toss Home](https://mobbin.com/screens/b5315413-f78c-4e36-9d05-316633c10e7c).
- reference가 하는 것: Phantom은 계정 줄 아래 잔액 하나, 그 아래 아이콘 4개 action 그리드로 한 번에 읽힌다. Coinbase는 Primary 하나와 Secondary 하나를 항상 바닥에 고정한다. Toss는 회색 canvas 위 흰 묶음으로 "묶음 = 하나의 일"을 보인다.
- 우리가 못 하는 것:
  - 타이포: 큰 숫자 아래 라벨, 단위, 설명 3줄이 같은 회색이다. 위계 중간 단이 없다.
  - 반복: hero 수량과 자산 첫 행이 같은 숫자다 (1.284732 ETH 2번). 정보가 늘지 않는다.
  - accent: 파랑 Primary, 파랑 "전체 보기", 파랑 탭, amber 칩, 녹색 +12.5, 4색 배지. 한 화면 accent 5개.
  - 밀도: 자산 2행인데 행 높이 64 + 간격이 커서 3번째 섹션이 fold에 걸린다.

### 4.2 Asset detail
- 앱: `asset-detail-app.png`.
- reference: [Coinbase asset detail](https://mobbin.com/screens/452ef54c-2182-4401-9568-2f19d78a1c61).
- reference가 하는 것: 제목 줄에 이름과 로고를 한 줄로 두고, 아래에 숫자 하나, 그 아래 탭(Balance / Insights)으로 정보를 나눈다. 가격 차트가 면의 주인공이다.
- 우리가 못 하는 것: 로고가 왼쪽에 외롭다. "자산 정보" 블록은 행 1개("네트워크")와 설명문뿐이다. 테스트넷 자산은 차트가 없으니, 이 면의 주인공이 없다. 정직한 대안은 mono 사실 블록이다 (아래 P1-5).

### 4.3 Send amount (S20b)
- 앱: `send-s20b-amount-app.png`.
- reference: [Toss 금액 입력](https://mobbin.com/screens/c2f8f217-d509-4b2c-9298-75215838634c), [Toss 잔액 칩](https://mobbin.com/screens/d5ad007b-bc8c-40a4-b494-dd388aab5fd7), [Wise amount](https://mobbin.com/screens/72ed9c15-1d9a-4e63-9333-7e222f95b84d).
- reference가 하는 것: Toss는 금액, "20만원" 읽기, 잔액을 한 덩어리로 위에 붙이고, CTA 바를 키패드 바로 위에 붙인다. 엄지가 한 영역에서 끝난다. Wise는 금액을 아주 크게, 입력 필드를 하나의 강한 면으로 만든다.
- 우리가 못 하는 것: 제목(y 300)과 금액(y 700) 사이, 금액과 칩(y 1140) 사이가 각각 300pt 가까이 빈다. "쉼"이 아니라 "끊김"으로 읽힌다. 금액이 왼쪽 정렬이라 중심이 없다. 25/50/전액 칩이 키패드 위에 떠 있다.

### 4.4 Review + risk sheet
- 앱: `review-app.png`, `review-lookalike-sheet-app.png`, `review-needsreview-app.png`.
- reference: [Revolut Review transfer](https://mobbin.com/screens/160eff79-448b-4ab3-a6de-bb4f406975af), [Revolut 확인 sheet](https://mobbin.com/screens/e417be9d-5c9f-4028-9ec6-139d19373885), [Coinbase Before you send](https://mobbin.com/screens/063f1aad-dc7a-4b45-96bf-dae60b56ac66).
- reference가 하는 것: Revolut은 "받는 사람 / 참조 / 받는 금액 / 수수료 / 총액"을 label 왼쪽, value 오른쪽으로 짧게 나열하고 총액만 굵게 한다. 확인 sheet는 "취소할 수 없다" 한 줄과 버튼 2개.
- 우리는 어디서 앞서나: 전체 주소 + 끝 4자 굵게, 비슷한 주소 sheet의 빨간 차이 글자. 안전한 쪽(취소)이 Primary인 선택도 맞다 (Revolut은 Send가 Primary다. 우리가 더 보수적이다).
- 우리가 못 하는 것: 수수료/총 차감액이 fold 아래다. 돈이 나가는 총액은 CTA 바로 위에 있어야 한다. 바닥 안내 "보내면 취소할 수 없어요 · 다음 단계에서 기기 인증으로 확인해요"는 12px 회색 한 줄이다. 가장 중요한 문장이 가장 작다. Banner(amber)는 이 화면에서만 색 면을 쓴다. 규율은 맞다.

### 4.5 Result
- 앱: `result-confirmed-app.png`, `result-failed-app.png`.
- reference: [Toss 완료](https://mobbin.com/screens/5faf70d5-f007-4bfa-86ff-55802a53c121), [Wise All done](https://mobbin.com/screens/87a6f31e-698a-461d-837d-efd5c76fdd58), [Revolut 진행 상세](https://mobbin.com/screens/b7a4d4f5-b5a7-4f95-a39e-84e7a258996c).
- reference가 하는 것: Toss는 가운데 큰 체크와 문장 하나, 버튼 하나. 나머지는 없다. Wise는 색 면 전체를 바꿔 "끝났다"를 몸으로 느끼게 한다. Revolut은 "진행 1/3"과 예상 시각을 세로 타임라인으로 둔다.
- 우리가 못 하는 것: 3단계 가로 진행선은 좋다. 하지만 성공의 감정 정점이 없다. 성공/실패/진행이 같은 구조라서 "지금 무슨 상태인가"가 아이콘 배지 한 개(작은 원)에만 의존한다. 실패 화면에서 Primary가 "확인"(닫기)이고 "다시 보내기"가 Secondary다. 실패 후 가장 가치 있는 행동에 accent가 없다. 제목 "실행에 실패했어요"의 "실행"은 기술 용어다.

### 4.6 Receive
- 앱: `receive-app.png`.
- reference: [Phantom Receive](https://mobbin.com/screens/c0b35d9a-68d9-4d0c-becb-62815fde60ba).
- reference가 하는 것: QR을 흰 카드 하나로 크게, 위에 네트워크 pill, 아래 "이 네트워크로만" 한 줄, 하단에 복사/공유 2버튼 동급.
- 우리가 못 하는 것: QR 위아래 여백이 비대칭이다. QR이 화면 폭의 57%로 작다. 안내 "Sepolia 네트워크로만 보내세요."가 12px 회색으로 위험 문구치고 약하다. 복사 완료 피드백은 device 증거(11~14번)에 있다. 정지 화면에서 확인 불가.

### 4.7 Activity
- 앱: `activity-app.png`.
- reference: [Toss 거래내역](https://mobbin.com/screens/310d0c76-fe0c-4502-8435-a926b4d3b40e), [Toss 상세 내역](https://mobbin.com/screens/e444059c-49b7-4cc3-af4f-90f843111d29).
- reference가 하는 것: 날짜 헤더(요일 포함)와 행 사이에 같은 리듬, 금액은 큰 굵기, 설명은 한 줄 회색. 월 합계, 횟수 같은 요약 숫자를 위에 둔다.
- 우리가 못 하는 것: 구조는 맞다. 제목 "내역" 옆에 칩 2개가 붙어 제목과 경쟁한다. 화면 아래 40%가 빈다. 빈 곳이 "진행 중 → 완료" 요약으로 쓰이지 않는다.

### 4.8 Transaction detail
- 앱: `tx-detail-confirmed-app.png`.
- reference: [Revolut 거래 상세](https://mobbin.com/screens/ea30b847-be1c-4858-aaac-4f01cca1a9ea).
- reference가 하는 것: 위에 금액, 아래 상태/카드/카테고리를 label-value 행으로 촘촘히 둔다. 행동(다운로드, 편집)은 값 칸에 파란 텍스트로 둔다.
- 우리가 못 하는 것: 시각, 상태, 계정, 네트워크, 수수료는 맞다. 하지만 해시, 블록, Etherscan 링크가 fold 아래다. 이 화면이 stack-line 방식(mono 사실 라벨)을 가장 크게 살릴 수 있는 화면인데 쓰지 않았다.

### 4.9 Settings
- 앱: `settings-app.png`.
- reference: [Toss 설정(그룹)](https://mobbin.com/screens/aa5f853e-b80b-457b-8bfe-15eae0b191a0), [Toss 설정(보안/정보)](https://mobbin.com/screens/01b538a7-41b2-4a7a-a85d-abd8af9f931d), [Phantom Edit Account](https://mobbin.com/screens/08d5387a-14ca-43a0-b90b-0fd910a7588d).
- reference가 하는 것: Toss는 12px 회색 띠로 그룹을 나누고 행은 텍스트만, 값은 오른쪽. 한 화면에 12행이 들어온다. Phantom은 위험한 행("Remove Account")만 빨강으로 분리한다.
- 우리가 못 하는 것: 행 높이가 약 78pt로 크다. 한 화면에 6행만 보이고 "오픈소스 라이선스"가 탭 바에 잘린다. 행 아이콘은 Linear로 좋으나 "복구 구문 보기"(가장 민감한 행)와 "네트워크"(정보)가 시각적으로 같은 무게다. 위험도 위계가 없다.

### 4.10 Lock / Start
- 앱: `lock-app.png`, `start-app.png`.
- reference: [Remote Face ID](https://mobbin.com/screens/08e149b1-13c0-4167-956c-09d70fe90a15), [Setel passcode](https://mobbin.com/screens/815ace78-8bb7-4af5-adaf-d50830adeb04). 참고: Robinhood/Coinbase/Toss 잠금 화면은 검색에서 나오지 않았다. 이 그룹의 reference는 약하다. 그래서 점수 확신도가 낮다.
- reference가 하는 것: 잠금 화면에서 "Face ID 아이콘 버튼"을 키패드 한 칸으로 두어 행동이 보인다. 안내와 아이콘이 한 시선 안에 있다.
- 우리가 못 하는 것: V 타일 + 이름 + 문장이 가운데에 있고 Face ID 상태는 화면 맨 아래 작은 줄이다. 시작 화면은 문장 2줄과 버튼 2개 사이가 800pt 가까이 빈다. 브랜드를 말하는 요소가 타일 하나뿐이다. stack-line의 `v0.2.0 — latest release` 같은 mono 한 줄이 없다.

### 4.11 Backup / Restore
- 앱: `backup-revealed-app.png`, `s05-ready-app.png`.
- reference: [Phantom Recovery Phrase](https://mobbin.com/screens/59600d67-4352-48a0-ae8d-9d0ff72ca1c4), [Phantom Import](https://mobbin.com/screens/c0a864b3-83cc-4a65-a01f-b45bf94cdeec), [Phantom Add Account](https://mobbin.com/screens/6c893a9e-f9bd-48cb-8c4e-271f38f98858).
- reference가 하는 것: 번호 + 단어를 같은 면 안에 두고, "클립보드 복사"를 한 줄 텍스트 행동으로 둔다. 가져오기는 단일 입력 하나다.
- 우리는 어디서 앞서나: 12칸 + 번호 + 붙여넣기 + 틀린 칸만 표시는 Phantom보다 안전하다. 체크박스와 꺼진 Primary 조합도 명확하다.
- 우리가 못 하는 것: 12칸이 모두 1.5pt 회색 outline이라 화면이 "표"처럼 무겁다. 입력 인지가 목적이라 border는 허용된다 (AGENTS rule 10). 하지만 굵기와 반경을 낮추면 같은 기능으로 더 조용해진다. 12/24 선택은 검정 pill로, 다른 chip(회색)과 다르다.

## 5. Findings (기초 결함 순서. 픽셀 단위는 부록)

오너 지침: 수치 nit은 줄이고 Foundation 결함을 먼저 본다. 아래는 "파일 하나만 고쳐도 모든 화면이 좋아지는 정도" 순서다.

### P0
없음. 안전 구조와 상태 구분은 맞다.

### P1 — Foundation 결함 (모든 화면에 영향)

| # | 기초 결함 | 왜 기초인가 | Figma-first 수정 (token/component) |
|---|---|---|---|
| F1 | **Accent 규율 부재.** 파랑 Primary, 파랑 링크, 파랑 탭, amber 칩, 녹색 금액, 4색 상태 배지가 한 화면에 공존한다. stack-line은 accent 1개다. | 시각 언어의 핵심이다. 지금은 "색이 많은 템플릿"으로 읽힌다. | 규칙 + 토큰: 화면당 파랑은 Primary 1 + 선택 탭 1. `text/link`는 회색 Label + chevron으로 낮춘다. 테스트넷 칩은 amber 면 대신 중립 면 + amber 점. 상태(진행/성공/실패)는 색 면이 아니라 아이콘 형태 + 글자로 말한다. |
| F2 | **Chrome 중복: 모든 화면 헤더에 칩 2개.** 제목과 경쟁한다. (정책은 오너 결정. 실행 구조만 지적) | Header 컴포넌트 구조 문제다. 화면 20개에 복제된다. | `Product header` trailing slot을 칩 1개로 합친다("Sepolia · 테스트"). 큰 제목 화면(내역, 설정)은 칩을 제목 아래 Micro Mono 줄로 내린다. |
| F3 | **사실 정보 타입 체계 없음.** 주소만 mono이고 해시, 체인, 블록, 버전, 상태 근거에 "사실용 서체" 계층이 없다. stack-line의 핵심 장치를 번역하지 않았다. | Type system 구멍이다. 모든 detail 화면이 같은 회색 sans로 같은 무게다. | 새 text style `Product B / Micro Mono` (Plex Mono 12/16, `text/tertiary`). 이미 있는 데이터만: tx 해시, 블록, chainId, 버전. 새 기능이 아니라 기존 값의 표현이다. |
| F4 | **빈 공간이 설계되지 않았다.** Send, Start, Receive, Activity에서 요소 사이 간격이 커서 "끊김"으로 읽힌다. 반대로 Review는 중요한 총액이 fold 아래다. | Layout 구조 문제다. 스크롤과 엄지 영역 규칙이 없다. | 레이아웃 규칙 추가: (a) 금액 + 칩 + CTA는 하단 60% 엄지 영역에 붙인다 (Toss). (b) 돈이 나가는 총액은 CTA 바로 위 고정. (c) 화면당 쉼은 1곳. |
| F5 | **버튼 위계 논리가 상태와 맞지 않는다.** 실패 결과에서 Primary = "확인"(닫기), 가치 있는 "다시 보내기"는 Secondary. | Component logic이다. "Primary = 지금 가장 가치 있는 행동"이 깨졌다. | 실패는 Primary "다시 보내기" + Ghost "닫기". 되돌릴 수 없는 sheet는 기존 오너 결정(안전이 Primary)을 유지한다. |
| F6 | **정보 반복, 정보 구조 약함.** Home hero와 첫 행이 같은 수량. Asset detail 정보 블록은 사실상 행 1개. 테스트넷 자산은 차트가 없는데 대체 주인공이 없다. | IA 문제다. 면마다 "이 화면의 단 하나의 사실"이 정해지지 않았다. | 한 종 보유 시 첫 행 trailing 제거. Asset detail의 주인공 = 사실 블록(네트워크, 컨트랙트, 이 자산 내역)을 Micro Mono로. |

### P1 — 컴포넌트 수준 (기초는 아니지만 눈에 띈다)

| # | 문제 | 수정 |
|---|---|---|
| C1 | 가장 중요한 문장이 가장 작다: "보내면 취소할 수 없어요" 12px 회색 한 줄. | `Body Small` 15px, `text/primary`로 승격. 받기의 "Sepolia 네트워크로만 보내세요"도 같다. |
| C2 | Restore 12칸이 굵은 outline이라 표처럼 무겁다. | `B/Secret grid`: 면 `surface/canvas` + 얇은 border, focus만 강하게. 입력 인지는 유지한다. |
| C3 | Settings에서 민감한 행(복구 구문)과 일반 행(네트워크)의 무게가 같다. | 값 칸에 Micro Mono "Face ID 필요". 색은 쓰지 않는다. |

### P2
- 성공 결과에 감정의 정점이 없다. 3단계 선이 채워지는 400ms ease-out 1회 (드문 순간만 모션. reduced motion이면 정지).
- 모션 규칙 점검 (캡처로 확인 불가): press scale 0.97 @100ms, sheet `cubic-bezier(0.32,0.72,0,1)`, 키패드는 haptic만, ease-in과 `transition: all` 금지.
- Dark의 amber 칩이 가장 밝다. 글자만 amber로.
- Start/Lock에 Micro Mono 한 줄 (`v1.0.0 · Sepolia · 이 기기에만 저장`. 버전은 placeholder 확정 후).

### 부록: 픽셀 수준 (낮은 우선순위, 참고만)
- Settings 행 높이가 약 78pt로 커서 라이선스가 탭 바에 가린다. 마지막 행 아래 탭 바만큼 여백.
- Receive QR이 폭의 약 57%. 더 크게.
- Send 금액이 왼쪽 정렬. 중앙 정렬은 검토만.
- Activity 하단 공백은 억지로 채우지 않는다.

## 6. VaultMe design principles (stack-line.dev + references)

1. accent는 화면당 하나다. Primary 파랑만. 링크, 칩, 상태는 회색 + 아이콘 형태로 말한다.
2. 큰 숫자는 크고 촘촘하게 (700, 자간 음수). 나머지는 조용한 400/500.
3. 사실은 mono 마이크로 라벨로 쓴다: 주소, 해시, 체인, 블록, 버전. 감정은 sans로.
4. 선은 기능이 있을 때만: 입력 인지, focus, 고정 footer. 구분은 간격과 12px 띠로.
5. 빈 공간은 설계한다. 화면당 쉼은 1곳. 금액과 CTA는 엄지 영역에 붙인다.
6. 카피는 약속이 아니라 사실이다. 돈이 나가는 문장은 가장 크게, 가장 진하게.
7. 가장 가치 있는 행동에 accent를 준다 (실패 후 다시 보내기). 되돌릴 수 없는 일은 안전한 쪽이 Primary.
8. 같은 정보는 한 번만 보인다 (hero와 첫 행 중복 금지).
9. 자주 쓰는 것은 움직이지 않는다 (키패드). 드문 순간만 움직인다 (확정, 잠금 해제). 곡선은 ease-out, 250ms 이하.
10. 모든 시각 변경은 Figma 먼저, 그다음 앱 (AGENTS rule 6). Figma 일치는 품질의 증명이 아니다.

## 7. 한계

- 캡처는 정지 화면이다. 모션과 haptics는 device 증거(`work/v9/device/`) 파일명만 확인했고 영상은 보지 않았다.
- Figma 원본 PNG와 app의 직접 대조는 하지 않았다 (품질 리뷰 목적).
- Mobbin: 2회 rate limit 후 재시도했다. 잠금/생체인증은 Robinhood/Coinbase/Toss 결과가 없어 Remote, Setel로 대체했다. 이 그룹 판단은 확신이 낮다.
- 점수는 개인 판단이다. 수치 비교는 stack-line DOM 실측(폰트 크기, 자간, 색)만 객관값이다.

---

**Your Mobbin AI usage is high this month**

Usage is unlimited during beta. If your usage stays at this level, you may need to purchase more credits once limits take effect. [View usage and plan options](https://mobbin.com/settings/billing-and-usage)
