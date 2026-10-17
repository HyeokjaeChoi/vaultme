# VaultMe UX diligence: Coinbase, Robinhood, Wise와 비교한 seamless 평가

날짜: 2026-10-17. 작성: YC investment analyst 관점(consumer fintech, crypto).
범위: 읽기만 했다. 앱 코드, Figma, simulator는 바꾸지 않았다. 다른 reviewer의 `seamless-*` 보고서는 읽지 않았다.
근거: `PRODUCT.md`, `outputs/design/redesign-b.md` §9, `outputs/design/ux-flow.md`, `outputs/design/ux-copy.md`, `work/v9/screens/*.png`, `work/compare/*-app.png`, `apps/mobile/app/` 파일 목록. 외부 숫자는 모두 아래 Benchmarks 표에 URL과 날짜를 적었다.
표기: **[측정]** = 공개 자료의 숫자. **[추정]** = 이 분석가의 추정. **[관찰]** = 이 저장소 화면에서 직접 본 것.

---

## 1. 판정

**Partly seamless (부분적으로 그렇다).**

1. 보내기 검토와 위험 확인 흐름은 경쟁사와 같거나 더 좋다. 특히 address poisoning 경고는 업계 평균보다 앞선다. 53개 Ethereum wallet 중 3개만 명시 경고를 한다 [측정].
2. 그러나 "seamless"를 증명할 데이터가 없다. 앱은 fake chain이다. 네트워크를 호출하지 않는다. 사용자, funnel, 리뷰, 지원 기록이 0이다 [관찰, `PRODUCT.md`].
3. 첫 거래까지 경로에 빈 곳이 있다. QR 스캔 구현 없음, 보내기 자산 선택 화면 없음, testnet 자금(faucet) 안내 없음. v9 화면 세트에 S04(단어 확인)·S05(복구 입력)·S21(QR)이 없다 [관찰].
4. UX는 **moat가 아니다**. 경고 패턴은 MetaMask도 이미 한다. 큰 회사가 몇 주 안에 따라 할 수 있다(Roger Martin "can't vs won't": 할 수 있고, 할 이유도 있다).
5. 투자 관점 결론: UX는 **투자를 막는 gap이 아니다**. 그러나 **차별점으로 인정할 근거도 아직 없다**. 지금 막는 것은 UX가 아니다. 시장, 사용자, 수익 모델, mainnet 계획이 없다는 점이다.

한 줄: "디자인 품질은 seed 단계 기준 상위권이다. 제품 증거는 pre-product 수준이다."

---

## 2. Benchmark scorecard

척도: 1 = 약함, 3 = 시장 평균, 5 = 최고 수준. 경쟁사 점수는 공개 리뷰와 공개 자료를 바탕으로 한 **[추정]**이다. VaultMe 점수는 Figma v9와 app capture 기준이다. 실제 사용 데이터가 없으므로 VaultMe 점수는 모두 "설계 점수"다.

비교 범위 주의: Coinbase, Robinhood, Wise는 custodial 서비스다. KYC, 은행 연결, 고객 지원이 있다. VaultMe는 self-custody testnet wallet이다. 같은 "보내기"라도 위험 구조가 다르다. 그래서 Coinbase Wallet(self-custody)을 참고 열로 넣었다.

| 차원 | VaultMe | Coinbase | Robinhood | Wise | 참고: Coinbase Wallet | 근거 |
|---|---|---|---|---|---|---|
| Onboarding | 3 | 3 | 4 | 3 | 3 | VaultMe: S01 → S02 체크 3개 → Home. 백업은 받기 직전으로 미룬다(progressive, 좋다) [관찰]. 그러나 Coinbase Smart Wallet은 passkey로 seed 없이 약 15초 생성이라고 보도된다 [측정, 2차 출처]. Coinbase·Wise는 KYC 때문에 느리고 리뷰에 계정 잠금·검증 불만이 많다 [측정] |
| Send flow | 4 | 4 | 4 | 5 | 3 | VaultMe: "누구에게" → "얼마" → 검토 → Face ID. 최근 주소 3개, 25/50/전액 칩, 자판 [관찰]. 빠짐: QR 스캔, 자산 선택 [관찰]. Wise: Q4 FY26 결제의 75%가 20초 안에 도착 [측정] |
| Error recovery | 4 | 2 | 3 | 3 | 2 | VaultMe: S22 authError/chainError/prepareError/needsReview, S23 Unknown/Replaced/Failed+이유, S24 중복 전송 차단, "다시 보내기"는 검토부터 다시 [관찰]. Coinbase·Robinhood 리뷰는 입금 취소·계정 제한을 사후에 알게 된다고 한다 [측정] |
| Feedback / perceived speed | 3 | 4 | 4 | 4 | 3 | VaultMe: 보냄 → 블록 포함 → 확정 3단계 진행 표시, "09:41에 확인했어요" + 다시 확인 [관찰]. 그러나 실제 latency 측정이 없다. Wise는 "몇 초" 표시와 실제 며칠 지연의 차이가 리뷰 불만 1순위다 [측정]. VaultMe도 실제 Sepolia에서 같은 위험이 있다 |
| Trust & safety UX | 5 | 3 | 3 | 4 | 3 | VaultMe: 전체 주소 4글자 묶음, 비슷한 주소 sheet에서 다른 묶음을 빨간 밑줄, 소각·컨트랙트 주소 경고, 안전한 "취소"가 Primary, 목록에 짧은 주소 금지 [관찰]. 업계: 53개 중 3개만 경고 [측정]. MetaMask는 비슷한 주소 blocking 경고가 있다 [측정] |
| Navigation consistency | 4 | 3 | 4 | 4 | 3 | VaultMe: 탭 3개, 모든 화면에 "Sepolia 테스트넷" 칩, sheet 규칙 공통 [관찰]. 감점: app review 화면에 "Sepolia 테스트넷" + "테스트 데이터" 칩 2개가 함께 있다(`work/compare/review-app.png`) [관찰]. Figma와 app 화면 세트가 다르다(app에 `restore`, `backup/check`가 있으나 v9 PNG에는 없다) [관찰] |
| **합계 /30** | **23** | 19 | 22 | 23 | 17 | VaultMe 23은 설계 점수다. 실제 사용 데이터로 검증되지 않았다 |

해석:
- VaultMe의 강점은 "검토와 위험 확인" 한 구역에 몰려 있다.
- 약점은 "첫 가치까지 가는 길"이다. 자금이 없는 testnet wallet은 첫 거래를 할 수 없다.

---

## 3. Benchmarks (공개 숫자)

| 항목 | 숫자 | 출처 | 확인 날짜 | 비고 |
|---|---|---|---|---|
| Coinbase iOS 평점 | 4.7, 1.8M ratings, Finance #52 | [App Store](https://apps.apple.com/us/app/coinbase-buy-bitcoin-ether/id886427730) | 2026-10-17 | 리뷰 주제: 지원 지연, 상담원마다 다른 답, 출금 제한 |
| Robinhood iOS 평점 | 4.3, 4.9M ratings, Finance #31 | [App Store](https://apps.apple.com/us/app/robinhood-trading-investing/id938003185) | 2026-10-17 | 리뷰 주제: 즉시 입금 후 계정 제한, 지원 불만. 쉬움은 칭찬 |
| Wise iOS 평점 | 4.6, 112K ratings, Finance #58 | [App Store](https://apps.apple.com/us/app/wise-international-transfers/id612261027) | 2026-10-17 | 리뷰 주제: 표시된 도착 시간과 실제 시간 차이 |
| Coinbase Wallet iOS 평점 | 4.5, 161K ratings | [App Store](https://apps.apple.com/us/app/coinbase-wallet-nfts-crypto/id1278383455) | 2026-10-17 | 리뷰 주제: 복구 구문 백업 실패, 업데이트 뒤 로그아웃, 사기 네트워크 |
| Coinbase Trustpilot | 약 21,977 reviews | [Trustpilot](https://ie.trustpilot.com/review/coinbase.com?page=5) | 2026-10-17 | 평균 점수는 확인 못 함. 계정 동결 불만 반복 |
| Wise 즉시 결제 비율 | Q4 FY26 결제의 75%가 20초 미만 (Q4 FY24 62%) | [Wise FY26 results](https://www.investegate.co.uk/announcement/rns/wise-class-a--wise/wise-fy26-results/9637901) | 2026-06-25 발표 | 공개된 "perceived speed" 지표의 기준점 |
| Robinhood Funded Customers | 28.4M (Q2 2026, +7% YoY) | [Robinhood IR](https://investors.robinhood.com/news-releases/news-release-details/robinhood-reports-second-quarter-2026-results) | 2026-07-29 발표 | 규모 비교용 |
| Coinbase Smart Wallet 생성 시간 | 약 15초, biometric 1회, seed 없음 | [Coincub guide](https://coincub.com/wallets/guides/smart-wallets/) | 2026-10-17 확인 | 2차 출처. Coinbase 공식 숫자는 못 찾음 |
| Address poisoning 규모 | 약 270M 시도, 17M 피해자, 최소 $83.8M 손실 (2022-07 ~ 2024-06) | [CMU CyLab](https://cylab.cmu.edu/news/2026/01/07-blockchain-address-poisoning.html), [arXiv 2501.16681](https://arxiv.org/html/2501.16681v1) | 2026-01-07 | USENIX Security 2025. 원인을 앞뒤 몇 글자만 보이는 wallet UI로 본다 |
| Address poisoning 단일 사고 | 약 $50M USDT, test 전송 뒤 내역에서 주소 복사 | [The Block](https://www.theblock.co/post/383423/crypto-trader-loses-50-million-in-address-poisoning-attack-offers-1-million-bounty-for-return) | 2025-12 | "최근 보낸 주소" UI의 위험을 보여준다 |
| Wallet 경고 보급률 | 53개 Ethereum wallet 중 3개만 명시 경고, 16개는 가짜 토큰 전송을 표시 | [arXiv 2508.12107](https://arxiv.org/abs/2508.12107v1) | 2025-08-16 | preprint. peer review 전 |
| Crypto 사기 규모 | 2025년 scam 수익 약 $14B–$17B, impersonation 약 +1,400% YoY | [Cointelegraph](https://cointelegraph.com/news/crypto-scams-2025-ai-impersonation-fraud-chainalysis), [Forklog](https://forklog.com/en/crypto-scammers-stole-a-record-14bn-in-2025/) | 2026-01 | Chainalysis 원문은 직접 확인 못 함 |
| MetaMask 비슷한 주소 경고 | 앞뒤 4글자 일치·가운데 다름 → 제출 전 blocking 경고, 새 주소 안내 | [MetaMask Support](https://support.metamask.io/stay-safe/protect-yourself/wallet-and-hardware/address-poisoning-scams) | 2026-10-17 | 출시 날짜 확인 못 함. VaultMe 경고는 이미 업계 primitive다 |
| Checkout 이탈 | 평균 70.22%, 약 1/5이 "너무 길고 복잡함" 때문 | [Baymard](https://baymard.com/lists/cart-abandonment-rate) | 2025-09-22 갱신 | 단계 추가 비용의 일반 기준 |
| Finance 앱 retention | D1 약 20–30%, D30 약 4–12% (출처마다 다름) | [Plotline](https://www.plotline.so/blog/retention-rates-mobile-apps-by-industry), [Panto](https://www.getpanto.ai/blog/mobile-app-retention-statistics) | 2025-11 | 2차 출처. 원 보고서(Adjust, AppsFlyer) 직접 확인 못 함 |
| Wallet 생성 단계 이탈 | 20–90% (출처마다 다름) | [Formo](https://formo.so/blog/how-to-optimize-web3-onboarding-funnels), [The Block (sponsored)](https://www.theblock.co/post/386514/user-experience-in-crypto-wallets-how-to-increase-adoption-and-engagement) | 2026-10-17 확인 | vendor·sponsored 자료. **신뢰 낮음**. 자체 funnel 계측이 필요하다는 증거로만 쓴다 |

공개되지 않은 것 (찾지 못함): Coinbase·Robinhood·Wise의 onboarding 완료율, time-to-first-transaction. 이 세 회사는 이 숫자를 공개하지 않는다. 비교는 리뷰 주제와 공개 운영 지표로만 했다.

### VaultMe 자체 추정 [추정, 화면 기준]

| 지표 | 값 | 계산 |
|---|---|---|
| 새 지갑 → Home | 탭 약 5회 | S01 1 + S02 체크 3 + 버튼 1 |
| Home → 받기 주소 (새 지갑) | 탭 약 6–8회 + Face ID + 단어 확인 | 받기 → S31 → 인증 → S03 보기·체크·다음 → S04 → S30 |
| 받기 → 첫 자금 | **앱 밖. 측정 불가** | Sepolia faucet이 필요하다. 앱에 faucet 안내가 없다. HLD에만 "faucet 20 USDC/2시간" 메모 |
| Home → 보내기 완료 (위험 없음) | 탭 약 6회 + Face ID | 보내기 → 최근 주소 → 다음 → 금액 → 검토 → 확인하고 보내기 |
| Home → 보내기 완료 (비슷한 주소) | 탭 약 8회 + Face ID | 위 + "위험 확인하기" → sheet "확인했어요, 보내기" |

보내기 탭 수는 Toss·Coinbase 수준이다. 문제는 첫 자금 단계다.

---

## 4. Risk register

Likelihood(L)와 Impact(I)는 1–5. Score = L × I.

| # | 위험 | L | I | Score | 근거 | 완화 |
|---|---|---|---|---|---|---|
| R1 | **증거 없음**: 실제 사용자·funnel·latency 데이터가 0이다. "seamless" 주장을 검증할 수 없다 | 5 | 5 | 25 | `PRODUCT.md`: fake adapter, 네트워크 호출 없음 | C3(실제 Sepolia) 뒤 10–20명 moderated test + 이벤트 계측 |
| R2 | **첫 가치 단절**: testnet 자금을 얻는 길이 앱 안에 없다. 빈 지갑에서 멈춘다 | 5 | 4 | 20 | 빈 Home은 "받기 주소 보기"만 있다 [관찰]. faucet은 HLD에만 있다 | Figma에 faucet 안내 상태 추가 (외부 링크, 보증 문구 없이) |
| R3 | **UX는 복제 가능**: 비슷한 주소 경고는 MetaMask·Trust Wallet에 이미 있다 | 5 | 3 | 15 | MetaMask Support, Trust Wallet 보도 | moat 주장은 하지 않는다. "검토 품질"을 측정 가능한 지표로 바꾼다 |
| R4 | **최근 보낸 주소가 poisoning 통로**: $50M 사고는 내역에서 주소를 복사해서 났다 | 3 | 5 | 15 | The Block 2025-12. VaultMe는 "이 기기 내역에서만" + 비슷한 주소 검사 유지 [관찰] | 받은(incoming) 주소는 최근 목록에 절대 넣지 않는다는 규칙을 Figma 주석과 테스트로 고정 |
| R5 | **보안 단계 누적으로 이탈**: S02 체크 3개 + 백업 gate + Face ID + 위험 sheet | 3 | 4 | 12 | Baymard: 약 1/5이 "길고 복잡함"으로 이탈 [측정, 일반 기준] | 단계별 이탈 계측. 체크 3개를 1화면 유지하되 순서 실험 |
| R6 | **Figma–app 화면 불일치**: app에 restore, backup/check가 있으나 v9 세트에 없다. QR 화면 없음 | 4 | 3 | 12 | `apps/mobile/app/` 목록 vs `work/v9/screens` [관찰] | AGENTS 규칙 6–7에 따라 Figma frame 먼저 |
| R7 | **perceived speed와 실제 차이**: 3단계 진행 표시가 실제 Sepolia 지연과 맞지 않을 수 있다 | 3 | 3 | 9 | Wise 리뷰 불만 1순위가 이 차이다 [측정] | 실제 블록 시간으로 예상 시간 표시 여부를 검증 뒤 결정 |
| R8 | **testnet 표시 중복**: "Sepolia 테스트넷" + "테스트 데이터" 칩 동시 표시 | 4 | 2 | 8 | `work/compare/review-app.png` [관찰] | C3에서 "테스트 데이터" 칩 제거 (계획됨) |
| R9 | **regulatory/trust signal 없음**: 감사 보고서, bug bounty, 보안 연락처가 없다 | 3 | 4 | 12 | 저장소에 없음 [관찰]. mainnet이면 신뢰 신호가 필수 | mainnet 전 외부 감사·bug bounty 계획. 지금은 "testnet 전용" 고지 유지 |
| R10 | **시장 정의 없음**: 최종 사용자와 시장이 미정이다 | 5 | 5 | 25 | `PRODUCT.md` Users: "미정" | UX diligence 범위 밖. 그러나 partner 첫 질문이 된다 |

---

## 5. Partner interview 질문 (10분)

| # | 질문 | 지금 답 | 모을 증거 |
|---|---|---|---|
| 1 | "누가 쓰고, 이 제품이 없으면 무엇을 쓰나?" | 답 없음. 사용자 미정 | 대상 1개 선택(예: testnet 개발자, 한국 crypto 입문자). 인터뷰 10건 |
| 2 | "seamless라고 하는데, 숫자가 있나?" | 없다 | C3 뒤 계측: 생성 완료율, 백업 완료율, time-to-first-receive, 보내기 완료율, 위험 sheet 취소율 |
| 3 | "Coinbase Wallet은 passkey로 15초다. 왜 아직 12단어인가?" | 범위 결정(HLD) | passkey/smart account 검토 메모. 12단어 유지라면 이유와 백업 완료율 |
| 4 | "address poisoning 경고는 MetaMask도 한다. 무엇이 다른가?" | 전체 주소 비교 sheet, 다른 묶음 강조, 목록에 짧은 주소 금지 | 같은 시나리오 A/B 사용성 테스트. 탐지율·오탐율 |
| 5 | "경고를 사람들이 그냥 누르지 않나? (warning fatigue)" | "취소"가 Primary, 위험 확인 버튼 분리 | 위험 sheet에서 취소 비율. 오탐 빈도 |
| 6 | "testnet 자산은 가치가 없다. 왜 사용자가 다시 오나?" | 답 없음 | retention 가설. D1/D7 측정 계획. finance 앱 D30 4–12% 기준 |
| 7 | "mainnet으로 가면 규제와 신뢰는?" | 계획 없음 | self-custody 규제 위치 메모, 감사 일정, 보안 공개 정책 |
| 8 | "돈은 어떻게 버나?" | 없음 | UX 범위 밖. 그러나 반드시 나온다 |
| 9 | "Figma와 app이 다르면 누가 이기나?" | Figma SSOT (AGENTS 규칙 6) | 화면 세트 차이 목록 0건 |
| 10 | "팀이 사용자 문제를 빨리 찾는가?" | 리뷰 기록이 많다 (pd-review 3회) | 리뷰 → 수정 주기 시간. 좋은 신호다 |

---

## 6. 추천 (순위)

| 순위 | 추천 | 구분 | 이유 |
|---|---|---|---|
| 1 | C3(실제 Sepolia) 뒤 funnel 이벤트 계측: 생성, 백업, 첫 받기, 첫 보내기, 위험 sheet 결과 | **app only** (화면 변경 없음, 이벤트만) | R1. 계측이 없으면 모든 UX 주장이 추정이다. 화면을 바꾸지 않으므로 규칙 6–7 대상 아님. 단, 권한 동의 UI가 생기면 Figma 먼저 |
| 2 | 빈 지갑 Home·받기에 testnet 자금 얻는 안내 상태 추가 | **needs Figma first** | R2. 첫 가치 단절. 외부 faucet 이름과 "VaultMe가 운영하지 않음" 고지 필요 |
| 3 | 보내기 QR 스캔(S21) frame과 진입 버튼, 보내기 자산 선택 상태 | **needs Figma first** | send flow 완결성. ux-flow에는 있으나 v9 세트와 app에 없다 |
| 4 | app에만 있는 restore, backup/check 화면의 Figma frame 정리 (S04, S05, S06) | **needs Figma first** | R6. 규칙 6 위반 가능성. Figma가 이기도록 맞춘다 |
| 5 | "최근 보낸 주소"는 내가 서명해 보낸 주소만 쓰고, 받은 주소·0원 전송 주소는 넣지 않는다는 규칙을 테스트로 고정 | **app only** (로직 테스트, 화면 변경 없음) | R4. $50M 사고 패턴 차단 |
| 6 | 10–20명 moderated usability test: 비슷한 주소 시나리오 탐지율, 백업 완료 시간 | **app only** (연구, 코드 변경 없음) | partner 질문 2, 4, 5의 답 |
| 7 | 테스트 모드 칩 중복 정리 (C3에서 "테스트 데이터" 칩 제거) | **app only** (이미 Figma 계획에 있는 제거라면). 새 배치가 필요하면 needs Figma first | R8 |
| 8 | passkey/smart account 옵션 검토 메모 (기능 아님, 결정 기록) | 문서만 | partner 질문 3. 구현하려면 grilling + Figma 먼저 (규칙 7) |
| 9 | mainnet 전 trust signal 계획: 외부 감사, bug bounty, 보안 연락처 화면 | **needs Figma first** (화면이 생기면) | R9 |

---

## 7. 사용한 skill

| Skill | 상태 | 출처 |
|---|---|---|
| `product-management:competitive-brief` | 불러옴 (이미 설치된 plugin) | claude.ai plugin catalog, product-management plugin |
| `competitive-strategy` | **이번에 global 설치** 후 불러옴 | [refoundai/lenny-skills](https://github.com/refoundai/lenny-skills) `skills/competitive-strategy`. `npx skills add refoundai/lenny-skills --skill competitive-strategy -g -y`. 설치 전 SKILL.md를 읽음: Markdown만 있음, script·secret·외부 전송 없음. `~/.claude/skills/competitive-strategy` → `~/.agents/skills/competitive-strategy` |
| `onboarding` | 불러옴 (이 세션에서 다른 agent가 설치한 것으로 보임, 내가 설치하지 않음) | `coreyhaines31/marketingskills` (`~/.agents/.skill-lock.json` 기록) |
| `find-skills` | 절차로 사용 (`npx skills find "startup due diligence"`, `"competitive analysis"`) | `~/.claude/skills/find-skills` |

설치하지 않은 후보: `brucegx/claude-due-diligence@startup-due-diligence`, `yoitsyoung/vc-analyst-skill@vc-analyst` 등 VC diligence skill. 설치 수가 1–2회이고 저자 검증이 어려워서 쓰지 않았다.

---

## 8. 한계

- Mobbin은 로그인이 필요해서 쓰지 않았다.
- 경쟁사 점수는 공개 리뷰와 공개 지표 기반 추정이다. 직접 사용 테스트가 아니다.
- Chainalysis, Adjust, AppsFlyer 원문은 직접 열지 못했다. 2차 출처 숫자는 표에 표시했다.
- VaultMe 점수는 Figma와 app capture 기준이다. 실제 네트워크 동작은 보지 않았다.
