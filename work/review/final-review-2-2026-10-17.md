# VaultMe 최종 제품 리뷰 2 (Staff Product Designer + YC founder) — 2026-10-17

READ-ONLY. 코드, Figma, simulator는 바꾸지 않았다. commit 하지 않았다.
Skills: impeccable (critique, 앱은 Operate 모드), emil-design-eng (모션은 정지 캡처로 채점하지 않음), design-taste-frontend (landing용. 법칙만 사용: 한 accent, 큰 숫자, 쉼 1곳).
기준: stack-line.dev, `outputs/VaultMe-DESIGN.md` Design principles.
근거: `work/compare/*-app.png` (Light 직접 열람 약 14장), 코드 `apps/mobile/src` 확인, 이전 리뷰 3건, `redesign-b.md` §9.3.

## 1. 판정

| 질문 | 답 |
|---|---|
| Foundation이 건전한가 | **예** |
| 이 PR을 ship 해도 되는가 | **예, 조건 1개.** 오래된 캡처 54장을 다시 찍는다 (아래 P1-A). 코드는 막지 않는다. |
| 전체 점수 | **8.0 / 10** (이전 7.0) |

한 줄: 시각 foundation은 이제 일관된 한 시스템이다. accent 1개, chip 1개, mono 사실 라벨, flat white + 12 px 띠. 남은 문제는 구조 3개와 증거 1개다.

## 2. 점수 /10 (group별)

| Group | 이전 | 지금 | 이유 |
|---|---|---|---|
| Home (채움) | 7 | 8 | 숫자 위계 강함. hero와 첫 행 중복 사라짐 ("다른 자산"). 링크는 Ink + 밑줄. |
| Home (빈 지갑) | 6 | 6.5 | 받기가 Primary로 바뀜. faucet 행이 아직 가장 약한 무게다. |
| Asset detail | 6 | 7.5 | mono 사실 블록이 주인공이 됨. 파란 info 아이콘이 accent 규칙을 살짝 어긴다. |
| Send amount | 6.5 | 7.5 | 금액, 칩, 키패드가 엄지 영역에 한 열로 붙음. 위쪽 큰 쉼 1곳은 설계된 쉼으로 읽힌다. |
| Review + risk sheet | 8 | 8.5 | 비용 블록과 총 차감액이 첫 viewport 안으로 들어옴. 이 제품의 최고 화면이다. |
| Result | 7 | 8 | 실패에서 "다시 보내기"가 Primary. 성공 hero와 3단계 선이 있다. |
| Receive | 7 | 7 (증거 오래됨) | 코드는 새 규칙을 따른다. 캡처는 옛 상태다. |
| Activity | 7 | 8 | chip 1개. 날짜 묶음과 상태가 깔끔하다. |
| Tx detail | 6.5 | 7 (증거 오래됨) | 코드에 Fact hash가 있다(ca24090). 캡처로 확인하지 못했다. |
| Settings | 7 | 6.5 (증거 오래됨) | 캡처가 옛 amber chip과 "0원 거래 표시"를 보인다. |
| Start / Lock | 6.5 | 8 | 약속 문구 ("계정 없이, 열쇠는 이 기기에만 둬요"), mono 사실 한 줄, 브랜드 마크. |
| Backup / Restore | 7 | 6.5 | Restore가 아직 굵은 outline 12칸 + 검정 pill + 파란 링크다. foundation 규칙과 어긋나는 마지막 화면이다. |
| Dark | 7.5 | 8 (일부 증거) | 이식 양호. |
| **Overall** | **7.0** | **8.0** | |

축별 (foundation 7축)

| 축 | 점수 | 한 줄 |
|---|---|---|
| 위계 | 8.5 | 큰 숫자 700 + 조용한 400. 돈이 나가는 총액은 굵게. |
| accent 규율 | 8 | 파랑은 Primary, 선택 탭. 예외는 아래 P1-B. |
| 레이아웃 구조 | 7.5 | 엄지 영역 규칙이 선다. Start와 빈 Home의 쉼이 2곳이다. |
| IA | 8 | 중복 제거, 사실 블록, 백업 timing 절충안. |
| type system | 8.5 | Pretendard + Plex Mono 사실 라벨이 시스템이 됨. |
| component 논리 | 8.5 | chip 1개, Primary = 가장 가치 있는 행동, 안전 쪽 Primary. |
| 일관성 | 7.5 | 새 화면은 일관되다. 오래된 증거와 Restore가 깬다. |

## 3. 이전 foundation finding 상태 (APP 기준)

| # | 이전 finding (출처) | 상태 | 앱 근거 |
|---|---|---|---|
| F1 | accent 규율 부재 (Staff PD, Analyst #1) | **대부분 고침** | `home-app`: 링크 Ink + 밑줄, 받은 금액 Ink + "+", chip 중립. 남은 누수: `restore-app` 파란 "붙여넣기", `asset-detail-app` 파란 info 아이콘. |
| F2 | 헤더 chip 2개 (Staff PD F2, Analyst #2, Founder #6) | **고침** | 코드 `NetworkChips`가 chip 1개. `activity-app`, `send-s20b-amount-app`, `result-*` 모두 "Sepolia" 하나. |
| F3 | mono 사실 라벨 체계 없음 (Staff PD F3) | **고침 (부분 증거)** | `start-app` mono 한 줄, `result-confirmed-app`와 `asset-detail-app`의 네트워크 · chainId · 컨트랙트. tx hash는 코드에 있으나 캡처가 오래됨. |
| F4 | 빈 공간 설계 없음, 총액이 fold 아래 (Staff PD F4) | **부분 고침** | Review는 고침 (`review-app`: 비용, 총 차감액, CTA 한 viewport). Send는 고침. Start는 쉼이 2곳. 빈 Home은 아래가 비어 있다. |
| F5 | 실패 결과 버튼 위계 (Staff PD F5) | **고침** | `result-failed-app`: "다시 보내기" Primary, "확인" Secondary. |
| F6 | 정보 반복, 자산 상세 주인공 없음 (Staff PD F6) | **고침** | Home은 "다른 자산"에 USDC만. `asset-detail-app`은 사실 블록. |
| Y1 | 받기 전 백업 장벽 (Founder #1) | **절충안 구현 (코드), 증거 오래됨** | §9.3 "백업 시점 Q14 변경". 커밋 80b8af0. `receive-backup-app`은 옛 캡처다. |
| Y2 | 빈 Home 중심 행동 (Founder #2) | **부분** | 받기 Primary는 됨. faucet 행은 회색 "QuickNode" + 작은 설명으로 여전히 약하다. |
| Y3 | 제품 약속 시작 화면 (Founder #4) | **고침** | `start-app`: "계정 없이, 열쇠는 이 기기에만 둬요. 보내기 전에 받는 주소와 수수료를 전부 보여 줘요." |
| Y4 | 검토 화면 중심 (Founder #3) | **고침** | 위 F4. 예상 도착 시간은 측정 전이라 넣지 않음. 맞다. |
| Y5 | 결과 화면 순간 (Analyst #4, Staff PD P2) | **고침** | `result-confirmed-app`: 큰 hero + 체크 + 3단계. 모션은 정지 캡처로 확인 못 함. |
| A1 | Restore 12칸 outline (Analyst #3, Staff PD C2) | **고치지 않음** | `restore-app`: 굵은 회색 outline 12칸, 검정 "12단어" pill. |
| A2 | 위험 행 위계 (Staff PD C3) | **미확인 / 증거 오래됨** | `settings-app`은 14:41 캡처. |
| Y6 | USDC 보내기, QR 스캔 | **범위 밖** | 오너가 다음 이슈로 확정. |

## 4. 남은 FOUNDATION 문제

### P0
없음. 돈과 안전 구조 (전체 주소, 위험 sheet, 이중 송금 차단)는 맞다.

### P1-A. 증거가 오래됐다 (ship 조건)
- `work/compare/*-app.png` 중 **54장**이 폭 390 pt이고 11:46–12:30에 찍혔다. foundation 커밋(19:27, 19:42) 이전이다.
- 예: `receive-app`은 chip 2개 + 4자 묶음 주소다. `tx-detail-confirmed-app`도 amber chip. `settings-app`(14:41)은 amber chip + "0원 거래 표시".
- 코드는 이미 새 규칙이다 (`NetworkChips` 1개). 그러니 앱이 틀린 것이 아니라 비교 증거가 거짓이다.
- AGENTS rule 4는 변경된 화면마다 pair를 요구한다. **고침**: receive, tx-detail, review-*, activity-*, send-recipient, result-failed-reason, settings를 Light + Dark 다시 찍는다. 코드와 Figma는 건드리지 않는다.

### P1-B. 마지막 accent 누수 (Figma 먼저)
- 규칙: 파랑은 Primary와 선택 탭만. 지금: Restore "붙여넣기" 파란 글자, Asset detail 파란 info 아이콘.
- **Figma 먼저**: `B/Link` 변형을 Ink + 밑줄로 고정, info 아이콘은 `icon/secondary`. 앱은 그 뒤.

### P1-C. 입력 시스템이 둘이다 (Figma 먼저)
- Restore 12칸만 굵은 outline이고, 선택 pill만 검정이다. 나머지 앱은 borderless + 회색 chip.
- 입력 인지는 선이 허용되지만 굵기와 반경이 앱 안에서 유일하다.
- **Figma 먼저**: `B/Secret grid`를 얇은 border + focus만 강하게 (또는 밑줄). 12/24 선택은 회색 chip + 선택 시 Ink 글자로 통일.

### P1-D. 빈 Home의 중심 행동 (Figma 먼저)
- 빈 지갑에서 가장 가치 있는 행동은 첫 입금이다. 받기 Primary는 맞다. faucet 행은 아래 쪽 회색 한 줄로 "정보"처럼 읽힌다. 큰 빈 공간이 아래에 남는다.
- **Figma 먼저**: faucet를 `B/Row` 일반 행(아이콘 + 제목 + chevron, 전체 탭 영역)으로 올리고, 중앙 정렬 빈 상태와 좌측 정렬이 섞이지 않게 한 방향으로 통일한다.

### P2 (구조라기보다 정리)
- Start의 쉼이 2곳 (로고 위, 문구와 버튼 사이). 로고 블록을 중앙 쪽으로 모으면 1곳이 된다.
- "0원 거래 표시"의 "원"은 KRW다. 신뢰 문구라 "0 값 거래 표시"가 맞다. (Founder 부록, 아직 고쳐지지 않음.) copy 변경이므로 Figma 먼저.

## 5. Mobbin 비교 (doc 용도, iOS)

| 화면 | 우리 | reference | 판단 |
|---|---|---|---|
| Home | `home-app` | [Base Home](https://mobbin.com/screens/48bc079c-d8a7-4bb9-87e8-a1097ab4fee9), [OKX Home](https://mobbin.com/screens/70683897-8c70-4802-a48b-0d57746b8fb0), [Glow](https://mobbin.com/screens/c5a37082-7e64-48f5-bbc0-1fb81a6eba1f) | 우리 숫자 위계가 더 크고 조용하다. 광고, 탭 줄, 배너가 없다. 4-action 그리드가 없는 것은 범위상 맞다. |
| Review | `review-app` | [Wise Confirm](https://mobbin.com/screens/676d6d79-fb58-4dff-a517-af056631e589), [Monzo Review](https://mobbin.com/screens/7abf22e6-277e-4bea-9127-cda91d619bba), [Revolut Review](https://mobbin.com/screens/bbb103e7-3764-40f6-bc45-e71294fd7ee7) | 구조는 같은 label-value 표. 우리는 전체 주소와 "형식만 확인" 문구가 더 정직하다. Revolut의 "도착 예정"은 측정이 없어 쓰지 않는다. |
| Result | `result-confirmed-app` | [World App Send](https://mobbin.com/screens/e4bb22ae-adf1-46d5-b3aa-2aaddb65aa81), [Apple Wallet](https://mobbin.com/screens/25fc692d-19a1-4de4-a63f-b0a6ecca0bd6), [ANZ Plus](https://mobbin.com/screens/af6ea053-b36a-401e-bbb4-a21346160512) | 같은 한 호흡 구조 (체크 + 문장 + 큰 금액 + 버튼 1개). 우리는 3단계 선 + 주소 + 수수료까지 있어 정보가 더 많다. 감정은 비슷한 수준이다. |
| Tx detail | `tx-detail-confirmed-app` (오래됨) | [Shopee 상세](https://mobbin.com/screens/852d7e42-02a0-4c2e-8b33-e2f7420df2dd) | label-value 행에 mono 값, 복사 행동. 우리 구조와 같은 계열. 새 캡처 후 재평가. |
| Receive | `receive-app` (오래됨) | [Base](https://mobbin.com/screens/f59bdad5-e979-49fa-9222-a94c161a4144), [PayPal](https://mobbin.com/screens/4320e80a-afa6-44dc-a9a6-317ad8a44a24), [Solflare](https://mobbin.com/screens/cab7112b-0cdb-4135-a50e-072424e0ab69) | Solflare의 "이 주소는 Solana 자산만 받아요" 한 줄 + 복사/공유 동급 버튼이 기준이다. 우리 안내 문장은 작은 회색이다. 새 캡처에서 크기를 확인한다. |
| Restore | `restore-app` | [Phantom Import](https://mobbin.com/screens/c0a864b3-83cc-4a65-a01f-b45bf94cdeec) (이전 리뷰에서 확인) | 12칸 outline이 가장 무겁다. P1-C. 이번에는 Mobbin 재검색을 하지 않았다. |

Mobbin 안내 (원문):

---

**Your Mobbin AI usage is high this month**

Usage is unlimited during beta. If your usage stays at this level, you may need to purchase more credits once limits take effect. [View usage and plan options](https://mobbin.com/settings/billing-and-usage)

## 6. 한계
- 열람한 캡처: home, home-empty-faucet, asset-detail, send-s20b, review, result-confirmed, result-failed, tx-detail, receive, restore, settings, activity, start. Dark는 직접 열람하지 않았다 (파일 쌍 존재만 확인).
- Figma PNG와의 1:1 대조는 하지 않았다 (품질 리뷰 목적). 모션과 haptics은 평가하지 않았다.
- 오래된 캡처 화면은 코드 구조 (`NetworkChips`)로만 판단했다. 실제 렌더는 재캡처가 필요하다.
- 점수는 개인 판단이다.

## 부록: 픽셀 수준 (5줄)
- 빈 Home faucet 설명 12 px 회색은 15 px로 (돈 관련 문장 규칙).
- Settings 마지막 행 "오픈소스 라이선스"가 탭 바에 가린다 (settings-app 오래됨, 재확인).
- Review의 "다시 확인" 링크 들여쓰기가 info 줄과 다른 열이다.
- Send 금액 위 큰 공백은 의도된 쉼이지만 title과 금액 간격 최소값을 문서화.
- Start의 mono 한 줄은 좌측 정렬, 나머지는 중앙 정렬이다. 한 방향으로.
