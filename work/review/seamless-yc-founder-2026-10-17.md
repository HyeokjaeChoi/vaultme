# VaultMe seamless 리뷰 — YC founder 관점

작성일: 2026-10-17 · 리뷰어: YC founder 역할(consumer fintech) · 범위: 읽기 전용. 앱 코드, Figma, simulator는 바꾸지 않았다.

근거: `PRODUCT.md`, `outputs/design/redesign-b.md` §9, `outputs/design/ux-flow.md`, `outputs/design/ux-copy.md`, `work/v9/screens/*.png`(Light 위주), `apps/mobile/src/pages/send/*`(동작 확인용으로 읽기만 함). 경쟁사는 공개 자료만 사용했다. Mobbin은 로그인하지 않았다.

---

## 1. 결론

**Seamless: 부분적(Partly).**

- **보내기는 좋다.** 탭 6번 정도에 끝난다. 안전 장치는 강하지만, 필요한 순간에만 나온다. Coinbase급이다.
- **받기(첫 가치)는 나쁘다.** 새 사용자는 잔액 0에서 시작한다. 받기 주소를 보려면 먼저 백업 전체(인증 → 12단어 → 단어 3개 입력)를 해야 한다. 그다음에는 앱 밖 faucet으로 가야 한다. 앱은 그 길을 알려 주지 않는다. 여기서 대부분 이탈한다.
- **다시 올 이유가 약하다.** 받은 돈이 도착하는 순간(magic moment)이 설계되어 있지 않다. Push는 있지만 첫 도착 경험이 없다.
- **신뢰 순간은 강하다.** 비슷한 주소 비교 sheet, 진행 중 거래 차단, 3단계 진행 표시, "형식만 확인했어요" 같은 정직한 문구는 경쟁사보다 낫다.

한 줄: **"안전하게 보내는 앱"은 만들었다. "처음 1분 안에 돈이 들어오는 앱"은 아직 아니다.**

### 점수 (/10)

| 항목 | VaultMe | Coinbase (Base app / Smart Wallet) | Robinhood Wallet | Wise |
|---|---|---|---|---|
| 설치 → 지갑 생성 | 7 | 9 (passkey, seed 없음) | 8 | 5 (KYC) |
| 첫 받기(첫 가치까지 시간) | **3** | 9 | 7 | 8 |
| 첫 보내기 | 8 | 9 | 8 | 9 |
| 신뢰 순간 | **9** | 7 | 7 | 9 |
| 재방문 루프 | 4 | 8 | 7 | 8 |
| **종합 seamless** | **6** | **9** | **7.5** | **8.5** |

- 기준: VaultMe는 testnet portfolio 제품이다. 그 목표로 보면 6/10. 실제 출시 기준으로 보면 5/10이다(USDC 보내기 없음, QR 스캔 없음, 첫 자산 확보 경로 없음).
- Wise 점수는 KYC 마찰을 포함한다. 송금 추적 경험만 보면 10이다.

---

## 2. 퍼널 / 여정 표

새 지갑 기준. "정당"은 안전을 위한 마찰이다. "낭비"는 줄이거나 미뤄도 안전이 떨어지지 않는 마찰이다.

| # | 단계 (화면) | 사용자 행동 | 이탈 위험 | 판정 | 이유 |
|---|---|---|---|---|---|
| 1 | S01 시작 | "새 지갑 만들기" 1탭 | 낮음 | OK | 선택지 2개. 명확하다. |
| 2 | S02 확인 3개 | 체크 3번 + 버튼 | 중간 | **정당(일부 과함)** | 자가수탁 책임 고지는 필요하다. 3번째 "테스트넷 전용"은 #3, #10에서 다시 나온다. |
| 3 | Home 첫 실행 sheet | "확인했어요" 1탭 | 낮음 | **낭비** | S02 3번째 항목, 상단 칩과 같은 말이다. 같은 고지가 3번 나온다. |
| 4 | Home(0 ETH) | "받기" 탭 | 낮음 | OK | 빈 지갑에서 받기가 Primary다. 좋은 결정이다. |
| 5 | S31 백업 요구 | "백업 시작" 또는 "나중에" | **높음** | **testnet에서는 낭비, 실제 출시에서는 시점이 틀림** | 가치가 0인데 백업을 먼저 시킨다. "나중에"는 받기를 포기시킨다(막다른 길). |
| 6 | OS 인증 | Face ID | 낮음 | 정당 | 복구 구문 보호. |
| 7 | S03 복구 구문 | 탭해서 보기, 12단어 종이에 쓰기, 체크, 버튼 | **매우 높음** | 정당(내용), 시점은 문제 | 종이와 펜이 필요하다. 지하철에서 연 사용자는 여기서 떠난다. |
| 8 | S04 단어 확인 | 단어 3개 입력 | 높음 | 정당 | 백업 검증은 실제 돈에서 필수다. |
| 9 | S30 받기 (+S50 알림 sheet) | 주소 복사/공유 | 낮음 | OK | 실제 QR, 4글자 묶음 주소, 네트워크 경고. 좋다. |
| 10 | **앱 밖 faucet** | 브라우저, faucet 검색, 로그인/조건 통과, 대기 | **치명적** | **낭비(앱이 길을 안 줌)** | 일부 Sepolia faucet은 mainnet 0.001 ETH 보유를 요구한다는 보고가 있다. 앱 안에는 안내가 0이다. |
| 11 | 돌아와서 잔액 확인 | 앱 다시 열기, 잠금 해제 | 높음 | 낭비 | 도착 순간을 알려 주지 않는다. 사용자가 직접 확인해야 한다. |
| 12 | 첫 보내기: Home → S20a | 붙여넣기 또는 최근 주소 탭 | 낮음 | OK | 최근 보낸 주소 3개는 좋다. QR 스캔은 없다. |
| 13 | S20b 금액 | 키패드, 25/50/전액 | 낮음 | OK, 단 **USDC 불가** | 보내기 흐름은 ETH만 보낸다(`pages/send/amount.tsx` 주석과 코드). USDC 자산 상세의 "보내기"도 ETH 흐름으로 간다. |
| 14 | S22 검토 | 읽기, "확인하고 보내기" | 낮음 | **정당** | 전체 주소, 수수료 상한, 총 차감액. 접기 가능한 비용 영역. |
| 15 | S22 위험 sheet (조건부) | 비교 후 확인 | 낮음 | **정당 + 강점** | 비슷한 주소를 나란히 비교한다. 위험할 때만 나온다. |
| 16 | Face ID | 인증 | 낮음 | 정당 | |
| 17 | S23 결과 | 진행 표시 확인 | 낮음 | OK | 보냄 → 블록 포함 → 확정. Wise 추적기와 같은 원리다. 예상 시간 표시는 없다. |
| 18 | 진행 중에 다시 보내기 | S24 차단 sheet | 낮음 | **정당** | 이중 송금을 막는다. |

### 첫 가치까지 시간 (추정)

| 제품 | 설치 → 첫 받기 가능 | 막는 것 |
|---|---|---|
| VaultMe | 탭 약 15번 + 12단어 필기 + 단어 3개 입력 + 앱 밖 faucet. 5–15분, faucet 조건에 따라 실패 | 백업 게이트, faucet 부재 |
| Coinbase Smart Wallet | passkey 생성 후 바로 주소. 수십 초 | 거의 없음 |
| Robinhood Wallet | 생성 후 백업을 "나중에 알림"으로 미룰 수 있다. 1–2분 | 백업 선택(iCloud/Drive/수동) |
| Wise | KYC 후. 수 시간–수일 | 신원 확인 |

---

## 3. Top 10 변경 (영향/노력 순)

표기: **Figma 먼저** = AGENTS rule 6–7. 새 기능이면 오너 grilling → Figma frame → 승인 → 코드. **앱만** = 이미 Figma에 있는 것을 맞추는 작업.

| 순위 | 변경 | 영향 | 노력 | 시점 | 구분 |
|---|---|---|---|---|---|
| 1 | **"테스트 자산 받기" 경로.** 빈 Home(S10 empty)과 S30에 한 줄 + 버튼. 주소를 복사하고 Circle USDC faucet / Sepolia ETH faucet 공식 페이지를 연다. faucet 조건(로그인, mainnet 잔액)은 확인된 것만 쓴다. | 매우 큼 | 작음 | 다음 주 | Figma 먼저 + grilling (새 기능, 외부 링크) |
| 2 | **백업 시점 이동.** testnet에서는 받기 주소를 백업 전에 보여 준다. 백업은 "첫 입금 도착 후" 또는 "첫 보내기 전"에 요구한다. S31 "나중에"는 막다른 길 대신 Home + 백업 Banner로 간다. ux-flow Q14 결정을 다시 연다. | 매우 큼 | 중간 | 다음 주 grilling, 다음 달 구현 | Figma 먼저 + grilling (오너 결정 변경) |
| 3 | **USDC 보내기.** S20b에 자산 선택(ETH/USDC)을 넣는다. 자산 상세에서 들어오면 그 자산으로 시작한다. 지금은 USDC를 보여 주고 보낼 수 없다. 신뢰를 깎는다. | 큼 | 중간 | 다음 주 Figma, 다음 달 앱 | Figma 먼저 (S20b 상태 없음) |
| 4 | **첫 입금 도착 순간.** S30이 열려 있을 때 입금을 감지하면 "받았어요 +20 USDC" 상태로 바꾼다. 앱 밖이면 push. 차분한 확인 + success haptic. confetti는 쓰지 않는다. | 큼 | 중간(C3 network 필요) | 다음 달 | Figma 먼저 + grilling |
| 5 | **중복 testnet 고지 제거.** Home 첫 실행 sheet를 없앤다. S02 3번째 항목과 상단 칩으로 충분하다. | 중간 | 작음 | 다음 주 | Figma 먼저 (오너 §9.3 결정 변경) |
| 6 | **QR 스캔 복구.** ux-copy에 S21 문구가 있다. v9 Figma와 앱에는 없다(앱 주석: "camera wiring 없음"). 실제 출시에서 대면 송금의 기본이다. | 중간 | 중간 | 다음 달 | Figma 먼저 (v9에 frame 없음) |
| 7 | **S23 예상 시간.** Pending 아래 "보통 ~초 안에 블록에 포함돼요". Sepolia에서 측정한 값만 쓴다. 추측 금지. Wise의 핵심 기법이다. | 중간 | 작음 | 다음 달(측정 후) | Figma 먼저 (copy 추가) |
| 8 | **활성화 지표 정의.** Activation = 생성 후 24시간 안에 첫 입금 도착. 다음 = 7일 안에 첫 보내기, D7/D30 재방문. 자가수탁이므로 기기 밖 전송 여부부터 정한다. | 중간 | 작음 | 다음 주(결정만) | grilling (UI 없음, privacy 결정) |
| 9 | **S02 체크 3개 → 2개.** "테스트넷 전용"은 S01 부제와 칩이 이미 말한다. 책임 고지 2개는 유지한다. | 작음–중간 | 작음 | 다음 주 | Figma 먼저 (오너 결정 변경) |
| 10 | **백업 선택지(실제 출시용).** Robinhood처럼 암호화 cloud 백업(iCloud/Drive)을 수동 백업 옆에 둔다. 또는 Coinbase처럼 passkey 계정. testnet 범위 밖이다. 출시 전 로드맵에 올린다. | 큼(출시 시) | 큼 | 출시 전 | Figma 먼저 + grilling (범위 변경) |

### 지금 자를 것 / 지키지 말 것

- **자른다:** Home 첫 실행 sheet. 받기 앞의 백업 강제(testnet 한정).
- **절대 자르지 않는다:** S22 검토, 비슷한 주소/소각 주소/토큰 컨트랙트 sheet, S24 이중 송금 차단, Face ID, S04 단어 확인(시점만 옮긴다), "형식만 확인" 문구. 이것이 이 제품의 해자다.

---

## 4. Magic moment

### 경쟁사의 magic moment

| 제품 | 순간 | VaultMe에 있나 |
|---|---|---|
| Coinbase Smart Wallet | seed 없이 passkey로 몇 초 만에 지갑. gas 대납 가능 | 없음 (범위상 seed 기반) |
| Base app | 채팅에서 USDC 보내기, "문자처럼 쉬운 송금" 마케팅 | 없음 |
| Robinhood | 첫 거래 축하. 단, confetti는 2021년 gamification 비판 뒤 삭제했다 → 축하는 차분해야 한다 | 없음 (그리고 confetti는 하지 말 것) |
| Robinhood Wallet | 백업 "나중에 알림" + iCloud/Drive 선택 | 없음 (백업 강제, 수동만) |
| Wise | 보내기 전 수수료·도착 시간 명시, 단계별 추적기, "20초 안에 도착" 같은 속도 약속 | **절반** (3단계 추적기는 있다. 예상 시간은 없다) |

### VaultMe가 이미 가진 magic moment

1. **비슷한 주소 비교 sheet.** 전에 보낸 주소와 지금 주소를 나란히 놓고 다른 4글자를 빨간 밑줄로 보여 준다. 경쟁사에서 이 수준을 공개 자료로 확인하지 못했다. 마케팅의 중심에 둘 만하다.
2. **이중 송금 차단(S24).** "지금 보내면 같은 금액이 두 번 나갈 수 있어요." 사고를 미리 막는다.
3. **3단계 결과 추적.** 보냄 → 블록 포함 → 확정. Wise의 추적기와 같은 신뢰 효과.
4. **수수료를 뺀 "보낼 수 있는 금액"과 25/50/전액 칩.** 잔액 부족 실패를 줄인다.
5. **최근 보낸 주소 3개.** 반복 송금을 1탭으로 만든다. 습관 루프의 씨앗이다.
6. **정직한 문구.** "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요." 신뢰를 과장하지 않는다.

### VaultMe에 없는 magic moment (우선순위)

1. 첫 자산이 들어오는 순간(변경 #1, #4).
2. 보내기 전 예상 도착 시간(변경 #7).
3. 받는 사람을 이름으로 찾기(ENS/연락처). 범위 밖. 기록만 한다.

---

## 5. 재방문 루프 진단

- **Trigger:** Push opt-in은 첫 받기 진입과 첫 보내기 뒤에 나온다. 타이밍은 좋다. 그러나 "받았어요" push를 보낼 첫 입금이 없다(faucet 경로 없음). 루프가 시작되지 않는다.
- **Action:** 최근 주소, 25/50/전액 칩으로 반복 행동은 쉽다.
- **Reward:** 확정 결과 화면은 있다. 첫 입금 보상은 없다.
- **Investment:** 백업 완료, 최근 주소 기록이 쌓인다. 좋다.
- 결론: 루프의 뒤쪽 3단계는 준비됐다. 첫 trigger가 없어서 돌지 않는다. 변경 #1과 #4가 루프를 연다.

---

## 6. 사용한 skill / 설치한 skill

| Skill | 출처 | 상태 | 용도 |
|---|---|---|---|
| `find-skills` | `~/.claude/skills/find-skills` (기존) | 로드 | founder/activation skill 검색 (`npx skills find`: "yc startup", "product strategy", "activation onboarding growth", "founder", "onboarding cro") |
| `onboarding` (Onboarding CRO, v2.0.2) | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) · [skills.sh](https://skills.sh/coreyhaines31/marketingskills/onboarding) · 약 69K installs | **새로 설치(global, `~/.claude/skills/onboarding`)** 후 로드 | MPTV, aha moment, 퍼널 이탈, Fogg 모델로 첫 가치 분석 |
| `churn-prevention` | 같은 저장소 | **새로 설치(global)**, 로드 안 함 | SaaS 결제 이탈 중심이라 이번 질문에 맞지 않았다 |
| `product-management:competitive-brief` | 설치된 product-management plugin | 로드 | 경쟁사 비교 틀, 강점/약점, 전략 함의 |

검증: 설치 전에 저장소를 clone해서 `SKILL.md`와 references를 읽었다. 두 skill 모두 markdown만 있다. 실행 script, secret 요구, 외부 전송이 없다. YC 전용 skill(`guia-matthieu/clawfu-skills@yc-pitch-deck` 등)은 설치 수가 적고(1K 미만) pitch deck 용도라 설치하지 않았다.

---

## 7. 출처

- Coinbase Smart Wallet (passkey, seed 없음, paymaster): https://cointelegraph.com/news/coinbase-smart-wallet-no-gas-fees · https://unchainedcrypto.com/coinbase-launches-its-smart-wallets-dubbing-it-cryptos-iphone-moment/ (2차 자료. 공식 문서로 재확인 필요)
- Base app App Store 설명 (채팅 USDC 송금): https://apps.apple.com/app/id1278383455
- Robinhood Wallet 백업 선택지(iCloud/Drive/수동/나중에): https://robinhood.com/us/en/support/articles/robinhood-wallet-faqs/ · https://robinhood.com/us/en/learn/articles/protecting-your-self-custody-wallet-secret-recovery-phrase/
- Robinhood confetti 삭제(2021): https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html
- Wise 추적기와 상태: https://wise.com/help/articles/2452305/how-do-i-check-my-transfers-status · https://docs.wise.com/guides/product/send-money/tracking/transfer-statuses
- Wise 속도 약속(20초 기준): https://wise.com/send-money/instant-money-transfer
- Sepolia faucet 조건(mainnet 잔액 요구 보고, 자료끼리 충돌): https://zenn.dev/mkurita/articles/a0a05a1f5ef184 · https://metana.io/blog/alternatives-to-goolgle-ethereum-sepolia-faucet/
- Circle USDC faucet 한도: `outputs/design/hld.md` 351행 (20 USDC / 2시간)

### 확인하지 못한 것

- 경쟁사 앱을 직접 설치해서 걷지 않았다. 단계 수는 공개 자료 기준 추정이다.
- Mobbin 화면은 로그인이 필요해서 보지 않았다.
- `work/compare/*-app.png`는 Figma와 같다는 기존 검수를 믿고 깊게 비교하지 않았다. USDC/QR 부재는 앱 코드로 확인했다.
- faucet의 현재 조건은 공식 페이지에서 직접 확인하지 못했다. 변경 #1 구현 전에 확인해야 한다.
