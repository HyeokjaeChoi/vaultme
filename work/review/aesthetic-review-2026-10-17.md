# VaultMe 시각 품질 리뷰 (aesthetic review)

날짜: 2026-10-17. 리뷰어: Staff Product Designer (consumer fintech) + YC founder 관점. READ-ONLY.
사용 skill: `impeccable` (critique + audit.native 관점), `apple-design` (타이포·간격·재질 기준), `emil-design-eng` (디테일 polish 기준).
`design-taste-frontend`는 랜딩용이라 쓰지 않았다 (redesign-b.md §7과 같음). `ui-ux-pro-max`는 쓰지 않았다.
근거: `work/compare/*-app.png` (Light 14장, Dark 3장 직접 확인), `outputs/design/redesign-b.md` §9, `PRODUCT.md`, 이전 리뷰 `pd-review-final-2026-10-17.md`.
한계: Mobbin MCP는 로그인이 필요해서 못 썼다. Toss, Coinbase, Revolut, Wise, Phantom 비교는 내 기억 기준이다. S05는 제외했다. 일부 PNG(review, result, activity)는 390 폭이라 세밀한 계측은 못 했다.

## 판정

**깔끔하고 안전하다. 그러나 "기억에 남는" 수준은 아니다. 지금 점수는 7점대 초반이다.**
- 이전 리뷰의 "실행 버그"(`#000` 글자, Dark 잠금 문구)는 고쳐졌다. 잠금 Dark 문구가 이제 보인다.
- 남은 격차는 버그가 아니다. **개성(brand)**, **굵기 위계**, **빈 공간 활용**, **헤더 패턴 불일치**다.
- Toss, Coinbase 옆에 놓으면 "정돈된 템플릿"으로 읽힌다. 확실한 한 가지 시각 서명이 없다.
- 앱은 Figma와 같다. 아래 지적 대부분은 **디자인 자체의 약점**이다. 앱 drift는 별도로 표시했다.
- 모든 시각 변경은 Figma 먼저다 (AGENTS rule 6).

## 그룹별 점수 /10

| 그룹 | 점수 | 이전 | 한 줄 이유 |
|---|---|---|---|
| Onboarding (S02, S03) | 7 | 7 | 체크 행, 제목 위계는 깔끔하다. 화면 60%가 빈 공간이다. 체크박스가 회색 outline이라 브랜드가 없다 |
| Home | 7.5 | 7 | 700 숫자 hero, pill 버튼, 최근 내역은 좋다. 같은 수량이 hero와 첫 행에 두 번 나온다 |
| Asset detail | 6 | 6 | 변화 없음. 제목이 중앙이 아니다. 로고가 왼쪽에 홀로 있다. 정보 블록이 비었다 |
| Send input | 7 | 7 | 키패드는 좋다. 금액과 키패드 사이가 텅 비었다. 금액이 왼쪽 정렬이라 Toss식 집중감이 없다 |
| Review + risk | 8 | 8 | 가장 완성도 높다. 주소 mono 강조, 위험 sheet, 위계 모두 좋다 |
| Results | 7 | 7 | Hero는 좋다. 진행선 라벨 정렬이 어색하다. Failed에서 버튼 3개가 무겁다 |
| Receive | 6.5 | 8 | 이전보다 낮췄다. QR이 맨몸이다. faucet 행이 footer 근처에서 깨진다 (아래 P0) |
| Activity | 7 | 7 | 행은 production 수준이다. 헤더가 칩 2개로 시끄럽고 Home과 패턴이 다르다 |
| Tx detail | 7 | 7 | Results와 거의 같은 화면이다. 행 간격이 넓다 |
| Settings + license | 6.5 | 6 | 설정 7, 라이선스 5.5. 라이선스는 모든 행이 600이라 굵은 벽이다 |
| Brand / lock | 5 | 5 | 변화 없음. 잠금 문구는 고쳐졌다. 마크가 "잠금 앱" 템플릿이다. 시작 화면에 서명이 없다 |
| Dark mode | 7.5 | 7 | Canvas `#11161D`, 칩, 버튼 모두 맞다. 복구 구문 panel이 canvas보다 어둡다 (P1) |

## 이전 점수 재채점 (3개)

- **Brand/lock 5 → 5.** 잠금 Dark 문구(P0)는 해결됐다. 그러나 Face ID 아이콘이 웃는 얼굴(smiley)이다. 보안 앱에서 장난스럽다. 마크는 아래 "Brand mark 의견"에 쓴다. 시작 화면은 마크 하나만 있고 나머지는 빈 흰색이다.
- **Asset detail 6 → 6.** 헤더 제목 "Sepolia ETH"가 중앙이 아니다 (칩 때문에 왼쪽으로 밀림, 화면 중심 대비 약 -40px). 로고(56)가 왼쪽 정렬로 홀로 떠 있다. "자산 정보"는 행 1개 + 안내 2줄이다. 행 사이 빈 공간이 크다.
- **Settings + license 6 → 6.5.** 설정 본 화면은 계정 블록과 band 구조가 좋다 (7). 라이선스 목록은 모든 패키지명이 600이고 행마다 64pt 넘는 높이라 "굵은 글자의 벽"이다 (5.5).

## Findings

범례: [Figma first] = 시각 변경이라 Figma를 먼저 고친다. [design weak] = 디자인 자체가 약함. [app drift] = 앱이 Figma와 다름.

### P0

**P0-1. Receive S30: faucet 행이 큰 기기에서 footer 아래로 떨어진다. (known issue)**
- 파일: `receive-faucet-app.png`, `receive-faucet-dark-app.png`, `apps/mobile/src/pages/receive/index.tsx` 84행 (`<FaucetRow>`가 body 끝에 있고 footer는 고정).
- 문제: 작은 기기에서는 faucet 행이 QR·주소 아래에 있다. 큰 기기에서는 body 높이가 짧아서 행이 footer 경계에 붙거나 caption이 footer에 가려진다. 캡처에서도 행이 footer 선(y≈1610)에 바로 닿아 있다.
- 고침: [Figma first] [design weak] 고정 위치로 바꾼다. 두 방법 중 하나를 고른다.
  1. 권장: faucet 행을 footer stack 안으로 옮긴다. 순서: faucet Ghost 행 → "주소 복사" Primary → "공유". 높이 고정이라 기기 크기에 상관없다.
  2. body를 `flex:1` 컬럼으로 만들고 QR+주소는 위, faucet 행은 `marginTop:auto`로 footer 바로 위에 붙인다. 최소 간격 `space/4`.
- 어느 쪽이든 faucet 행 위·아래에 `space/6` 이상 여유를 둔다. 행 제목 "테스트 ETH 받기"는 600이다. 행 안 Latin "ETH"와 Hangul의 굵기가 섞인다. Label(500)로 낮춘다.
- Figma에서 iPhone 15 Pro Max(932)와 SE(667) 프레임 둘 다로 확인한다.

**P0-2. 시작 화면과 잠금 화면이 브랜드 화면이 아니다.**
- 파일: `start-app.png`, `lock-app.png`, `lock-dark-app.png`.
- 문제: 화면의 약 60%가 빈 흰색이다. 마크 72px + 워드마크 + 두 줄이 중앙에 있다. 첫 5초에 사용자가 보는 유일한 화면인데 Toss, Phantom 같은 "서명"이 없다.
- 고침: [Figma first] [design weak] 마크를 96–120으로 키운다. 워드마크는 Display M(32/700) 자간 -0.8로 한다. 마크 아래 여백을 `space/6`→`space/8`로 늘리고, 하단 버튼 영역과 시각 균형을 맞춘다. 한 줄 가치 제안을 Title 2로 올린다. 아래 "Brand mark 의견" 참고.
- 이것을 P0로 둔 이유: 지금 Brand 점수 5를 7로 올릴 가장 싼 방법이다. P0 버그는 아니다. 출시 전 인상 문제다.

### P1

**P1-1. 굵기 위계가 평평하다. 거의 모든 것이 600이다.** [Figma first] [design weak]
- 파일: Home 자산 행, Settings 행, Licenses 행, 상세 행, 버튼, 섹션 제목.
- 문제: Section title "자산"(22/600), 행 제목(17/600), 설정 행(17/600), 라이선스 행(17/600), 버튼(17/600)이 모두 600이다. Hangul 600은 시각적으로 무겁다. 크기만으로 위계를 만든다. Toss는 행 제목 500, 섹션 제목 700으로 나눈다.
- 고침: `Product B / Headline`의 행 용도를 500으로 내리는 `Row title` 스타일을 추가한다 (Headline 600은 버튼·강조 전용). 설정·라이선스 행과 Home 자산 행은 `Row title`을 쓴다. 600은 금액·제목·버튼에만 쓴다. 이 한 가지로 라이선스·설정의 "굵은 벽"이 사라진다.
- Pretendard는 500이 있다 (400/500/600 구성이라 새 weight 필요 없음).

**P1-2. 같은 수량이 Home 상단과 첫 행에 두 번 나온다.** [Figma first] [design weak]
- 파일: `home-app.png`. hero "1.284732 ETH"와 자산 행 "1.284732 ETH"가 같은 화면 위쪽 절반에 있다. 행 부제 "ETH"는 제목 "Sepolia ETH"와 중복이다.
- 문제: 정보 밀도가 낮아 보이고 "빈 지갑 앱" 같다. 시장 가격이 없어서 hero가 할 말이 적다.
- 고침: 행 부제를 "테스트넷"(USDC는 "Sepolia · 테스트 토큰") 대신 다른 의미 있는 값으로 바꾼다. 또는 hero 보조줄 "테스트넷 자산은 시장 가격이 없어요."를 남기고 hero 라벨 "Sepolia ETH"를 "총 보유"로 바꿔서 2개 자산의 합이 아니라 대표 자산임을 분명히 한다. (오너 결정 #7 "테스트넷 + 주 보유량"은 유지.) 최소한 행 부제 "ETH"/"USDC" 반복을 지운다.

**P1-3. 탭 헤더 패턴이 서로 다르다.** [Figma first] [design weak]
- 파일: `home-app.png`(계정 행 + 칩), `activity-app.png`(Title 1 + 칩 2개), `settings-app.png`(Title 1, 칩 없음), `asset-detail-app.png`(뒤로 + 가운데 제목 + 칩), 보내기 화면(뒤로 + 칩 2개 + Title 1).
- 문제: 같은 "칩 영역"이 오른쪽에 있다가, 칩이 1개, 2개, 0개다. 제목 위치와 크기도 다르다. Activity의 칩 2개는 제목과 높이를 다투고 시끄럽다.
- 고침: 헤더를 `B/Header` 하나로 통일한다. 칩은 항상 "Sepolia 테스트넷" 1개. "테스트 데이터"는 데이터가 실제 테스트 모드일 때만 같은 자리에 뜬다. Activity에서는 "테스트 데이터" 칩을 Section header 오른쪽으로 내린다. Asset detail 제목은 중앙이 아니라 왼쪽 Title 2로 맞추고 칩은 오른쪽에 둔다 (현재 약 40px 어긋남).

**P1-3b. Receive: QR이 맨몸이다.** [Figma first] [design weak]
- 파일: `receive-faucet-app.png`. 순수 검정 모듈, 모서리 각진 finder pattern, 중앙 마크 없음, 컨테이너 없음.
- 문제: 정보는 정확하다. 그러나 Phantom, Coinbase는 둥근 흰 카드 + 중앙 로고 + 부드러운 모듈을 쓴다. 가장 "스크린샷 찍히는" 화면인데 가장 밋밋하다.
- 고침: QR을 `radius/2xl` 흰 타일(패딩 `space/5`)에 넣는다. Dark에서는 이미 흰 타일이다. Light에서도 `surface/subtle` 타일 위에 흰 QR로 구분한다. 모듈 색은 Ink(`text/primary`)로 한다 (순수 `#000` 아님). 중앙 마크는 넣지 않는다 (decode 위험; 오류 정정 수준을 올리지 않는다는 조건에서만 검토). 주소 mono는 16/24 대신 15로 낮추고 앞뒤 강조는 유지한다.

**P1-4. 진행선(Results) 라벨 정렬이 어색하다.** [Figma first] [design weak]
- 파일: `result-confirmed-app.png`. 라벨 "보냄"은 왼쪽, "확정"은 오른쪽, "블록 포함"은 가운데. 점은 양끝이 화면 padding에 붙어 있다.
- 문제: 가운데 라벨은 점 아래 중앙이다. 양끝 라벨은 점의 왼쪽/오른쪽 가장자리에 맞춰 있어서 "점 아래"로 읽히지 않는다. 선이 모두 진한 초록이라 "끝났다"는 신호가 점과 구분되지 않는다.
- 고침: 3개 단계를 같은 폭 3칸으로 나누고 각 칸 중앙에 점과 라벨을 둔다. 선은 점 사이에만 그린다. 완료 선은 `status/success`, 현재→다음 선은 `border/subtle`.

**P1-5. Failed 결과의 버튼 3개가 무겁다.** [Figma first] [design weak]
- 파일: `result-failed-app.png`. "확인"(Primary) / "다시 보내기"(Secondary) / "거래 상세 보기"(텍스트).
- 문제: 실패 화면의 주 행동은 "확인"이 아니라 "다시 보내기"일 때가 많다. 3단 버튼이 화면 하단 25%를 차지한다. 선택지가 같은 무게로 보인다.
- 고침: "다시 보내기"를 Primary로, "확인"을 Secondary로 바꾼다. "거래 상세 보기"는 Inline 링크(Label)로 hero 본문 아래로 옮긴다. 하단은 버튼 2개로 줄인다. (오너 §9 "다시 보내기 둔다"는 유지. 순서만 바꾼다.)

**P1-6. Send input: 금액과 키패드 사이가 텅 비었다.** [Figma first] [design weak]
- 파일: `send-s20b-amount-app.png`. 금액은 y≈210, 칩·키패드는 y≈480. 사이 약 230px(390 기준 약 55%)가 빈 흰색이다.
- 고침: 금액을 키패드 위쪽 중앙 영역(가용 영역의 수직 중앙)에 놓는다. 가용 영역은 헤더 아래부터 칩 위까지. 금액 정렬은 왼쪽 유지가 오너 방향이라 중앙 정렬로 바꾸지 말고 수직 위치만 옮긴다. "보낼 수 있는 금액"은 금액 바로 아래에 둔다. 키패드 숫자를 22→26으로 키운다.

**P1-7. 복구 구문 panel이 Dark canvas보다 어둡다.** [Figma first] [design weak]
- 파일: `backup-revealed-dark-app.png`. panel은 `#0B0F14` 부근이고 canvas는 `#11161D`다. 홈의 다른 Dark 면은 canvas보다 밝은 쪽으로 올라간다.
- 문제: "구덩이"처럼 보인다. 번호 1–12 색이 어두워서 단어와 대비가 크게 갈린다.
- 고침: panel fill을 `surface/raised`(canvas보다 한 단계 밝음)로. 번호 색은 `text/tertiary`.

**P1-8. 라이선스 목록 행이 너무 높고 굵다.** [Figma first] [design weak]
- 파일: `licenses-app.png`. 행 높이 약 64pt, 600 제목, 오른쪽 라이선스명 + chevron이 `text/tertiary` 연한 회색이다.
- 고침: 행 높이 52. 제목 `Row title`(500). 오른쪽 값은 Caption. "Solar Icons 원본 보기" 행은 외부 링크 아이콘 행이라 같은 높이로 두되 다른 행과 같은 굵기로 맞춘다. 그룹 라벨 "아이콘·글꼴"은 중점 사이 공백(`아이콘 · 글꼴`)으로 쓴다.

**P1-9. Face ID 아이콘이 웃는 얼굴이다.** [Figma first] [design weak]
- 파일: `lock-app.png`, `lock-dark-app.png`. 하단 스캔 아이콘에 눈 2개 + 입이 있다. Light에서 연한 파랑이라 대비도 약하다.
- 고침: Solar `face-scan-circle`의 웃음 변형 대신 입이 없는 face-scan(눈 + 모서리 bracket)이나 `shield-keyhole`을 쓴다. Light 색을 `icon/default` 또는 Primary로 맞춘다. 문구와 아이콘 사이 gap은 `space/2`. 보안 앱은 사용자가 웃을 필요가 없다.

### P2

| # | 파일 | 문제 | 고침 |
|---|---|---|---|
| P2-1 | `home-app.png` | 섹션 제목 "자산"(22/600)과 행 제목(17/600)이 굵기가 같아 위계가 크기에만 의존 | P1-1 적용 후 "자산" 섹션 제목은 22/700 유지 |
| P2-2 | `home-app.png` 하단 탭 | Home만 Bold 채움 아이콘(파랑), 나머지 Linear 회색. 아이콘 선 굵기가 Linear 24 / Bold 사이에서 눈에 띄게 다르다 | Bold 아이콘을 Linear와 같은 optical size로 맞춘다. 선택 라벨은 500→600 |
| P2-3 | 모든 상세 행 | 라벨(14)과 값(16)의 중심이 1–2px 다르다 (`result-confirmed-app.png` 551/553) | Detail row를 baseline 정렬이 아닌 center 정렬 Auto layout으로 고정한다. 행 높이 52로 줄인다 (지금 약 54+) |
| P2-4 | `send-s20b-amount-app.png` | 잔액 1.284658 ETH vs Home 1.284732 ETH. 같은 앱에서 수치가 다르다 | 예시 데이터를 하나로 통일한다 (Figma 예시 값) |
| P2-5 | Onboarding `precheck-app.png` | 체크박스 outline이 회색이라 브랜드 신호가 없다. 체크 시 색 변화만 있다 | 체크 상태만 Primary 채움(Bold check). 미체크는 `border/strong`으로 대비를 올린다 |
| P2-6 | 칩 `Sepolia 테스트넷` | 베이지/갈색 fill은 Home에서 따뜻한 유일한 색이라 튄다. 경고처럼 읽힌다 | warning 계열 말고 `surface/subtle` + 점(dot) 아이콘으로 바꾸거나, 지금 색을 유지하려면 `status/warning/subtle`임을 문서에 기록한다 |
| P2-7 | `review-app.png` footer | 12px 캡션이 3줄 정보 위에 붙어 작다. 390 폭에서 가독성 한계 | 12→13(Caption 비율 유지), 한 줄로 줄인다 |
| P2-8 | `result-failed-app.png`, `result-confirmed-app.png` | Hero 아래 큰 여백과 band 사이 간격이 일정치 않다 (약 16/24) | band 위·아래 여백은 `space/6` 하나로 |
| P2-9 | `activity-app.png` | 목록 아래 빈 공간이 크다. Empty는 아니지만 밀도가 낮다 | 날짜 그룹 헤더 위 간격을 `space/6`으로 늘리고, 하단 안내가 필요 없다면 그대로 둔다 (Toss도 빈다) |
| P2-10 | App drift 후보: `review-app.png` 등 390 폭 PNG | 이 PNG들은 다른 PNG(1206 폭)와 해상도가 다르다. 폭이 다르면 비교에서 간격이 다르게 보인다 | 비교 PNG를 모두 1206×2622로 다시 만든다 (품질 검수가 같은 기준에서 보이게) |

앱 drift: 이번에 본 PNG 범위에서는 app이 Figma와 다른 곳을 발견하지 못했다. 위 지적은 거의 전부 design weak다.

## Top 5 — 인지 품질을 가장 많이 올리는 변경

1. **굵기 위계 정리 (P1-1).** `Row title` 500 하나로 Home·설정·라이선스가 가벼워진다. 비용은 스타일 1개와 instance 교체다. 효과가 가장 크다.
2. **시작·잠금 브랜드 화면 (P0-2 + 마크).** 마크를 키우고 서명 요소 하나를 넣는다. Brand 5 → 7.
3. **Receive 재구성 (P0-1 + P1-3b).** faucet 행 위치를 고치고 QR을 카드에 넣는다. 스크린샷 찍히는 화면이다.
4. **헤더 통일 (P1-3).** `B/Header` 하나, 칩은 1개. 탭 사이를 오갈 때 느끼는 "조립한 느낌"이 줄어든다.
5. **금액 입력 수직 균형 + Failed 버튼 정리 (P1-6, P1-5).** 가장 자주 보는 흐름의 마무리 느낌이 달라진다.

## Brand mark 의견

**의견: 현재 mark는 iterate를 권한다.** 오너가 초안 유지를 정했으므로 결정을 다시 따지지는 않는다. 이 점수에는 영향이 있다고 본다. Brand/lock 5에서 7로 가려면 마크 자체보다 "마크를 쓰는 방식"이 더 중요하다.

문제:
- 파란 둥근 타일 + 흰 원 + 열쇠 구멍은 "잠금 앱", "비밀번호 관리자"의 일반 형태다. 1Password, Bitwarden, 일반 vault 앱과 구분이 안 된다. 지갑(wallet)이나 self-custody 신호가 없다.
- 앱 아이콘이 화면 안에 그대로 들어와 있다. 화면 안에서 앱 아이콘을 다시 보여주는 앱은 Toss, Coinbase에는 없다 (그들은 마크만 쓴다).
- 이름 "VaultMe"와 마크의 연결이 약하다. "Me"(내 기기)가 마크에 없다.
- 열쇠 구멍 하나는 읽기 쉽지만 기억에 남기에는 너무 일반적이다.

방향 3가지 (모두 Blue A 유지, Figma first):
1. **V + 열쇠 구멍 monogram.** V자 꼭짓점에 열쇠 구멍 모양의 빈 공간(negative space)을 둔다. 타일 없이 마크만 Primary 파랑 또는 Ink로 쓴다. "Vault"의 V가 서명이 된다. 가장 안전하고 구현도 쉽다.
2. **금고 다이얼(dial) 링.** 두꺼운 원 + 한 방향의 tick 1개. 잠금 해제 때 링이 한 칸 돌아가는 모션과 연결된다 (잠금 화면이 곧 브랜드 순간이 된다). 일반 열쇠 구멍과 구분되고 모션 서명이 생긴다.
3. **기기 + 열쇠 구멍.** 둥근 직사각형(폰 윤곽) 안에 열쇠 구멍. 태그라인 "내 기기에 열쇠를 두는"을 그대로 그린다. self-custody와 "내 기기"를 한 번에 말한다. 가장 제품 서사에 맞다.

공통 규칙:
- 타일(squircle)은 앱 아이콘 전용으로 두고, 화면 안에서는 마크만 쓴다.
- 워드마크 "VaultMe"는 Inter 기본 Bold가 아니라 자간을 조정한 전용 lockup으로 한다 (예: V와 M 대문자 간격 조정, -1.0 자간).
- 마크 크기는 96 이상. 지금 72는 화면 대비 작다.
- Logo·lock은 안전 증거가 아니다 (PRODUCT.md Icons). 마크에 체크 표시나 방패를 넣지 않는다.

## 잘 된 것 (유지)

- Review 화면의 위험 흐름과 주소 mono 앞뒤 강조. Phantom보다 읽기 쉽다.
- Home hero의 700 숫자 + 작은 단위 분리. Toss 수준이다.
- Dark canvas와 pill 버튼 대비, Dark 칩 색.
- 행의 token identity 배지 (받음·보냄·실패·진행).
- Lookalike sheet의 빨간 밑줄 차이 표시와 "취소" Primary.

## 다음 순서 (제안)

1. 마크 방향을 오너와 논의 (오너 결정이므로 제안만).
2. Figma에서 `Row title`, `B/Header`, QR 타일, 진행선 정렬, Failed 버튼 순서를 고친다.
3. P0-1을 두 기기 크기 프레임으로 확인한다.
4. 앱은 Figma가 승인된 뒤 바꾼다 (design-to-code skill).
