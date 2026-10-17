# VaultMe 재검수 — YC founder 관점 (rr-yc-founder)

작성일: 2026-10-17 · 역할: consumer fintech을 키운 YC founder · 범위: 읽기 전용(코드, Figma, simulator 변경 없음).
다른 리뷰어 보고서(rr-*-2026-10-17.md)는 읽지 않았다.

근거
- 앱 캡처: `work/compare/*-app.png` (약 25장, Light 위주, Dark는 home 1장 확인).
- 문서: `PRODUCT.md`, `outputs/design/redesign-b.md` §9.
- 이전 보고서: `work/review/seamless-yc-founder-2026-10-17.md`.
- 기준: https://stack-line.dev (built-in browser로 확인).
- 참고 앱: Mobbin iOS 화면(아래 링크). 직접 설치해서 걷지는 않았다.
- 코드는 `apps/mobile/src/pages/send/amount.tsx` 주석 한 곳만 확인했다.

---

## 0. 사용한 skill, 판단이 어떻게 바뀌었나

| Skill | 판단을 바꾼 점 |
|---|---|
| `impeccable` (critique) | 화면을 "Figma와 같은가"가 아니라 "Operate 모드의 제품 UI로서 위계, 일관성, 정직함이 있는가"로 봤다. 금융 앱은 장식보다 정밀함이 브랜드다. 그래서 점수는 "멋"이 아니라 "읽는 순서와 거짓 없음"에 줬다. 또 AI 템플릿 느낌(칩 남발, 둥근 pill, 중앙 정렬 빈 상태)을 찾는 눈으로 봤다. |
| `design-taste-frontend` | 이 skill은 landing page용이다. 앱 화면에는 직접 적용하지 않았다. 대신 stack-line.dev가 이 skill의 규칙(한 accent, 큰 타입, 장식 없음)과 같은 계열임을 확인했다. 그 잣대(한 accent, 모노 사실 라벨, 과장 없는 문구)를 VaultMe 화면에 옮겨 비교했다. 사실 앱이 이 기준에 꽤 가깝다는 결론에 도움이 됐다. |
| `onboarding` | Minimum Path to Value, Fogg(동기 x 능력 x 신호), Endowed Progress를 썼다. "첫 입금 전까지 사용자가 몇 번 막히나"를 세게 봤다. 결론: 능력(Ability) 부족이 아니라 순서(백업이 먼저) 문제다. |
| `competitive-strategy` | "복사할 것"과 "해자"를 나눴다. VaultMe의 해자는 비슷한 주소 비교 sheet와 이중 송금 차단이다. 속도에서는 Coinbase/Phantom을 못 이긴다. 그러니 "더 편한 지갑"이 아니라 "가장 정직한 서명 전 화면"으로 포지셔닝하라고 결론 냈다. |

---

## 1. 결론 (verdict)

**한 줄: 돈을 맡겨도 되겠다는 첫인상은 7점. 처음 1분 안에 돈이 들어오는 앱은 아직 아니다(활성화 4점).**

stack-line.dev 기준으로 보면:

| stack-line.dev 특징 | VaultMe |
|---|---|
| 한 accent | 통과. Blue A 하나. 성공/이익/안전에 파랑을 안 쓴다(Primary는 행동만). |
| 큰 위계 | 부분 통과. Home 잔액은 강하다. 시작·잠금·확인 화면은 위계가 약하다. |
| 모노 사실 라벨 | 통과. 주소는 IBM Plex Mono, 앞 6자와 뒤 4자만 굵게. 이건 stack-line보다 낫다. 목적이 있다. |
| 정직한 정밀 copy | 대부분 통과. "형식만 확인했어요", "이미 네트워크에 보냈어요. 같은 거래를 다시 보내지 마세요". 약점: "0원 거래 표시"(원=KRW). |
| 엄격한 정렬 | 부분 통과. 빈 Home에서 중앙 정렬 빈 상태와 좌측 정렬이 섞인다. |
| 확신 | 부분. 선택지가 적고 안전하지만, 화면이 "조용한 것"과 "비어 있는 것"의 경계에 있다. |

stack-line.dev는 자기 자신도 완벽하지 않다. 데모 terminal에 `[object Object]`가 8줄 찍힌다(page text에서 확인). 신뢰를 파는 페이지의 결함이다. VaultMe도 같은 원칙을 적용해야 한다: 데모, 예시 값, 테스트 값이 진짜 버그처럼 보이면 신뢰가 깎인다. (아래 변경 #8.)

### 이전 보고서 이후 바뀐 것 (check what changed)

| 이전 Top 10 | 지금 상태 | 근거 |
|---|---|---|
| #1 테스트 자산 받기 경로 | **해결(부분)**. 빈 Home과 받기에 "테스트 ETH 받기 / QuickNode ↗" 행. | `home-empty-faucet-app.png`, `receive-faucet-app.png` |
| #2 백업 시점 이동 | **미해결**. 오너가 Q14를 "유지"로 확정(§9.3). 받기 전에 백업 필수. | `receive-backup-app.png`: "먼저 복구 구문을 백업하세요 / 백업을 마치면 받기 주소가 보여요" |
| #3 USDC 보내기 | **미해결**. 코드 주석: "This flow sends ETH only". §9.3: 다음 이슈. | `amount.tsx` |
| #4 첫 입금 도착 순간 | 미해결. Figma에 없음. | |
| #5 중복 testnet 고지 제거 | **해결**. §9.3 "Home 첫 실행 sheet 없앤다". (캡처 파일 `home-firstlaunch-sheet-app.png`은 남아 있다. 실제 코드에서 제거됐는지는 확인하지 못했다.) | |
| #6 QR 스캔 | 미해결, 다음 이슈. 받기 QR 생성은 구현됨. | `receive-app.png` |
| #7 S23 예상 시간 | 미해결. Pending에 "네트워크 처리를 기다리는 중이에요"만 있다. | `result-pending-app.png` |
| #9 S02 체크 3개 | 유지(3개). | `precheck-app.png` |

새로 좋아진 것: 실제 QR, 전체 주소 4글자 묶음과 앞뒤 굵게, 로고 마크(V + 열쇠 구멍), 잠금 화면의 Face ID 자동 시작, 설정 계정 블록, 3단계 진행 표시, 실패 시 "다시 보내기".

---

## 2. 점수 (/10)

| 항목 | 점수 | 한 줄 이유 |
|---|---|---|
| 첫인상 (first impression) | **6** | 깨끗하다. 하지만 시작 화면이 비어 있다. 약속(promise)이 없다. 로고 아래 문구 "내 기기에 열쇠를 두는 Sepolia 테스트넷 지갑이에요"는 정직하지만 이유가 없다. Phantom, Coinbase는 첫 화면에서 이점 3개나 단계 표시로 이유를 준다. |
| 한눈의 신뢰 (trust at a glance) | **7** | 한 accent, 숫자 위계, 모노 주소, 거짓 없는 문구. 감점: "Sepolia 테스트넷 / 테스트 데이터" 칩 2개가 항상 상단을 차지한다. 안전하지만 앱이 "장난감"처럼 보인다. 실제 금융 앱의 침착함에는 못 미친다. |
| 활성화 경로 (activation path) | **4** | 백업 게이트 + 외부 faucet. 이전 3점에서 faucet 행 덕분에 4점. faucet 행은 버튼처럼 보이지 않는다(제목 + 회색 "QuickNode" + 작은 설명). 도착 순간 설계가 없다. |
| 보내기 확신 (send confidence) | **8** | 전체 주소, 비슷한 주소 비교, 이중 송금 차단, 3단계 진행. 감점: 검토 화면 첫 viewport에서 수수료 행이 잘려 있다(`review-app.png`). 예상 도착 시간이 없다. USDC를 못 보낸다. |
| 완성도 (polish) | **7** | 정렬과 간격은 일관되다. Dark도 깔끔하다(`home-dark-app.png`). 감점: 빈 Home 중앙 정렬, "0원 거래 표시" 복사, 복구 구문 예시가 전부 "abandon", 결과 화면의 큰 여백. |

---

## 3. 화면별 판단 (본 것만)

Mobbin 링크는 각 항목의 비교 대상이다.

### 3.1 시작 → 만들기 (`start-app.png`, `precheck-app.png`)
- 좋은 점: 선택지 2개. Primary는 "새 지갑 만들기" 하나. 복구는 Secondary.
- 약점: 화면의 60%가 빈 여백. 이유(왜 이 지갑인가)가 없다. 사용자는 "테스트넷"이라는 단어를 먼저 읽는다. 첫 줄이 "아직 쓸모가 없다"는 신호다.
- 비교: Coinbase는 Primary 하나와 큰 로고로 단순하게 시작한다. 하지만 바로 이어서 단계 표시(2분, 5분)로 "얼마나 걸리는지"를 알려 준다. VaultMe의 precheck에는 소요 시간 표시가 없다.
  - Coinbase 온보딩 flow: https://mobbin.com/flows/9c0de32f-f2a9-44e7-b568-7a1ded6bbb45
  - Coinbase 계정 설정 flow: https://mobbin.com/flows/5308c64b-afd4-461e-b0a7-0f348b9adde0
- Phantom은 "새 지갑 만들기"에서 이점 3개를 준다. 복구 구문 지갑은 Secondary로 내린다. 같은 구조(Primary 하나 + Secondary)이지만 "이유"가 있다: https://mobbin.com/screens/4b8bd9cd-6c27-44eb-9fc0-45448075b648
- precheck 3개 체크는 정당하다. 하지만 단어가 무겁다("복구 구문을 잃으면 되찾을 수 없어요"가 첫 줄). 소요 시간("약 3분, 종이와 펜이 필요해요")을 위에 한 줄 주면 이탈이 줄 것이다. 종이가 없는 사용자를 미리 걸러 준다.

### 3.2 복구 구문 (`backup-revealed-app.png`)
- 좋은 점: 번호, 2열, "누구에게도 보여 주지 마세요. VaultMe도, 고객지원도 복구 구문을 묻지 않아요."는 신뢰를 만든다.
- 비교: Phantom은 같은 구조에 "Copy to clipboard"를 둔다. VaultMe는 복사를 뺐다. 이건 VaultMe가 옳다(클립보드 노출 위험): https://mobbin.com/screens/59600d67-4352-48a0-ae8d-9d0ff72ca1c4
- 약점: 예시가 "abandon" x 11 + "about"이다. 공개 test vector라서 규칙상 허용(AGENTS.md 4번)이다. 하지만 스토어 스크린샷, 데모 영상, 투자자 데모에 나오면 "버그인가?" 하고 의심한다. 데모용 빌드에서는 무작위 단어로 시연하라.

### 3.3 빈 Home (`home-empty-faucet-app.png`)
- 좋은 점: 빈 지갑에서 받기가 Primary, 보내기가 Secondary. 버튼 자리는 고정. 칩 설명 문구 "테스트넷 자산은 시장 가격이 없어요."
- 약점 1: 칩이 2개(Sepolia 테스트넷, 테스트 데이터)다. 둘 다 항상 보인다. 첫 화면에서 "경고 2개"처럼 읽힌다.
- 약점 2: faucet 행이 맨 아래 한 줄이다. 아래에 큰 빈 공간이 있다. 이 행이 이 화면에서 가장 중요한 행동인데, 가장 약한 시각 무게를 가진다. 회색 "QuickNode"와 작은 외부 링크 아이콘은 "정보"처럼 보인다.
- 약점 3: 빈 상태 아이콘과 문구는 중앙 정렬이고, 나머지(잔액, faucet 행)는 좌측 정렬이다. 정렬이 섞인다.
- 비교: Revolut 빈 Home은 "Add money"를 가장 앞에 두고 "No transactions yet"을 한 줄로 끝낸다. 설명 대신 행동이다:
  - https://mobbin.com/screens/4467a0cf-c122-47f6-8ad2-24532c385176
  - https://mobbin.com/screens/62272aa1-883e-4c36-b853-7a0706983d62 (큰 제목 "Your money's new home" + 단일 행동)
- Coinbase Home은 "Get started: Fund your account 2/4"로 진행률을 보여 준다(Endowed Progress). VaultMe에는 진행률이 없다: https://mobbin.com/flows/9c0de32f-f2a9-44e7-b568-7a1ded6bbb45 (Home 화면 포함)

### 3.4 받기 (`receive-faucet-app.png`, `receive-backup-app.png`)
- 좋은 점: 큰 QR, 4글자 묶음 주소, 앞뒤 굵게, "Sepolia 네트워크로만 보내세요", Primary "주소 복사".
- 비교: Phantom, World App, PayPal은 같은 정보를 쓴다. 큰 차이는 "복사했어요" toast다. VaultMe는 복사 후 라벨이 바뀐다(device 증거 12-14번). 괜찮다.
  - Phantom: https://mobbin.com/screens/c0b35d9a-68d9-4d0c-becb-62815fde60ba
  - World App (네트워크 경고 문구가 좋다): https://mobbin.com/screens/f149fd5b-8899-4230-ae95-40d90e5a36ec
  - PayPal (네트워크 선택 + 단일 Copy): https://mobbin.com/screens/4320e80a-afa6-44dc-a9a6-317ad8a44a24
- 약점: 백업 전에는 이 화면이 아예 안 열린다. "받기"를 눌렀는데 보호막이 나온다(`receive-backup-app.png`). 사용자가 원한 것은 주소다. 이 순서가 활성화를 가장 많이 죽인다(아래 변경 #1).

### 3.5 검토 (`review-app.png`, `review-lookalike-sheet-app.png`)
- 좋은 점: 큰 금액, 전체 주소, 정직한 한 줄("주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요."), 하단 "보내면 취소할 수 없어요".
- 비교: Revolut의 검토는 Amount, Price, Fees, Total을 한 표로 보여 준다. 첫 viewport에서 "얼마 나가는지"가 다 보인다:
  - https://mobbin.com/screens/702ed13f-a0b4-4296-a6f6-55a168e84703
  - https://mobbin.com/screens/fa21c6a4-d921-4590-b0d4-2b6fd2c29e30 (위험 고지 한 줄과 단일 Submit)
- Wise는 "Arrives: Today - in seconds"와 "Total fees"를 같은 화면에 둔다: https://mobbin.com/screens/fb27f401-1fd6-412f-95a9-72d4e2f044c1
- VaultMe 약점: 수수료는 부제목에 "총 0.050042 ETH 차감 예상" 한 줄이 있다. 수수료 행은 스크롤 아래에 있다. 예상 도착 시간이 없다.
- 비슷한 주소 sheet(`review-lookalike-sheet-app.png`)는 이 제품의 최고 장면이다. 전에 보낸 주소와 지금 주소를 나란히 보여 주고, 다른 글자만 빨강으로 표시한다. 경쟁사 Mobbin 화면에서 비슷한 것을 찾지 못했다. 단, 위험 버튼 "확인했어요, 보내기"가 위에, Primary "취소"가 아래에 있다. 오너가 정한 안전한 쪽이 Primary 규칙이다. 맞다. 다만 안전 쪽이 맨 아래에 놓이면 엄지가 먼저 닿는 곳이 위험 쪽이 될 수 있다. 실기기로 확인하라.

### 3.6 결과 (`result-pending-app.png`, `result-confirmed-app.png`)
- 좋은 점: 3단계(보냄, 블록 포함, 확정). Pending에서 "이미 네트워크에 보냈어요. 같은 거래를 다시 보내지 마세요." 이 문구는 Wise보다 낫다.
- 비교: Toss의 성공 화면은 큰 파란 체크, 한 문장, "확인" 하나다. 침착하다. VaultMe 확정 화면은 정보가 많다(주소, 네트워크, 수수료). 신뢰에는 좋다. 하지만 "보냈어요"의 순간 감정이 약하다:
  - https://mobbin.com/screens/5faf70d5-f007-4bfa-86ff-55802a53c121
  - https://mobbin.com/screens/169d9629-ab85-4f21-9d56-5014fcf01527 (진행 중 단계도 한 문장)
  - Revolut 성공 sheet: https://mobbin.com/screens/6d39f68d-af45-4e5b-9494-42931b87778c
- 약점: 확정과 수수료 행 사이에 큰 여백. 숫자 "0.05 ETH"가 크지만 아래 정보 행은 빈 공간에 떠 있다.

### 3.7 내역, 설정, 잠금
- 내역(`activity-app.png`): 깔끔하다. 날짜 그룹, 상태 배지, 실패는 취소선. 둘째 줄 "자산 이름 + 시각". 좋다.
- 설정(`settings-app.png`): iOS 설정처럼 읽힌다. 계정 블록, 그룹 3개. 약점: **"0원 거래 표시"**. "원"은 KRW다. Sepolia 앱에서 이 단어는 "실제 돈이 있다"는 거짓 신호다. 0 ETH 거래(주소 오염 공격용 dust)를 말하려면 "0 값 거래 표시"가 맞다.
- 잠금(`lock-app.png`): 로고, 한 줄, 아래에 Face ID 상태. 간결하다. Coinbase의 설정 화면은 "Require to send crypto" 토글이 있다(PIN/Face ID 범위를 선택). VaultMe는 보낼 때마다 Face ID를 요구한다. 좋은 선택이다: https://mobbin.com/flows/e15cfc1a-6cf3-4686-8b44-20c674aaed11
- Dark(`home-dark-app.png`): 대비와 위계가 유지된다. 파란 Primary와 회색 Secondary가 분명하다.

### 3.8 Home(채워진 상태) 비교 (`home-app.png`)
- 좋은 점: 큰 숫자 1.284732 ETH, Primary는 보내기, 자산 2행, 최근 내역 3행. 한 번에 읽힌다.
- 약점: 자산 행 둘째 줄이 "ETH"와 "USDC"뿐이다. 첫 줄 "Sepolia ETH"와 중복이다. 이 줄에 정보를 넣어라(네트워크 또는 가장 최근 변동).
- 비교: Base(Coinbase)는 Deposit, Trade, Send, Request 4개 버튼으로 Home에서 모든 행동을 연다. VaultMe는 2개다. 범위가 좁아서 맞다: https://mobbin.com/screens/99c53d55-16d0-4a1f-b0a7-35c7c40b1b87
- OKX는 자산 행에 가격과 증감을 보여 준다. VaultMe는 테스트넷이라 가격이 없다. 정직하다: https://mobbin.com/screens/ca029c67-f821-43a0-b80f-d912b2f8bc30

---

## 4. 해자 (competitive-strategy)

- Counter-positioning: Coinbase, Robinhood는 속도를 위해 서명 전 정보를 줄인다. VaultMe는 정보를 늘린다. 큰 회사는 이 길을 가기 어렵다(전환율이 떨어진다). 그래서 이것이 해자다.
- 해자 후보 3개: (1) 비슷한 주소 비교, (2) 이중 송금 차단, (3) 한국어로 읽히는 서명 전 요약.
- 속도로는 못 이긴다. Coinbase는 이메일, 휴대폰, 신원 확인이 필요하다(Mobbin flow에서 확인). 이것은 VaultMe의 기회다: 계정 없이 열쇠를 기기에 둔다. 하지만 이 이점을 첫 화면이 말하지 않는다.
- 위험: "stuck in the middle". 지금은 "테스트넷 지갑"이라 사용자가 갈 이유가 없고, 실서비스 지갑이 되기에는 USDC 송금, QR 스캔, 클라우드 백업이 없다. 오너가 한 줄로 답해야 한다: 이 앱을 누가, 왜 쓰는가?

---

## 5. Top 10 변경 (Foundation 기준으로 순위 매김)

오너 지침: px 단위 세부 사항은 매번 강제하지 않는다. Foundation(위계, accent 규율, 레이아웃 구조, 정보 구조, 타입 시스템, 컴포넌트 논리, 시각 언어 일관성)이 틀렸는지를 본다.
그래서 순위는 "얼마나 Foundation에 가까운가" 순이다. 맨 위가 가장 구조적이다. 픽셀 수준 지적은 부록 A로 내렸다.

표기
- **Figma 먼저**: AGENTS.md 6-7번. 새 기능이면 오너 grilling, Figma frame, 승인, 코드 순서.
- **앱만**: 이미 Figma에 있는 것을 앱에 맞추는 작업.

### 5.1 Foundation 판정 (먼저)

| Foundation 축 | 판정 | 이유 |
|---|---|---|
| Accent 규율 | **맞다** | Blue A는 행동에만 쓴다. 성공 녹색, 경고 황색, 위험 적색과 분리돼 있다. |
| 타입 시스템 | **맞다** | 큰 숫자 + 작은 단위, Pretendard + Plex Mono 주소. 위계가 읽힌다. |
| 시각 언어 일관성 | **맞다** | Borderless, 회색 구획 띠, Solar 아이콘이 화면 전체에서 같다. Dark도 유지된다. |
| 컴포넌트 논리 | **대체로 맞다** | Primary/Secondary 자리 고정(빈 지갑에서 받기가 Primary)은 좋은 규칙이다. 안전한 쪽이 Primary인 규칙도 일관된다. |
| **정보 구조 (IA)** | **틀렸다** | 활성화의 핵심 행동(받기 주소, 첫 입금)이 백업 뒤에 있다. 안전 순서와 가치 순서가 뒤바뀌었다. |
| **레이아웃 구조: 화면의 중심 행동** | **부분 틀림** | 빈 Home에서 가장 중요한 행동(faucet)이 가장 약한 위계(회색 작은 행)다. 검토 화면은 "얼마 나가는가"(수수료, 총액)가 첫 viewport 밖에 있다. 위계가 중요도와 맞지 않는다. |
| **제품 약속(positioning)** | **비어 있다** | 시작 화면이 "이유"를 말하지 않는다. 해자(서명 전 정직한 요약)가 어디서도 이름 붙여 있지 않다. |

한 줄: **시각 Foundation은 건강하다. 구조(IA와 중심 행동의 위계)가 문제다.** 색과 글꼴을 더 만지는 것은 효과가 작다.

### 5.2 Top 10 (구조적인 순서)

| # | 변경 | Foundation 축 | 구분 | Mobbin 근거 |
|---|---|---|---|---|
| 1 | **받기 주소를 백업 앞에 연다.** 받기 화면은 주소와 QR을 바로 보여 주고 상단 Banner로 백업을 권한다. 백업은 첫 입금 도착 후 또는 보내기 전에 강제한다. Sepolia는 가치가 0인데 가치 있는 자산처럼 막고 있다. 오너가 Q14를 "유지"했다. 이 결정을 다시 올리는 이유는 이것이 활성화의 가장 큰 단일 장벽이기 때문이다. | IA | **Figma 먼저 + 오너 grilling** (결정 변경) | https://mobbin.com/screens/4b8bd9cd-6c27-44eb-9fc0-45448075b648 · https://mobbin.com/flows/e15cfc1a-6cf3-4686-8b44-20c674aaed11 |
| 2 | **빈 Home을 "다음 한 걸음" 화면으로 다시 짠다.** 중심 행동 하나(받기 또는 faucet)를 가장 큰 위계에 두고, 진행 3단계(지갑 완료, 백업, 첫 입금)를 보여 준다. 지금은 큰 "0 ETH"와 약한 정보 행이 경쟁한다. 이미 §9.3에 faucet 결정이 있다. 위계만 바꾼다. | 레이아웃 구조 | **Figma 먼저** (새 기능 아님) | https://mobbin.com/flows/9c0de32f-f2a9-44e7-b568-7a1ded6bbb45 · https://mobbin.com/screens/4467a0cf-c122-47f6-8ad2-24532c385176 · https://mobbin.com/screens/62272aa1-883e-4c36-b853-7a0706983d62 |
| 3 | **검토 화면의 구조를 "얼마 나가는가" 중심으로 바꾼다.** 보내는 것, 수수료, 총 차감을 한 묶음으로 첫 viewport에 둔다. 서명 전에 사용자가 가장 알고 싶은 것이다. 예상 도착 시간은 측정값이 있을 때만 추가(새 copy라 grilling). | 레이아웃 구조 / IA | **Figma 먼저** | https://mobbin.com/screens/702ed13f-a0b4-4296-a6f6-55a168e84703 · https://mobbin.com/screens/fb27f401-1fd6-412f-95a9-72d4e2f044c1 |
| 4 | **제품 약속을 시작 화면에 쓴다.** "계정 없이, 이 기기에만 열쇠를 둬요." 한 줄과 precheck의 소요 시간. 해자(서명 전 정직한 요약)를 이름 붙여 신뢰의 이유로 바꾼다. 둘 다 사실만 쓴다. 소요 시간은 측정 후 확정. | 제품 약속 / IA | **Figma 먼저** (copy 추가) | https://mobbin.com/screens/4b8bd9cd-6c27-44eb-9fc0-45448075b648 · https://mobbin.com/flows/5308c64b-afd4-461e-b0a7-0f348b9adde0 |
| 5 | **자산 범위를 맞춘다: USDC 보내기.** 보여 주지만 못 보내는 자산은 "앱이 약속을 어긴다"는 구조적 결함이다. 자산 선택을 금액 화면에 넣는다. 이미 "다음 이슈"로 예약됨. | 컴포넌트 논리 | **Figma 먼저 + 오너 grilling** | https://mobbin.com/screens/99c53d55-16d0-4a1f-b0a7-35c7c40b1b87 |
| 6 | **항상 보이는 상태 칩 규칙을 정한다.** 지금 칩 2개(테스트넷, 테스트 데이터)가 모든 화면 상단에 고정이다. 규칙을 "network 칩 하나는 항상, 나머지는 필요한 화면만"으로 정하면 시각 언어가 조용해진다. | 시각 언어 / 컴포넌트 논리 | **Figma 먼저** (오너 §9.3 결정 변경) | https://mobbin.com/screens/99c53d55-16d0-4a1f-b0a7-35c7c40b1b87 |
| 7 | **첫 입금 도착 순간을 설계한다.** 받기가 열린 동안 입금을 감지하면 상태 전환, 앱 밖이면 push. 재방문 루프의 첫 trigger다. C3 network 작업이 먼저 필요하다. | IA (재방문 루프) | **Figma 먼저 + 오너 grilling** (새 기능) | https://mobbin.com/screens/c0b35d9a-68d9-4d0c-becb-62815fde60ba · https://mobbin.com/screens/5faf70d5-f007-4bfa-86ff-55802a53c121 |
| 8 | **결과 화면의 위계를 정리한다.** 한 번에 하나의 메시지: 먼저 "보냈어요 + 금액", 주소와 수수료는 아래 묶음. Toss/Revolut처럼 감정의 정점을 하나 만든다. | 레이아웃 구조 | **Figma 먼저** | https://mobbin.com/screens/5faf70d5-f007-4bfa-86ff-55802a53c121 · https://mobbin.com/screens/6d39f68d-af45-4e5b-9494-42931b87778c |
| 9 | **기록을 위한 질문: 이 앱의 사용자는 누구인가.** 활성화 지표(24시간 안 첫 입금)를 정의하려면 최종 사용자가 정해져야 한다. UI 변경이 아니다. | 제품 약속 | grilling만 (UI 없음) | 해당 없음 |
| 10 | **QR 스캔(보내기 쪽).** 받기 QR은 있는데 스캔이 없으면 대면 송금 흐름이 한쪽 방향이다. 이미 "다음 이슈"로 예약됨. | 컴포넌트 논리 | **Figma 먼저 + 오너 grilling** | https://mobbin.com/screens/f59bdad5-e979-49fa-9222-a94c161a4144 |

### 부록 A. 작은 결함 (Foundation 아님, 짧게)

Foundation 문제가 아니다. 다음 번 손볼 때 같이 고치면 된다.
- "0원 거래 표시": "원"은 KRW다. "0 값 거래 표시"로. (`ko.ts`와 Figma copy 한 줄.) 신뢰 문구라서 가장 먼저 고칠 가치는 있다.
- 복구 구문 예시가 "abandon" x 11, 주소가 0x1234 반복이다. 스토어 스크린샷이나 데모에는 현실적인 값을 쓴다. 테스트 vector는 유지. (stack-line.dev의 `[object Object]`와 같은 교훈.)
- 빈 Home에서 중앙 정렬 빈 상태와 좌측 정렬이 섞인다. (변경 #2를 하면 같이 사라진다.)
- Home 자산 행 둘째 줄이 "ETH"/"USDC"뿐이라 첫 줄과 중복이다.
- 위험 sheet에서 위험 버튼이 위, 안전 Primary가 아래다. 실기기에서 엄지가 어디에 먼저 닿는지 확인.

### 지금 건드리지 말 것
- 비슷한 주소 비교 sheet, 이중 송금 차단, 3단계 진행, "형식만 확인했어요" 문구, 주소 4글자 묶음 + 앞뒤 굵게, 한 accent.
- 이 목록이 해자다. 위 변경 중 어느 것도 이것을 약하게 만들면 안 된다.

---

## 6. 오너에게 던질 질문 (grilling 후보)

1. Q14를 다시 연다: 받기 전 백업을 testnet에서도 강제할 이유가 있는가? (변경 #1)
2. 이 앱을 누가, 왜 쓰는가? 지금 사용자는 owner와 designer/engineer뿐이다(PRODUCT.md). 최종 사용자는 미정이다. 활성화 지표는 이 답 없이 정의할 수 없다.
3. 상단 칩 2개 중 하나를 없애도 되는가? (변경 #6)
4. 예상 도착 시간을 보여 줄 수 있는 측정 데이터가 있는가? 없으면 넣지 않는다.

---

## 7. 한계 (확인하지 못한 것)

- 직접 앱을 실행하지 않았다. 캡처 이미지만 봤다. 모션, haptics, 키보드 동작은 평가하지 못했다.
- 경쟁사 앱을 직접 걷지 않았다. Mobbin 화면은 정적 캡처다. Robinhood, Revolut 암호화폐 보내기, Toss 송금 검토 화면은 정확히 맞는 결과를 찾지 못했다. 가장 가까운 화면(Base, Revolut 환전, Toss 채우기)으로 대체했다. 다른 앱 화면은 Coinbase 소유 Base, PayPal, World App으로 보강했다.
- `home-firstlaunch-sheet-app.png`이 아직 폴더에 있다. 코드에서 실제로 제거됐는지는 확인하지 못했다.
- faucet 현재 조건(QuickNode)은 공식 페이지에서 확인하지 못했다.
- 소요 시간 "약 3분"은 제안일 뿐이다. 측정하지 않았다.

---

## 8. Mobbin 링크 모음

Flow
- Coinbase 온보딩: https://mobbin.com/flows/9c0de32f-f2a9-44e7-b568-7a1ded6bbb45
- Coinbase 계정 설정: https://mobbin.com/flows/5308c64b-afd4-461e-b0a7-0f348b9adde0
- Coinbase PIN 설정: https://mobbin.com/flows/e15cfc1a-6cf3-4686-8b44-20c674aaed11

Screen
- Phantom 지갑 만들기: https://mobbin.com/screens/4b8bd9cd-6c27-44eb-9fc0-45448075b648
- Phantom 복구 구문: https://mobbin.com/screens/59600d67-4352-48a0-ae8d-9d0ff72ca1c4
- Phantom 계정 편집(복구 구문 보기): https://mobbin.com/screens/c9635d50-3af6-4d79-881e-e57936f8775d
- Phantom 구문 가져오기: https://mobbin.com/screens/a34d36fd-dd3d-499d-815c-068c26682eda
- Phantom 받기: https://mobbin.com/screens/c0b35d9a-68d9-4d0c-becb-62815fde60ba
- World App 받기: https://mobbin.com/screens/f149fd5b-8899-4230-ae95-40d90e5a36ec
- PayPal 받기: https://mobbin.com/screens/4320e80a-afa6-44dc-a9a6-317ad8a44a24
- Base 받기(QR + Copy/Share): https://mobbin.com/screens/f59bdad5-e979-49fa-9222-a94c161a4144
- Base Home: https://mobbin.com/screens/99c53d55-16d0-4a1f-b0a7-35c7c40b1b87
- OKX Home: https://mobbin.com/screens/ca029c67-f821-43a0-b80f-d912b2f8bc30
- Wise 금액 + 도착 + 수수료: https://mobbin.com/screens/fb27f401-1fd6-412f-95a9-72d4e2f044c1 · https://mobbin.com/screens/370316cc-c8c1-4555-9d6f-22be23213dae
- Wise 잔액 부족 오류(비활성 Continue): https://mobbin.com/screens/76159abd-f17c-47b8-b93e-f7c6375aa9cc
- Revolut 검토: https://mobbin.com/screens/702ed13f-a0b4-4296-a6f6-55a168e84703 · https://mobbin.com/screens/fa21c6a4-d921-4590-b0d4-2b6fd2c29e30
- Revolut 성공 sheet: https://mobbin.com/screens/6d39f68d-af45-4e5b-9494-42931b87778c
- Revolut 빈 Home: https://mobbin.com/screens/4467a0cf-c122-47f6-8ad2-24532c385176 · https://mobbin.com/screens/e93d0c63-dfcf-4eb2-bd22-0be63f571215 · https://mobbin.com/screens/62272aa1-883e-4c36-b853-7a0706983d62
- Toss 성공: https://mobbin.com/screens/5faf70d5-f007-4bfa-86ff-55802a53c121 · https://mobbin.com/screens/169d9629-ab85-4f21-9d56-5014fcf01527
- Toss 채우기 확인: https://mobbin.com/screens/0e4591f1-0fe0-44d3-ae46-46aae3b3e1a3

Mobbin 안내(원문 그대로)
---

**Your Mobbin AI usage is high this month**

Usage is unlimited during beta. If your usage stays at this level, you may need to purchase more credits once limits take effect. [View usage and plan options](https://mobbin.com/settings/billing-and-usage)
