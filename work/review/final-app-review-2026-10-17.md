# VaultMe 앱 최종 제품 품질 리뷰 (2026-10-17)

Reviewer: Staff Product Designer (consumer fintech) + YC founder 관점. READ-ONLY. 코드, Figma, 시뮬레이터는 건드리지 않았다.

사용한 skills: impeccable (critique + audit, native iOS reference), apple-design, emil-design-eng.
비교 기준: Toss, Coinbase, Revolut, Wise, Phantom (이름만. Mobbin MCP는 로그인이 필요해 쓰지 못했다).

## 1. Verdict

**아직 production grade가 아니다. 가깝다. P1 4건을 닫으면 yes다.**

- P0 없음. 이전 P0 3건은 모두 닫혔거나 owner 예외다.
- 시각 완성도는 높다. 192개 캡처 대부분이 Figma와 거의 같다.
- 남은 문제는 "구조"가 아니라 "마감"이다. 실패 상태(lock-failed), 한글 orphan, 낡은 배경, 스크롤 아래 정보가 남아 있다.
- 돈을 다루는 앱이다. 실패 상태와 위험 화면이 가장 중요한데, 이 화면 중 lock-failed에 버튼이 없다. 이것이 가장 큰 구멍이다.

## 2. 점수 (/10)

| Group | Score | 한 줄 평 |
| --- | --- | --- |
| Onboarding (restore 포함) | 8 | passphrase restore, 다른 주소 경로, 단어 확인(S04)이 Figma와 일치. 일부 캡처가 낡았다. |
| Home | 8 | flat white, 새 아이콘 일치. empty-wallet 버튼 순서는 owner 결정대로. 잔액 숫자 불일치 잔존. |
| Asset detail | 7 | 구조 일치. `asset-detail-restored`는 낡은 캡처. |
| Send input | 8 | keypad, "지우기", 경고 일치. |
| Review + risk | 8 | 위험 sheet, Secondary/Primary 순서, Dark 버튼 모두 일치. pendingblock에 orphan. |
| Results | 8 | test-mode Pending 문구 수정됨. 3-step, 실패 사유, "다시 보내기" 일치. |
| Receive | 7 | receive-sheet 뒤 배경이 옛 Home. orphan 잔존. |
| Activity | 8 | 받은 금액 green, 구분선 일치. |
| Tx detail | 7 | hash, Etherscan 행이 fold 아래. 하단 바에 행이 잘린다. |
| Settings + license | 7 | 라이선스 화면 개선됨. 라이선스 행이 탭 바 아래에 가려진다. 일부 캡처가 낡았다. |
| Brand / lock | 7 | 브랜드 A 적용, 텍스트 색 수정됨. lock-failed가 틀렸다. |
| Dark mode | 8 | 시트 Secondary, handle 수정됨. 복구 문구 패널만 Figma와 반대 명도. |

**Overall: 7.6 / 10** (production grade 기준선은 8.5).

## 3. 이전 P0/P1 상태 (앱 기준)

| ID | 이전 문제 | 상태 | 근거 |
| --- | --- | --- | --- |
| P0-1 | Dark lock 텍스트 `#000` | Fixed | lock, lock-dark 텍스트와 아이콘 정렬 OK |
| P0-2 | test-mode Pending이 "보내는 중" | Fixed | `result-pending-testmode`: "테스트 거래예요", 수수료 행 없음 |
| P0-3 | 실제 BIP39 문구 | Owner exception | §9 결정. 재론하지 않음 |
| P1-1 | sheet가 바닥까지 안 닿음 | Fixed | review-*-sheet 모두 바닥까지 채움 |
| P1-2 | Light `#000` 텍스트/아이콘 | Fixed | 샘플 전체에서 재발 없음 |
| P1-3 | S24 배경이 옛 Home | **Not fixed** | `receive-sheet`: 옛 Home(Sepolia 계정줄, "···", "진행 중") |
| P1-4 | Dark sheet Secondary/handle 안 보임 | Fixed | burn, contract, lookalike sheet dark OK |
| P1-5 | 한글 orphan 줄 | **Partly** | `review-pendingblock`에 "요." orphan (Light, Dark). `receive-sheet`에 "보내세/요." |
| P1-6 | 라이선스 화면 부족 | Fixed | 전문 보기, 파일 없음 페이지 확인 |
| P1-7 | S41 fold 아래 확인 불가 | **Partly** | tx-detail hash/Etherscan 행이 fold 아래. fade 없음 |
| P1-8 | empty-wallet 버튼 순서 | Owner decision | §9 결정 |
| Seamless P0-1 | Home pending refresh loop | Fixed | git log |
| Seamless P0-2 | Busy icon | Fixed | git log |
| Seamless P1s | copy feedback, Review→Result replace, grabber drag, keypad warn, 백업 단어 확인 | Fixed | git log (`63bc485`, `8072783`, `ff36160`, `da0e2d8`). 캡처로는 정적 상태만 확인. 모션은 이 증거로 검증 불가 |

## 4. 새 발견

### P1

**P1-A. lock-failed에 실패 문구와 "잠금 해제" 버튼이 없다.** (Light, Dark)
- 문제: 앱은 일반 lock 문구만 보인다. 버튼이 없다. 사용자는 막힌다. Figma는 실패 문구와 파란 버튼이 있다.
- 수정: 앱에서 failed 상태를 렌더한다. 버튼은 Primary 하나.
- 분류: **app drift** (앱을 고친다).

**P1-B. `review-pendingblock` Banner에 orphan "요."** (Light, Dark)
- 문제: "같은 금액이 두 번 나갈 수 있어/요." 로 끊긴다. Figma는 3줄로 의미 단위 분리.
- 수정: 문장을 의미 단위로 나눈다 (줄바꿈 또는 `word-break: keep-all` 상당 처리). `blocked` 배너도 같은 규칙으로 맞춘다.
- 분류: **app drift**.

**P1-C. `receive-sheet`(및 S24 blocked sheet)의 뒤 배경이 옛 Home이다.**
- 문제: 옛 계정줄, "···" 메뉴, "Sepolia 테스트넷" 라벨, Inline "테스트 데이터예요". 앱 문구에 "보내세/요." orphan도 있다.
- 수정: 새 Home 위에서 캡처한다. 앱 문구 줄바꿈을 Figma의 4줄 분리와 맞춘다.
- 분류: 배경은 캡처/**Figma 쪽 확인 먼저** (Figma 프레임이 새 Home인지 점검). 문구 orphan은 **app drift**.

**P1-D. Tx detail의 hash, Etherscan 행이 fold 아래이고 하단 바에 행이 잘린다.**
- 문제: 핵심 증거(hash)가 안 보인다. 스크롤 가능하다는 단서(fade, 행 일부 노출 패턴)가 없다.
- 수정: 하단 바 위에 8 pt fade를 둔다. 스크롤 후 캡처를 추가한다. Figma에도 "scrolled" 프레임을 추가한다.
- 분류: **design weakness** (Figma 먼저), 그 뒤 앱.

### P2

| ID | 화면 | 문제 | 수정 | 분류 |
| --- | --- | --- | --- | --- |
| P2-1 | Settings | "오픈소스 라이선스" 행이 탭 바 아래에 가려진다. 발견성 낮음 | 하단 inset 확인. Figma에도 행을 보이게 | design weakness |
| P2-2 | settings-device, settings-push, settings-zero, update-required, backup-check, restore, restore-done, asset-detail-restored | 낡은 status bar(12:5x), 옛 탭 아이콘. `restore-done`은 가짜 `0x1a2b…` 주소 | 재캡처 | evidence hygiene |
| P2-3 | home-testnet-sheet | 뒤 배경이 empty-wallet Home. Figma는 funded Home | 같은 데이터로 재캡처 | evidence hygiene |
| P2-4 | Send 입력 vs Home | Send는 1.284658 ETH, Home은 1.284732 ETH. 돈 앱에서 잔액이 다르면 신뢰를 잃는다 | 같은 fixture 사용. 실제 앱에서도 같은 source인지 확인 | app drift (확인 필요) |
| P2-5 | Dark 복구 문구 패널 | 앱 패널이 canvas보다 밝다. Figma는 더 어둡다 | Figma 값을 따른다 (또는 둘 중 하나를 의도로 확정) | design weakness |
| P2-6 | review-rechecking | "비용 / 접기" 행만 보인다. "다시 확인하는 중이에요" 상태는 fold 아래. 비활성 Primary만 보인다 | 상태 문구를 fold 위로. 또는 버튼에 진행 표시 | design weakness |
| P2-7 | Result 영수증 | "네트워크 수수료" 행이 버튼 위에서 잘린다 (Figma도 같음) | 영수증 영역 하단 fade | design weakness |
| P2-8 | `kit` | 화면이 아닌 component 시트. 비교 의미 없음 | 쌍에서 제외 표기 | evidence hygiene |
| P2-9 | review-burn-ack, review-dark | Figma 쌍이 없다 (붉은 placeholder) | Figma 프레임 추가 | design gap |
| P2-10 | Motion | 정적 캡처만으로는 Apple fluid-interface 항목(interruptibility, spring, reduced motion, haptics)을 검증할 수 없다 | 모션 리뷰는 별도 영상 증거로 | 검증 범위 |

## 5. 분석 요약 (lens별)

- impeccable critique: 위계가 명확하다. 금액 > 상태 > 상세 순서. Banner/Inline 2단 알림이 일관된다. Primary는 화면당 하나.
- impeccable audit (native iOS): 터치 영역은 충분하다 (버튼 높이 약 52 pt). 색 대비는 Dark Banner에서 무거운 편이나 허용 범위. Hangul 줄바꿈이 마지막 남은 typography 결함이다.
- apple-design: 위험 sheet에서 안전한 동작("취소")이 Primary. 이 결정은 familiarity와 responsibility 원칙에 맞다. Sheet가 바닥까지 닿아 spatial consistency도 좋다.
- emil-design-eng: 자주 쓰는 화면(Home, Send keypad)에 불필요한 모션 증거가 없다. 단, 정적 증거로는 press feedback과 easing을 확인하지 못했다 (P2-10).

## 6. 증거 범위

- 앱 캡처 192개 (Light 100, Dark 92)를 모두 확인했다.
- Figma 쌍이 있는 것: 187개. 앱 전용: 5개 (`asset-detail-restored`, `kit-dark`, `review-burn-ack`, `review-burn-ack-dark`, `review-dark`).
- 방법: 2쌍씩 묶은 contact sheet 96장 (s000–s095)을 모두 열어 비교했다.
- 비교 한계: 앱 402 pt, Figma 390 pt (알려진 차이).
- 알려진 비결함: "테스트 데이터" chip (fake chain).

## 7. 닫아야 할 순서

1. P1-A lock-failed (앱).
2. P1-B pendingblock orphan, P1-C 문구 orphan (앱).
3. P1-D Tx detail fold (Figma 먼저).
4. P1-C 배경, P2-2/P2-3 재캡처.
5. P2-4 잔액 source 확인.
