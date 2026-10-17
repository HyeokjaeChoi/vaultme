# VaultMe 디자인 diligence: iOS 시장 benchmark (YC analyst)

날짜: 2026-10-17. 범위: 읽기만 했다. 코드, Figma, simulator는 바꾸지 않았다. 다른 `rr-*` 보고서는 읽지 않았다.
근거: `work/compare/*-app.png`(home, review, review-lookalike-sheet, result-confirmed, receive, receive-faucet, activity, tx-detail-confirmed, restore), `PRODUCT.md`, `outputs/design/redesign-b.md` §9, `work/review/seamless-yc-analyst-2026-10-17.md`(이전 UX diligence), Mobbin iOS 화면, https://stack-line.dev.
표기: **[관찰]** = 이미지를 직접 봄. **[추정]** = 분석가 판단.

---

## 1. 판정 (먼저 읽기)

1. 디자인은 **좁은 구간에서 시장 위**다. 구간 = 보내기 검토 + 위험 sheet + 결과 + 전체 주소 표시.
2. 그 밖은 **시장 평균 이하**다. 구간 = 브랜드 느낌, accent 규율, 화면 간 일관성, 완성도 인상.
3. 디자인은 **차별점 후보**다. 아직 **moat가 아니다**. 이유는 §5.
4. 투자 관점: 디자인은 막는 요소가 아니다. 그러나 "디자인이 이긴다"고 말할 증거는 없다. 사용자 데이터가 0이다.

한 줄: "안전 UX는 Phantom·Coinbase보다 정직하다. 겉모습은 Toss·Phantom보다 덜 만들어졌다."

---

## 2. 방법과 한계

- Mobbin connector로 iOS 화면을 검색했다. 이미지를 직접 봤다. `output_destination: "doc"`.
- **Mobbin에 없는 앱**: MetaMask, Robinhood. 검색하면 Family, Trust Wallet, Kraken, Crypto.com이 대신 나온다 [관찰]. 이 두 앱은 점수를 매기지 않았다(n/a). 대체 화면은 참고로만 적었다.
- 요청한 8개 화면 × 9개 앱 = 72칸을 다 채우지 못했다. 본 화면만 인용한다. 못 본 칸은 점수에 쓰지 않았다.
- Revolut, Wise, Toss는 보내기·결과·홈만 봤다. 위험 경고(Revolut 한 장) 외 crypto 화면이 없다. safety 점수는 "자기 도메인 안에서" 매겼다.
- Mobbin 화면은 앱 버전이 섞여 있다. 날짜를 알 수 없다 [추정]. 점수는 **상대 비교용**이다. 절대값이 아니다.
- VaultMe capture는 폭이 둘이다(390px 계열, 1206px 계열) [관찰]. 같은 세트에서 크기가 섞이면 비교 증거로 약하다.

---

## 3. Benchmark set (Mobbin, iOS)

| 화면 | 앱 | 링크 | 본 것 |
|---|---|---|---|
| Home | Coinbase Wallet | [dark, 잔액+Buy/Swap/Cash out](https://mobbin.com/screens/f9244263-6d8f-4f9b-9056-9b7784be9636), [프로모 카드 홈](https://mobbin.com/screens/54d2e700-a272-4230-b628-480dcf015e1b) | 큰 잔액, 그라디언트 버튼, 홈에 trending swap 광고 |
| Home | Phantom | [Side Wallet](https://mobbin.com/screens/56ce0e29-049e-4549-9cb0-ea23e0baca73), [Tokens 목록](https://mobbin.com/screens/c8f09680-22fc-48f4-9788-925b8b22cee5) | 4버튼, Cash Balance 카드, "For Your First Trade" |
| Home | Rainbow | [잔액+자산](https://mobbin.com/screens/4b0519ed-a11b-4a6e-b98f-fcd94bebf98b), [빈 지갑](https://mobbin.com/screens/4348d291-0303-4981-a6b2-d34d26f533a0) | 노란 원형 버튼 4개, 이모지 아바타 |
| Home | Coinbase | [차트 홈](https://mobbin.com/screens/9cc67605-c277-4edc-816d-010d0d50c0b3), [My assets](https://mobbin.com/screens/c3888b90-3f9a-45db-bdd6-d8329f4ccbc8) | 차트, 광고 배너, staking 경고 카드 |
| Home | Wise | [잔액+통화 카드](https://mobbin.com/screens/80447118-2f07-41ab-89a0-2a2da94d4040), [Tasks](https://mobbin.com/screens/091bf508-6807-466b-aa28-0466d43afebd) | 한 accent(연두), 3개 pill action |
| Home | Toss | [홈](https://mobbin.com/screens/d8af309c-6543-4750-9acc-77215f009c69), [밝은 홈](https://mobbin.com/screens/b5315413-f78c-4e36-9d05-316633c10e7c) | 카드 스택, 고밀도 |
| Home (Robinhood 대체) | Family / Kraken | [Family 자산](https://mobbin.com/screens/b49ade97-de38-49e2-84e9-3009916eb526), [Kraken 자산](https://mobbin.com/screens/8583ffef-dce5-412d-bdd3-f0118d23ce25) | Robinhood는 Mobbin에 없음. 참고만 |
| Send review | Coinbase | [Send S$0.10](https://mobbin.com/screens/696427e3-11c5-4909-b314-aa09b816c539) | 한 줄 scam 안내(작은 회색), Total, 파란 Send Now |
| Send review | Coinbase Wallet | [Send 확인](https://mobbin.com/screens/79830745-5141-4a17-950e-2abafa1de52c) | 주소 `bc1qfw…yec7` 줄임, Cancel/Confirm |
| Send review | Trust Wallet, Family | [Trust Confirm send](https://mobbin.com/screens/d195b60c-4e40-4f52-b9a9-dd02958b1781), [Family Refuel](https://mobbin.com/screens/dd04969d-47c8-466c-a51d-6c0000b23a93) | 줄인 주소. MetaMask 대체 참고 |
| Send review | Rainbow | [Hold to Send](https://mobbin.com/screens/fe950802-1436-40ac-9045-2741a871ef0e), [Swap review](https://mobbin.com/screens/7f136304-8d35-4c46-817d-73abdb831aa9) | 길게 눌러 보내기, 컨트랙트 주소 줄임 |
| Send review | Wise | [Confirm and send](https://mobbin.com/screens/676d6d79-fb58-4dff-a517-af056631e589), [상세](https://mobbin.com/screens/5c0b1302-b27a-4d93-8e15-45538f98eae2) | 수수료 포함, 도착 시간, 섹션별 Change |
| Send review | Revolut | [Review transfer](https://mobbin.com/screens/2a4195e0-605e-4215-9091-7b885783635e), [처리 중](https://mobbin.com/screens/99459ea6-5ce5-4ec8-93ad-9d482b753132) | 상단 "Do you know and trust the payee?" warning card |
| Send review | Toss | [채울까요?](https://mobbin.com/screens/0e4591f1-0fe0-44d3-ae46-46aae3b3e1a3) | 큰 문장 하나, 하단 "평생 수수료 무료" |
| Risk warning | Phantom | [Reset App](https://mobbin.com/screens/7b8e23da-38e2-4059-81ce-be05735ff58f), [Risk disclosure 링크](https://mobbin.com/screens/b4ff8c71-7dc2-4df2-b4bf-3f6c9fb2d4b3) | 빨간 Primary "Continue"(되돌릴 수 없는 일). 안전 쪽이 Primary 아님 |
| Risk warning | Trust Wallet | [홈 NFT에 "$50,000 airdrop"](https://mobbin.com/screens/d2d61250-45b5-441f-81f0-c273284cfa60) | 스캠 airdrop이 홈에 그대로 보임 [관찰] |
| Result | Coinbase | [You sent](https://mobbin.com/screens/04f23bdc-6700-4b8b-a5fc-15b2b788a4ee) | 큰 파란 check, 금액, 아래에 "Send BTC for less" 광고 |
| Result | Toss | [채웠어요](https://mobbin.com/screens/5faf70d5-f007-4bfa-86ff-55802a53c121) | 큰 check, 한 문장, "수수료는 토스가 냈어요" |
| Result | Revolut | [You sent](https://mobbin.com/screens/2a4195e0-605e-4215-9091-7b885783635e), [processing](https://mobbin.com/screens/99459ea6-5ce5-4ec8-93ad-9d482b753132) | 하단 sheet, "Arriving: Instantly" |
| Receive | Phantom | [Receive Solana](https://mobbin.com/screens/2a707eff-e0a5-457b-b00c-58ec94bd96cc) | QR, 줄인 주소, Copy/Share, "이 network만" 안내 |
| Receive | Coinbase Wallet | [Receive Bitcoin](https://mobbin.com/screens/67ea184a-82aa-4783-85d5-0ba7144d44ce), [Legacy](https://mobbin.com/screens/40e31334-5863-4c63-8b6c-96b38b21d093), [SegWit sheet](https://mobbin.com/screens/7a13e49d-eeea-4735-829d-354f5d8d61df) | 그라디언트 QR, 줄인 주소 |
| Activity | Rainbow | [Pending/Today](https://mobbin.com/screens/1f965f0f-db81-4096-ba12-eef6391d5f1c) | Pending 구획, "Contract Interaction $0.00" 행 |
| Activity | Coinbase Wallet | [Transactions](https://mobbin.com/screens/e7e068c7-5391-491c-b6a3-3d6f251f69b5) | Sent/Received, 줄인 주소, 녹/백 금액 |
| Tx detail | Rainbow | [Received](https://mobbin.com/screens/962ee75a-7ec3-4aa3-a3f7-d868e4c8cd98), [Speed Up/Cancel](https://mobbin.com/screens/1509e6b0-8d36-4ccb-9e26-531835c4f1f7) | From/To, tx hash, Etherscan 버튼 |
| Tx detail | Coinbase Wallet | [Sent Bitcoin](https://mobbin.com/screens/57d510d0-9948-4f98-a7f3-7f325d88fced), [Sent 상세](https://mobbin.com/screens/b0e374b3-096a-49a9-9213-df8e46f027aa) | 전체 주소, fee, hash, Send again, View on explorer |
| Restore | Family | [Paste from Clipboard](https://mobbin.com/screens/afda2873-755d-4b95-85cf-afa2df04b91a) | 번호 칸 + 큰 paste 버튼 |
| Restore | Brave Wallet | [12칸 grid](https://mobbin.com/screens/cbf540e1-5460-4f8c-91e2-04123cbb2fce) | 밑줄 grid, "아무 칸에 전체 붙여넣기 가능", 24단어 링크 |
| Restore | Phantom, Glow | [Phantom textarea](https://mobbin.com/screens/c0a864b3-83cc-4a65-a01f-b45bf94cdeec), [Glow](https://mobbin.com/screens/ed9f16b4-c121-44f2-a1ea-7087cbd43197) | 한 덩어리 textarea. 칸별 오류 표시 없음 |

Mobbin AI usage 안내 (원문 그대로):

---

**Your Mobbin AI usage is high this month**

Usage is unlimited during beta. If your usage stays at this level, you may need to purchase more credits once limits take effect. [View usage and plan options](https://mobbin.com/settings/billing-and-usage)

---

---

## 4. Scorecard

척도: 1 = 약함, 3 = 시장 평균, 5 = 최고. 점수는 위 링크 화면과 VaultMe capture를 본 **[추정]**이다. 실사용 검증이 아니다.
MetaMask, Robinhood = n/a (Mobbin 미수록).

| 차원 | VaultMe | Coinbase / Wallet | Phantom | Rainbow | Wise | Revolut | Toss |
|---|---|---|---|---|---|---|---|
| Visual clarity | 4 | 4 / 3 | 4 | 4 | 4 | 4 | 5 |
| Hierarchy | 4 | 4 / 3 | 4 | 4 | 3 | 4 | 4 |
| Accent discipline | 3 | 4 / 3 | 3 | 3 | 4 | 4 | 4 |
| Information honesty | 5 | 2 / 3 | 3 | 3 | 5 | 4 | 4 |
| Safety UX | 5 | 3 / 3 | 3 | 3 | 3 | 4 | 3 |
| Consistency | 3 | 4 / 3 | 4 | 4 | 5 | 4 | 5 |
| Perceived craft | 3 | 5 / 3 | 5 | 5 | 4 | 4 | 5 |
| **합계 /35** | **27** | **26 / 20** | **26** | **26** | **28** | **28** | **30** |

### 근거 (차원별, 핵심만)

**Visual clarity.** VaultMe Home은 큰 잔액 하나와 버튼 두 개다. 읽기 쉽다 [관찰, `home-app.png`]. 그러나 같은 값이 두 번 나온다. 위 큰 숫자 `1.284732 ETH`와 아래 자산 행 `1.284732 ETH`. Wise·Coinbase는 총액과 항목이 다른 값이다.

**Hierarchy.** VaultMe 검토 화면은 "금액 → 받는 사람 → 보내는 것 → 버튼" 순서가 맞다 [`review-app.png`]. 12px 회색 띠가 구획을 만든다. 같은 방식을 Wise가 선(line)으로 한다. VaultMe가 더 조용하다. Toss는 한 화면에 질문 하나라서 더 강하다 [Toss 확인](https://mobbin.com/screens/0e4591f1-0fe0-44d3-ae46-46aae3b3e1a3).

**Accent discipline.** VaultMe는 파랑 하나를 Primary로 쓴다. 그러나 같은 화면에 호박색 chip, 파란 chip, 초록 `+12.5 USDC`, 빨간 밑줄, 검은 `12단어` pill이 함께 있다 [관찰, `home-app.png`, `review-app.png`, `restore-app.png`]. 오너 기준(stack-line: accent 하나)보다 많다. PRODUCT.md는 "파랑은 성공·이득 의미가 아니다"라고 정한다. 초록 금액은 그 규칙을 지킨다. 그래도 색 종류는 5개다.

**Information honesty.** VaultMe가 가장 높다. 근거 4개 [관찰]:
- "테스트넷 자산은 시장 가격이 없어요." (Home)
- "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요." (Review)
- 전체 주소를 4글자 묶음으로 보여 준다. 처음 4와 마지막 4를 굵게 한다. (Review, Receive, Result)
- 결과 화면에 "이 거래는 네트워크에서 확정됐어요." + 3단계 진행.
비교: Coinbase 결과 화면은 금액 아래에 "Send BTC for less" 광고를 붙인다 [링크 §3]. Coinbase Wallet은 주소를 `bc1qfw…yec7`로 줄인다. 줄인 주소는 address poisoning 위험이다(이전 보고서: 약 270M 시도, USENIX Security 2025).

**Safety UX.** `review-lookalike-sheet-app.png`가 benchmark 중 가장 좋다 [관찰]. 이유:
- 전에 보낸 주소와 지금 주소를 나란히 놓는다.
- 다른 묶음만 빨간 굵은 밑줄로 표시한다.
- **"취소"가 파란 Primary**다. 위험 실행("확인했어요, 보내기")은 회색 Secondary다.
비교: Phantom "Reset App"은 위험 실행이 빨간 Primary다 [Phantom Reset](https://mobbin.com/screens/7b8e23da-38e2-4059-81ce-be05735ff58f). Revolut은 상단 경고 카드가 좋지만 화면 위쪽에 묻힌다 [Revolut](https://mobbin.com/screens/2a4195e0-605e-4215-9091-7b885783635e). Coinbase scam 문구는 작은 회색이다 [Coinbase](https://mobbin.com/screens/696427e3-11c5-4909-b314-aa09b816c539).
감점 없음. 단, 이 sheet의 효과(사용자가 취소하는가)는 측정한 적이 없다.

**Consistency.** VaultMe 감점 3개 [관찰]:
- 검토·받기·내역에 chip이 2개(`Sepolia 테스트넷` + `테스트 데이터`). Home·결과·상세는 1개. 같은 칩이 화면마다 다르다.
- `restore-app.png`의 번호 칸은 굵은 회색 외곽선 12개다. 다른 화면은 borderless다. PRODUCT.md가 Input 예외를 인정한다. 그래도 한 앱 안에서 시각 무게가 가장 크다. Brave는 밑줄 grid로 같은 일을 가볍게 한다 [Brave](https://mobbin.com/screens/cbf540e1-5460-4f8c-91e2-04123cbb2fce).
- 선: 회색 띠(검토·결과·상세) 와 가는 선(`receive-faucet-app.png`의 구분선, 하단 버튼 위 선)이 섞인다. 규칙은 "border·shadow 없음"이다(`redesign-b.md` §9.2).

**Perceived craft.** 기능 정확도는 높다. 그러나 인상은 "정돈된 기본값"이다 [추정]. 이유:
- 브랜드 순간이 없다. 결과 화면은 check 배지 하나. Toss·Coinbase는 큰 check에 motion과 한 문장 카피가 있다.
- 일러스트·빈 상태 장면이 없다. Rainbow·Phantom은 아바타와 카드 질감이 있다.
- 금액 숫자 700 weight는 좋다. 그러나 `ETH` 단위가 숫자와 비슷한 크기다. 홈 `1.284732 ETH`에서 단위가 숫자와 경쟁한다.

---

## 5. 시장 대비 위치

### VaultMe가 위인 곳
1. 위험 sheet 구조 (취소 = Primary, 다른 묶음 밑줄). 5개 앱 중 비슷한 것이 없다. Revolut이 가장 가깝다.
2. 전체 주소 표시. Coinbase Wallet, Trust, Rainbow, Phantom은 모두 줄인다 [§3 링크].
3. 정직한 상태 카피 ("확인했어요", "관찰한 범위만"). Coinbase는 광고를 결과에 섞는다.
4. 결과 단계 표시 (보냄 → 블록 포함 → 확정). Wise와 같은 수준.

### VaultMe가 아래인 곳
1. **Tx detail에 hash와 explorer 링크가 없다** [`tx-detail-confirmed-app.png`]. Rainbow와 Coinbase Wallet은 둘 다 있다 [Rainbow](https://mobbin.com/screens/962ee75a-7ec3-4aa3-a3f7-d868e4c8cd98), [CBW](https://mobbin.com/screens/b0e374b3-096a-49a9-9213-df8e46f027aa). 원인: fake adapter. C3 뒤 필수다. 지금은 "미구현"이다.
2. **Pending 구획이 내역에 없다.** Rainbow는 Pending을 맨 위 별도 구획으로 둔다 [Rainbow](https://mobbin.com/screens/1f965f0f-db81-4096-ba12-eef6391d5f1c). VaultMe는 날짜 그룹 안에 `보내는 중`을 넣는다. (§9.3은 "홈은 진행 중이 맨 위"만 정했다.)
3. 속도 취소·가속(Speed Up/Cancel)이 없다. Rainbow에 있다. testnet 범위 밖일 수 있다 [추정].
4. 브랜드 인상, 빈 상태, 결과 순간. Toss·Phantom·Coinbase가 앞선다.
5. 홈에 가격·변동이 없다. 의도적이다(testnet). 그러나 사용자에게는 "비어 있다"로 읽힐 수 있다 [추정].

### 오너 기준(stack-line.dev)과 비교
stack-line을 직접 열었다 [관찰]. 특징: 어두운 배경, accent 하나(호박색), `// ONE-PERSON SOFTWARE STUDIO` 같은 mono 사실 label, 구체적 숫자("120 seeded events", "v0.2.0"), "nothing is dropped silently" 같은 정확한 카피.

| 기준 | stack-line | VaultMe |
|---|---|---|
| 한 accent | 호박색만 | 파랑 + 호박 chip + 파랑 chip + 초록 + 빨강 |
| 강한 hierarchy | H1 하나가 지배 | Home은 강함(큰 잔액). 검토·restore는 평평함 |
| mono 사실 label | `//` mono label | mono는 주소·hash에만. 사실 label 시스템은 없음 |
| 정직하고 정확한 카피 | 강함 | **강함** (가장 큰 공통점) |
| 정렬 | 엄격 | 대체로 좋음. chip 줄과 제목 줄이 화면마다 다름 |

해석: 카피 정직성은 같은 수준이다. accent 수와 mono label 시스템은 아직 거리가 있다. (참고: 내가 연 stack-line 화면의 demo 창에 `[object Object]`가 두 줄 보였다. 오너 사이트의 버그일 수 있다. 확인은 오너 몫이다.)

---

## 6. 디자인은 차별점인가?

**조건부로 그렇다. 안전 구간에서만.** `competitive-strategy`의 "can't vs won't" 틀로 본다.

| 요소 | 경쟁사가 못 하나? | 안 하나? | 판단 |
|---|---|---|---|
| 취소 = Primary, 비슷한 주소 sheet | 할 수 있다 (MetaMask·Trust에 비슷한 경고 있음, 이전 보고서) | 할 이유가 있다 | 복제 쉬움. moat 아님 |
| 전체 주소 표시 | 할 수 있다 | **안 한다** — 줄인 주소는 한 줄 레이아웃과 growth UI(광고·promo)를 위한 선택 [추정] | 가장 방어 가능. 그들의 모델과 충돌한다 |
| 광고 없는 결과·홈 | 할 수 있다 | **안 한다** — Coinbase·Phantom·Rainbow 홈은 swap/trade/광고로 수익을 낸다 | 구조적 counter-positioning 후보 |
| 브랜드 인상 | 이미 앞섬 | — | VaultMe 약점 |

결론: 방어 가능한 것은 **"광고·growth 압력이 없는 화면"과 "전체 주소"**다. 위험 sheet는 복제된다. 이 둘은 수익 모델이 없는 testnet wallet이라서 지금은 공짜로 얻는다. mainnet과 수익 모델이 생기면 같은 압력을 받는다 [추정]. 그때까지 지켜야 한다.

---

## 7. 위험

| # | 위험 | 점수(L×I) | 근거 |
|---|---|---|---|
| D1 | 검증 없음: 위험 sheet가 실제로 사고를 줄이는지 측정한 적이 없다 | 5×5 | 사용자 0, fake chain (`PRODUCT.md`) |
| D2 | "안전 = 좋은 디자인"이 아니다. 첫인상이 약하면 sheet까지 가지 않는다 | 4×4 | §4 perceived craft 3 |
| D3 | Accent 5색. 오너 기준과 어긋남. 위험 빨강이 희석됨 | 4×3 | 홈·검토에 호박+파랑 chip 동시 |
| D4 | chip 중복 (`Sepolia 테스트넷` + `테스트 데이터`) | 4×2 | 검토·받기·내역에 둘 다 [관찰] |
| D5 | restore 화면 외곽선 12개. borderless 원칙과 충돌, 첫 사용자가 가장 긴장하는 화면에서 시각 소음 | 3×3 | `restore-app.png` |
| D6 | hash·explorer 없음. mainnet에서는 신뢰 신호 부족 | 3×4 | CBW·Rainbow 비교 |
| D7 | 광고·growth 압력이 생기면 정직한 화면이 무너진다 | 2×5 | Coinbase 결과 화면 |
| D8 | Figma와 app 화면 세트가 다르다 (이전 보고서 R6). capture 크기도 둘 | 3×3 | 이전 diligence, §2 |
| D9 | 경쟁 점수는 Mobbin 한 장 기준 [추정]. MetaMask·Robinhood는 증거 없음 | — | §2 |

---

## 8. 추천 (순위: 기초적인 것 먼저)

오너 지침 반영: px 단위 작은 차이는 순위에서 뺐다. Foundation(hierarchy, accent, layout 구조, IA, type system, component logic, 시각 언어 일관성)이 틀렸는지만 본다. 작은 것은 부록 A에 둔다.

**Figma first** = 화면이 바뀐다. AGENTS.md 규칙 6–7에 따라 Figma frame 먼저, 오너 승인 후 코드.
**app only** = 로직·측정·문서만 바뀐다.

| 순위 | Foundation 층 | 추천 | 구분 | 이유 / 근거 |
|---|---|---|---|---|
| 1 | Accent 규율 (시각 언어) | **색 역할 표를 하나로 고정한다.** Primary 파랑 하나. 호박 = testnet 하나. 초록·빨강 = 상태 의미만. 한 화면에 chip 색 2개를 쓰지 않는다. 검은 선택 pill(`12단어`)은 중립 selected 규칙으로 통일 | **Figma first** (Foundation) | 가장 기초적인 gap. 오너 기준 stack-line은 accent 하나. 5색은 위험 빨강의 힘을 약하게 한다 (D3) |
| 2 | 컴포넌트 논리 | **"테스트 상태" 표시를 한 컴포넌트로 만든다.** 지금은 chip 1개 / 2개가 화면마다 다르다. 규칙: 항상 같은 자리, 같은 수 | **Figma first** | 같은 개념이 화면마다 다른 모양이다 (D4). 일관성 3점의 주원인 |
| 3 | 시각 언어 일관성 | **Input 스타일 한 가지로 정한다.** 번호 칸 12개 외곽선(restore)과 borderless 앱이 충돌한다. 밑줄 grid 또는 tone-step 채움. 선은 focus·오류만 | **Figma first** | D5. Brave 방식 [링크](https://mobbin.com/screens/cbf540e1-5460-4f8c-91e2-04123cbb2fce). 첫 사용자가 가장 긴장하는 화면이다 |
| 4 | Hierarchy / 브랜드 순간 | **결과 화면에 "순간"을 설계한다.** 큰 check, 한 문장, 확정 motion. 광고 없음. 진행 표시는 유지. 장식만 빼고 대체물이 없는 것이 craft 3점의 원인이다 | **Figma first** | Toss·Coinbase가 앞선 지점. §9.3에 motion 결정이 이미 있다 |
| 5 | 정보 구조 (IA) | **Home의 같은 값 2회 제거.** 큰 숫자와 자산 행이 같다. 큰 숫자의 역할을 다시 정한다 | **Figma first** | Wise·Coinbase는 총액 ≠ 항목. 홈 hierarchy가 하나 줄어든다 |
| 6 | 정보 구조 (IA) | **Tx detail에 hash + explorer 자리**, 내역에 **Pending 구획** | **Figma first** | D6. CBW·Rainbow 모두 hash 있음 [Rainbow](https://mobbin.com/screens/962ee75a-7ec3-4aa3-a3f7-d868e4c8cd98). Pending 구획: [Rainbow](https://mobbin.com/screens/1f965f0f-db81-4096-ba12-eef6391d5f1c). C3 전에 frame 필요 |
| 7 | 증거 | **위험 sheet 측정**: 취소율, 확인율, 오탐율 이벤트 | **app only** | D1. 디자인 = 차별점의 유일한 증거 |
| 8 | 차별점 보호 | **"광고 없음 + 전체 주소" 원칙 문서화** (PRODUCT.md Product Principles 한 줄 + `check-repo-rules` 검사) | **app only** | D7. 구조적 counter-positioning 보호 |
| 9 | 시각 언어 (선택) | mono 사실 label 시스템 도입 검토 (stack-line식). 한국어 앱에 맞는지 불확실 | **Figma first** (오너 결정) | [추정]. 낮은 순위 |

비추천: 가격 차트, trending, promo 카드 추가. 경쟁사가 하는 일이다. 광고 없음이 차별점이다.

### 부록 A: 작은 항목 (순위 밖, 필요할 때만)

- Home `ETH` 단위가 숫자와 비슷한 크기로 보임.
- `receive-faucet`의 구분선, 하단 버튼 위 선과 회색 띠가 섞임.
- capture 폭이 둘(390, 1206). 비교 쌍 재생성 때 통일.

---

## 9. 사용한 skill와 판단 변화

| Skill | 상태 | 판단이 어떻게 바뀌었나 |
|---|---|---|
| `impeccable` (audit, native 참조) | 불러옴. `audit native` 인자. 스크립트(`context`)는 실행하지 않음(읽기 전용 범위) | "native 화면은 Operate mode: 일관성과 익숙함이 표현보다 우선"이라는 틀을 받았다. 그래서 Toss식 큰 장식을 추천하지 않았다. 감점은 chip 중복·accent 수·외곽선 같은 **일관성 결함**에 집중했다 |
| `design-taste-frontend` | 불러옴. 웹 landing용 skill. 앱 화면에는 직접 적용 안 함 | "accent 하나, 두 가지 크기, 선·그림자·chip 장식 제거" 원칙을 stack-line 비교와 accent 감사(추천 1)에 썼다. "아무것도 없는 화면은 얇아 보인다"는 경고는 craft 3 판정을 지지했다: 장식을 빼기만 하고 대체물(큰 결과 순간)이 없다 |
| `competitive-strategy` | 불러옴 (전역 설치) | "can't vs won't"로 차별점을 걸렀다. 위험 sheet는 복제 쉬움, 전체 주소·광고 없음은 경쟁사가 **안 하는** 일이다. 그래서 "디자인 = moat"를 거부하고 "구조적 counter-positioning 후보"로 낮췄다 |
| `product-management:competitive-brief` | 불러옴 | 평가 척도(Strong/Adequate/Weak)와 "정직하게 약점을 적는다" 규칙을 썼다. 경쟁사 강점(Toss 결과, Phantom craft)을 깎지 않았다. 분석에 Mobbin 증거 없는 칸은 점수에서 뺐다 |

---

## 10. 한계

- Mobbin 증거: MetaMask, Robinhood 없음. Revolut·Wise·Toss는 crypto 화면 없음.
- 점수는 화면 한 장 기준 [추정]. 실사용·리뷰·측정이 아니다.
- VaultMe capture는 fake adapter 상태다. 실제 chain 상태(실패 사유, 가스 변동)는 보지 못했다.
- 다크 모드, 24단어, 실패·오류 화면 대부분은 이번에 보지 않았다.
- 이전 보고서(`seamless-yc-analyst-2026-10-17.md`)는 UX 흐름 중심이었다. 이번 보고서는 시각·정보 품질 중심이다. 이전 점수(23/30, 설계 점수)와 이번 27/35는 척도가 달라 직접 비교하지 않는다.
