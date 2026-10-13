# Make Kit 대조 (S01–S92)

> 출처: Make Kit 현재 버전 `App.tsx` 스냅샷 (2026-10-12, 3448줄). Version 27과 다를 수 있음 (이후 swap 자산 선택·코인 로고 수정이 있었음).
> `./wallet/data`는 없음. 사용처에서 추론한 항목은 "확인 필요"로 표시.
> 복구 구문 샘플 상수(`SAMPLE_PHRASE`)는 399줄에 있음. 단어는 이 문서에 복사하지 않음.

## 1. 요약

- ux-flow.md 화면은 25개 (S01–S06, S10–S11, S20–S24, S30–S31, S40–S41, S50, S60–S63, S90–S92).
- 재사용 0 / 수정 15 / 신규 10. 화면 단위로 "그대로 재사용"은 없음.
- 컴포넌트 단위 재사용 후보: `Button`(263), `Notice`(316), `Switch`(343), `Select`(128), `ReviewRow`(1347), `OptionList`(1771), `useCopy`(295), `StatusNotice`(1594).
- 모든 화면이 멀티체인(5 chain), USD 평가금액, 시뮬레이션 상태(ready/pending/confirmed) 전제. Sepolia 단일 체인 + `Unavailable`로 바꿔야 함.
- OS 인증 호출, 캡처 차단, Push, QR 카메라 스캔은 코드에 없음 (모두 시뮬레이션이거나 부재).

## 2. 화면 매핑

Screen 타입 값: `onboarding | locked | home | asset | receive | send | review | swap | swap-review | activity | tx | settings` (68–80줄).

| ID | Make Kit 위치 | 줄 | 판정 | 차이 (ux-flow.md 기준) |
|---|---|---|---|---|
| S01 시작 | `Onboarding` step `welcome` | 495–550 | 수정 | 생성/가져오기 선택 2개는 있음. 문구가 "Ethereum, Bitcoin, Solana, Tron, XRP" 멀티체인(385)·"Prototype with synthetic data"(394). Sepolia 기준으로 교체. 루팅 경고 선행 진입 없음. |
| S02 책임 안내 | 없음 | - | 신규 | 자가수탁·복구 불가·알림으로 복구 구문 요청 안 함 문구 화면 없음. 유사 문구는 "Prototype only" 박스(640–650, 827–837)와 Settings Notice(2819–2822)뿐. |
| S03 복구 구문 표시 | `Onboarding` step `create` | 662–715 | 수정 | 12단어 그리드 + Show/Hide 토글은 있음. 캡처 차단 없음, OS 인증 없음, 앱 전환 가림 없음, S3 이탈 시 state 삭제는 `goTo`(451–459)에서 부분 구현. 온보딩 안에서 바로 표시됨 (Q14는 Home 먼저, 백업은 수신 전). Prototype 문구 제거 필요. |
| S04 일부 단어 확인 | `Onboarding` step `verify` | 552–613 (로직 404–412, 467–480) | 수정 | 3개 위치 4지선다는 있음 (`VERIFY_POSITIONS`, 404). 틀리면 같은 화면 유지는 맞음. 성공 후 `lock` 단계로 이동(479) → 제거하고 "백업 완료 기록 → S30"으로. 백업 완료 기록 없음. |
| S05 복구 입력 | `Onboarding` step `import` | 716–824 | 수정 | 12/24 선택(737–752), 단어별 입력(753–775), 전체 붙여넣기(436–447) 있음. passphrase 입력칸 있음(786–823) → Q40은 입력 없이 안내 문구만. 형식 오류 검사는 빈칸 개수만(482–493), BIP39 단어·체크섬 검증 없음 (확인 필요: data 쪽 검증 없음). 문구 "Import always opens the same sample vault"(834) 제거. |
| S06 복구 결과 | 없음 | - | 신규 | 가져오기 성공 → 바로 `lock` 단계 → Home(482–493, 3182–3191). 전체 주소·첫 계정 경로 안내 화면 없음. |
| S10 Home | `Home` | 1184–1345 | 수정 | 아래 3절 참조. C23 평가금액이 USD 합계(1234), 자산 검색·5체인 목록·Swap 버튼 있음. 백업 안내는 항상 "backed up (test)"(1331–1342), 미완료 상태 없음. |
| S11 자산 상세 | `AssetDetail` | 1364–1482 | 수정 | Send/Receive/Swap 3버튼(1407–1420) → Swap 제거. USD 단가·≈USD(1404, 1445)·token contract·network paused 안내(1422–1431) 정리. 관련 활동 목록(1467–1478)은 재사용 가능. |
| S20 송신 입력 | `SendSelect` | 1890–2139 | 수정 | 체인·자산 선택 OptionList 2개(2010–2051) → Sepolia 고정, 자산은 ETH/USDC만. 수신자 textarea + 붙여넣기 경고(1869–1874) 있음(좋음). Max 버튼은 소수 8자리로 자름(2099) → full precision 아님. 수수료 부족 검사(1939–1949) 있음, 수수료 상한(cap)·절대 상한 없음. Pending/Unknown 차단 없음. rooted면 송신 막음(1986–1996) → S92는 경고만. 4글자 분할 주소 없음. |
| S21 QR 스캔 | `SendSelect.scan()` | 1975–1984, 2067–2071 | 신규 | 카메라 없음. 900ms 뒤 샘플 주소를 채우는 시뮬레이션. 별도 화면·권한 거부·형식/chain 불일치 경고 없음. |
| S22 Review | `SendReview` | 1652–1769 | 수정 | From/To/Network/Asset/Amount/예상 수수료 있음. 없음: 최대 수수료(상한), 업데이트 시각+재계산, 첫 수신자 경고, 유사 주소 경고+명시 확인, native 수수료 부족 경고, "신원 보증 안 함" 문구. 주소는 전체 표시하나 4글자 분할 아님(1698) 대신 앞뒤 6자 비교 안내(1700). Amount 옆 USD 추정(1689, 1714, 1718). `LARGE_AMOUNT_USD` 체크박스(1676, 1728–1737) 제거. OS 인증 단계 없음, 버튼이 "Simulate send"(1763). |
| S23 송신 결과 | `StatusNotice`(Review 안) + `TxDetail` | 1594–1627, 1742–1751 | 수정 | 별도 화면 없이 Review 화면 안 상태 박스. ready/pending/confirmed 3단계만(81, 1576–1592). Unknown/Included/Failed/Replaced 문구 없음. 문구가 "Local simulation"(1584). 완료 후 Push opt-in(S50) 분기 없음. |
| S24 송신 차단 | 없음 | - | 신규 | Pending/Unknown 존재 검사 없음. `simulateSend`(3089)는 `status !== "ready"`만 확인. |
| S30 수신 | `Receive` | 1484–1574 | 수정 | 체인 선택 OptionList(1527–1542) 제거 → Sepolia 고정. 복사·공유 있음(1556–1565, 1501–1513). QR은 placeholder(1545–1548) → 주소 QR 필요 (확인 필요: QR 생성은 코드에 없음, 규칙상 지어내지 않음). 주소 4글자 분할 없음(1553). "Sepolia로만 보내세요" 문구는 `Only send {chain.name} network assets`(1523)로 유사. 백업 게이트 없음, 첫 진입 Push(S50) 없음. |
| S31 수신 전 백업 요구 | 없음 | - | 신규 | 백업 상태 값 없음. `backup` state는 `created|imported` 구분뿐(2979). |
| S40 내역 | `Activity` | 2553–2645 | 수정 | 날짜 그룹(`groupByDay`, 1173)·빈 상태(2629–2631) 있음. 4개 필터(Network/Asset/Type/Status, 2576–2585) 중 Network·Swap·Type 정리. 0원 거래 숨김 없음. 조회 실패 cache+재시도는 Home의 Tron 전용(1277–1288) → 일반화 필요. |
| S41 거래 상세 | `TxDetail` | 2647–2747 | 수정 | 상태 박스·재조회("Check now", 2695–2700)·마지막 확인 시각 일부 있음. explorer 링크는 토스트만(2733–2740), 실제 링크 아님. Replaced/Included 상태 없음. "마지막 확인 시각" 없음 (Requested/Confirmed 시각만, 2717–2722). tx.id 전체 표시는 있음. |
| S50 Push opt-in | 없음 | - | 신규 | 알림 관련 UI 없음 (`NOTICES`는 공지 목록, 2830). |
| S60 Settings | `Settings` | 2751–2931 | 수정 | 유지: 보안 섹션 구조·Switch. 제거: 가짜 App lock 스위치(2796), Operations(admin)·체인 on/off(2859–2883), Provider status(2885–2906), Audit log(2908–2926), "Simulate rooted"(2812), "Remove sample vault"(2845). 추가: S61/S62/S63 진입 행. |
| S61 복구 구문 다시 보기 | 없음 | - | 신규 | OS 인증 후 표시 흐름 없음. S03 UI(phrase-card)를 재사용 가능. |
| S62 알림 설정 | 없음 | - | 신규 | `Switch`(343–376) 패턴 재사용 가능. |
| S63 0원 거래 표시 | 없음 | - | 신규 | `Switch` 재사용 가능. |
| S90 잠금 | `LockScreen` | 2933–2968 | 수정 | 레이아웃 재사용 가능. 버튼이 "Unlock (simulated)" 900ms 타이머(2957–2960). 진입은 Settings "Lock now"(3419–3422) 수동뿐. 30초 백그라운드·앱 재시작·기기 잠금 트리거 없음. 생체 실패 → 기기 암호 대체 없음. |
| S91 업데이트 필요 | 없음 | - | 신규 | `426` 처리 없음. |
| S92 루팅·탈옥 경고 | `Notice` in `Home` + Settings 스위치 | 1224–1228, 2812–2817 | 수정 | 경고 박스는 있음(danger 톤). 시뮬레이션 스위치로만 켜짐. 문구가 "Sending and swapping are limited"(1226) → 사용을 막지 않음으로. Send 버튼 비활성(1240), `SendSelect` 차단(1986) 제거. 첫 실행 전용 화면·"Settings에서 다시 보기" 없음. |

판정 합계: 재사용 0, 수정 15, 신규 10.

## 3. 화면별 상세 메모

### S10 Home 차이 (1184–1345)

| 항목 | Make Kit | 목표 |
|---|---|---|
| 평가금액 | `formatUsd(total)` 합계(1210–1234), "Complete/Partial estimate" | `Unavailable` + "Testnet 자산은 시장 가격이 없어요" |
| 자산 목록 | 5체인 `ASSETS` 전부, 검색(1263–1276) | ETH + USDC 두 줄, 검색 없음 |
| 행 | `AssetRow` ≈USD(1093) | 수량만 |
| 조회 실패 | Tron만 `tronState`(1277–1288) | 전체 cache + 시각 + 재시도 |
| 백업 안내 | 샘플 문구 고정(1331–1342) | 미완료 시 1개 |
| 버튼 | Send / Receive / Swap | Send / Receive |

### 컴포넌트 매핑 (C01–C28 중 코드에서 확인된 것만)

| 코드 | 줄 | 대응 C번호 (주석 근거) |
|---|---|---|
| `Button` | 263 | C01 |
| 입력 필드 `field__input` | 758, 806 | C03 (주석 757) |
| `AssetRow` | 1066 | C09 (주석 1079) |
| `ActivityRow` | 1131 | C10 (주석 1137) |
| `RecipientField` | 1811 | C12 (주석 1843) |
| amount-field | 2077 | C13 (주석 2078) |
| `Notice` | 316 | C25 계열 (주석 없음, 확인 필요) |
| `StatusNotice` | 1594 | C05/C28 유사 (확인 필요) |
| 백업 박스 `backup-notice` | 640, 1331 | C19 유사 (확인 필요) |
| portfolio 블록 | 1230–1238 | C22/C23 유사 (확인 필요) |

## 4. 첫 버전 범위 밖 기능 (제거 대상)

| 기능 | 줄 |
|---|---|
| Swap 전체: `Swap`, `SwapReview`, `QuoteRows`, `swapBreakdown`, `useCountdown`, 상수 `QUOTE_SECONDS`/`SLIPPAGE_OPTIONS`/`SERVICE_FEE`/`LIQUIDITY_LIMIT_USD`, 타입 `Quote` | 2141–2549 |
| Swap 화면 타입·제목·탭 | 76–77, 869–870, 1041 |
| Swap 상태/핸들러: `swapFrom/To/Amount/slippage/quote/swapStatus`, `resetSwap`, `refreshQuote`, `simulateSwap` | 3000–3005, 3073–3077, 3117–3153 |
| Swap 렌더/이동 | 3349–3394, 3062, 3255, 3283–3290 |
| Swap 버튼·안내 (Home, AssetDetail) | 1248–1251, 1416–1419, 1427–1431, 1391 |
| Swap 거래 표시 (`txTitle`/`txAmount`/ActivityRow/Activity 필터/TxDetail) | 1119, 1125–1127, 1132, 1148–1150, 2579, 2690, 2705, 2723 |
| `SWAP_UNSUPPORTED`, `Select`(Swap·Activity 필터 외 사용처 없으면) | 52, 128–261 (Activity 필터가 쓰므로 유지 여부는 S40 설계에 따름) |
| BTC/SOL/XRP/TRX/USDT 로고 import 및 맵 | 42–46, 90–94 |
| 멀티체인 전반: `CHAINS`, `ChainId`, `chainOf`, `DEFAULT_ENABLED`, `enabled` state, 체인 선택 OptionList (Receive·Send), 체인 필터 | 49, 62, 84, 1527–1542, 2010–2029, 2577, 2970, 2982, 3427–3430 |
| Tron 전용 부분 실패 로직 (`tronState`, `tronUpdated`, `retryTron`, Tron 알림) | 1064, 1210–1213, 1277–1288, 2778, 2984–2985, 3155–3162 |
| USD 평가금액·`price`·`formatUsd` 사용처 | 1093, 1234, 1404, 1445, 1689, 1714, 1718, 2108, 2120, 2279 |
| `LARGE_AMOUNT_USD` 대액 송금 로직 및 `Acknowledge` | 85, 1629–1650, 1676, 1728–1737, 1757 |
| 검색창 (자산 검색) | 1209–1219, 1263–1276, 1290–1293 |
| 앱 잠금 선택 단계 (`lock` step, `lockChoice`, `lock` state) | 378, 416, 552–660 중 lock 분기, 2980, 3184 |
| passphrase 입력 | 423, 425, 786–823 |
| Settings admin: 체인 on/off, provider status, audit log, rooted 시뮬레이션, 샘플 vault 제거 | 2774–2781, 2812–2817, 2845–2853, 2858–2926, 2987, 3039–3041 |
| Drawer 메뉴 ("All networks · 5 supported" 문구 포함) | 929–1029, 1004 |
| Welcome 문구의 멀티체인·prototype 안내 | 381–397 |
| "Simulate" 시뮬레이션 로직 전반 (`simulateSend`, `SimulationStatus`, 가짜 tx id, 잔액 가감) | 81, 1576–1592, 3089–3115 |
| 테스트용 샘플 데이터 import: `SEED_TXS`, `NOTICES` | 51, 50, 2830 |

## 5. 현재 전환 (edge list)

`go()`는 history에 push, `navigate()`는 history 초기화.

| 출발 | 도착 | 조건/줄 |
|---|---|---|
| onboarding.welcome | onboarding.create / import | 525, 536 |
| onboarding.create | onboarding.verify | "I've saved my phrase" (845), 먼저 Show 눌러야 함(844) |
| onboarding.verify | onboarding.lock | 정답(479) |
| onboarding.import | onboarding.lock | 단어 모두 입력(492) |
| onboarding.lock | home | `finish` 1200ms 후(461–465, 3182–3191) |
| onboarding 각 step | 이전 step | 뒤로 가기(560, 670) |
| home | send / receive / swap | 버튼(3253–3258) |
| home | activity | See all(3256) |
| home | asset | 자산 행(3248–3251) |
| home | tx | 활동 행(`openTx`, 3212) |
| asset | send / receive / swap | 3271–3290 |
| asset | tx | 3270 |
| send | review | `onContinue`(3323) |
| review | 이전(send) | Cancel `back`(3335) |
| review | home | Done(3336–3339) |
| review | tx | View details(3340–3346) |
| swap | swap-review | 3375 |
| swap-review | 이전 / activity | Cancel / Done(3388–3391) |
| activity | tx | 3395 |
| settings | locked | Lock now(3419–3422) |
| locked | 이전 화면 또는 home | Unlock(3200–3206) |
| settings | onboarding | Remove sample vault(`signOut`, 3164–3176) |
| 전역 | home/send/swap/activity | 하단 탭(`Navigation`, 1031–1062) |
| 전역 | receive / activity / settings | Drawer(1012–1025, 3227–3236) |
| 전역 | receive | AppBar QR 아이콘(921, 3224) |
| 전역 | 이전 | AppBar 뒤로(894, 3223) |

## 6. ux-flow.md §3–§7 대비

### 없는 전환 (신규 필요)

| 흐름 | 없는 edge |
|---|---|
| §3 | S01 → S92 (루팅·탈옥 탐지 시 먼저) |
| §3 | S01 → S02 (새 지갑/기존 지갑 각각) |
| §3 | S02 → 12단어 생성 + keychain 저장 → S10 (백업 미완료) |
| §3 | S05 → S06 → S10 (복구 결과 화면) |
| §4 | 수신 진입 / Home 백업 안내 → 백업 완료 확인 → S31 |
| §4 | S31 → OS 인증 → S03 (실패 시 S31 유지) |
| §4 | S04 맞음 → 백업 완료 기록 → S30 |
| §5 | 송신 버튼 → Pending/Unknown 확인 → S24 |
| §5 | S20 → S21 (QR) 및 권한 거부·형식 오류·chain 불일치 복귀 |
| §5 | S22 → 유사 주소 명시 확인 → S22 |
| §5 | S22 확인 → OS 인증 → 서명·제출 (실패 시 S22) |
| §5 | 제출 → 상한 초과 → S22 / 절대 상한 초과 → 송신 차단 경고 |
| §5 | S23 → 첫 송신 + 알림 미설정 → S50 |
| §6 | 첫 진입 + 알림 꺼짐 → S50 |
| §7 | S50 → OS 알림 권한 → OS 인증 → SIWE 서명 → 구독 완료 |
| §7 | 알림 탭 → (잠금 시 S90) → 서버 재조회 → S41 / S10 |
| §9 | 30초 백그라운드·앱 재시작·기기 잠금 → S90 |
| 기타 | Settings → S61 / S62 / S63, S91 |

### 있지만 목표에 없는 전환 (제거)

| edge | 이유 |
|---|---|
| welcome → … → verify → lock → home | 잠금 선택 단계는 OS 인증만 쓰므로 제거. 백업 확인도 온보딩이 아닌 Home 이후로 이동. |
| home/asset → swap, swap → swap-review → activity | Swap 제외. |
| home → asset(검색/멀티체인 자산) | 자산 두 줄만. 상세는 유지. |
| Drawer 전역 메뉴 | 목표 화면에 없음. 확인 필요: 첫 버전 내비게이션 구조는 ux-flow.md에 정의 없음. |
| settings → onboarding (Remove sample vault) | 목표에 없음. |
| send의 체인 선택, receive의 체인 선택 | Sepolia만. |
| Settings admin 토글이 send/receive를 비활성화 | 제거. |
| rooted → Send 비활성(1240), `SendSelect` 차단(1986) | S92는 경고만, 사용은 막지 않음. |
| review → home(Done) / review → tx(View details) | 존재는 타당. 결과 화면(S23)을 따로 두면 경로 변경 필요. |

## 7. TxStatus 매핑

`TxStatus`는 `./wallet/data`에서 import(64). 값은 `TX_STATUS_COPY` 키(1109–1115)와 `TxDetail` 분기(2671–2679)에서 5개로 추론됨: `pending`, `processing`, `confirmed`, `failed`, `unknown`. 정의 파일 없음 (확인 필요).

별도로 송신 흐름용 `SimulationStatus` = `ready | pending | confirmed`(81).

| 목표 상태 | Make Kit | 비고 |
|---|---|---|
| Draft | `SendSelect` 입력 중 (state 없음) | `SimulationStatus.ready`는 Review 화면의 "Ready to simulate"(1577) |
| Reviewing | `review` 화면 + `ready` | 같은 값 |
| Authenticating | 없음 | OS 인증 호출 없음 |
| Submitting | `SimulationStatus.pending` (1590 부근, 3095) | 로컬 타이머 1600ms(3109–3114). 실제 제출 아님 |
| Pending | `TxStatus.pending` "Pending" (1110) | 일치 |
| Unknown | `TxStatus.unknown` 라벨 "Not final yet" (1114) | 문구 "다시 보내지 말고…"와 유사(2676). 5초 자동 재조회(2665–2669). 라벨 변경 필요 |
| Included | `TxStatus.processing` "Processing" (1111) | 본문 "Included and waiting for confirmations"(2673). 라벨을 Included로 |
| Confirmed | `TxStatus.confirmed` | 일치 |
| Failed | `TxStatus.failed` | 본문에 "수수료는 사용됐을 수 있음"과 같은 취지(2675) |
| Replaced | 없음 | 신규 |

SEED_TXS가 실제로 어떤 status를 쓰는지는 확인 필요 (data 없음). 낡은 `tx.fee`는 문자열(2714, 3103) — 최대 수수료(상한) 필드 없음.
