# VaultMe seamless interaction 검수 (Staff Product Designer)

날짜: 2026-10-17 · 검수자: Staff PD (consumer fintech) · 범위: read-only (앱 코드, Figma, simulator 변경 없음)
기준 commit: `caf8f51` (worktree `vaultme-wt-54`)

## 1. 결론

**판정: 부분적으로 seamless (Partly). 종합 6.8/10.**

- 보내기 경로의 안전 순간(trust moment)은 경쟁사보다 좋습니다. 이유가 있는 마찰만 있습니다.
- 끊김은 "보낸 다음"에 있습니다. Home이 진행 중 거래를 갱신하지 않습니다. 새 보내기가 막힌 채로 남을 수 있습니다.
- 돈이 움직이는 순간의 feedback이 약합니다. Busy 상태 icon이 돌지 않습니다. 전송 접수 순간에 haptic이 없습니다.
- 복사 feedback은 haptic과 screen reader 안내뿐입니다. 눈으로 보이는 확인이 없습니다.

## 2. 근거와 방법

- 코드: `apps/mobile/app` (expo-router), `apps/mobile/src/pages`, `src/shared/ui`, `src/shared/lib/haptics.ts`, `src/shared/theme/motion.ts`, `src/features/send/model/*`, `src/shell/LockGate.tsx`.
- 화면: `work/v9/screens/*.png` (send-s20b, s22, s23 등 직접 확인).
- 결정: `outputs/design/redesign-b.md` §9.3 (haptics·모션 목록 포함).
- Figma motion annotation: 직접 읽지 않았습니다. §9.3 표와 코드 주석으로 대신했습니다. Figma에 §9.3 밖의 motion 사양이 있으면 아래 일부 판단이 바뀔 수 있습니다.
- 실기기 확인 없음. 전환 체감(특히 §5 P1-2)은 release build 실기기에서 다시 확인해야 합니다.
- 경쟁사: 공개 자료만 썼습니다. 직접 사용 검증이 아닙니다. 탭 수는 공개 help 문서의 단계로 추정했습니다.
  - Coinbase 보내기: https://help.coinbase.com/en/coinbase/getting-started/getting-started-with-coinbase/send-and-receive
  - Coinbase 2-step: https://help.coinbase.com/en-gb/coinbase/getting-started/getting-started-with-coinbase/2-step-verification
  - Coinbase Wallet cloud backup (2019 보도, 현재 화면과 다를 수 있음): https://www.financemagnates.com/cryptocurrency/news/coinbase-wallet-adds-cloud-backup-support-for-private-keys/
  - Robinhood crypto 전송: https://robinhood.com/us/en/support/articles/crypto-transfers/
  - Wise 추적: https://wise.com/help/articles/2977947/how-do-i-track-my-transfer · 상태 단계: https://docs.wise.com/guides/product/send-money/tracking/transfer-statuses · 취소: https://wise.com/help/articles/2971625/how-do-i-cancel-my-transfer
  - 참고(보조): Trust Wallet look-alike 비교 경고: https://trustwallet.com/blog/announcements/introducing-address-poisoning-protection-on-trust-wallet
- Mobbin은 login이 필요해서 쓰지 않았습니다.

## 3. Journey별 점수 (/10)

경쟁사 점수는 공개 자료 기반 추정입니다. Robinhood·Wise는 custodial이라 지갑 생성·백업 비교가 맞지 않습니다(n/a).

| Journey | VaultMe | Coinbase | Robinhood | Wise | 보조 참고 |
|---|---|---|---|---|---|
| 첫 실행 → 지갑 생성 → Home | 7 | 8 (Wallet) | n/a (KYC) | n/a (KYC) | Phantom 9 |
| 백업 (복구 구문 + 단어 확인) | 6 | 8 (cloud backup 선택지) | n/a | n/a | Phantom 7 |
| ETH 보내기 (정상) | 7 | 8 | 7 | 9 | Toss 9 |
| 보내기 위험 경로 | **9** | 6 | 6 | 7 (수취인 확인) | Trust Wallet 8 |
| 보내기 실패·재시도 | 7 | 6 | 6 | 8 | — |
| 받기 | 6 | 7 | 7 | n/a | Phantom 8 |
| 내역·거래 상태 | 5 | 7 | 7 | 9 | Revolut 8 |
| 잠금·해제 | 8 | 8 | 8 | 8 | — |
| 설정 | 7 | 7 | 7 | 7 | — |

## 4. Journey 비교 표

### 4.1 첫 실행 → 생성 → Home

| 항목 | VaultMe | Coinbase Wallet / Phantom (보조) |
|---|---|---|
| 탭 | 6 + Face ID (만들기 1, 체크 3, 지갑 만들기 1, intro sheet 확인 1) | 약 2–4 + passkey/생체 |
| 화면 | S01 → S02 → Home + intro sheet | 2–3 |
| 대기 | OS auth 1회. Button busy | 비슷 |
| feedback | 체크마다 selection haptic. Busy icon이 돌지 않음 | spinner |
| 복구 | Keychain 저장 실패 시 S02에 Banner, 그대로 재시도 | 비슷 |
| 판단 | 백업을 뒤로 미뤄 Home 도달이 빠릅니다. 체크 3개는 이유 있는 마찰입니다 | |

### 4.2 백업

| 항목 | VaultMe | Coinbase Wallet |
|---|---|---|
| 탭 | 백업 행 1 → 보기 1 + Face ID → 체크 1 → 다 적었어요 1 → 3단어 입력 → 확인 1 = 5 + 입력 | cloud backup: 비밀번호 설정 후 몇 탭 |
| 오류 처리 | 틀리면 notice 1줄만. 어느 칸이 틀렸는지 표시 없음. error haptic 없음 | — |
| 이어하기 | 앱이 background로 가면 S03으로 돌아가고 구문이 다시 가려짐(Face ID 다시) | — |
| 끝 | 성공 → Receive(S30), 뒤로 가면 Home. 맥락이 이어짐(좋음) | — |

### 4.3 ETH 보내기 (정상)

| 단계 | VaultMe | Coinbase (Pay) | Robinhood | Wise |
|---|---|---|---|---|
| 진입 | Home 보내기 1 | Pay tab 1 + 자산 1 | 자산 상세 진입 1–2 + Send 1 | Send 1 |
| 수신자 | 붙여넣기 1 (또는 최근 주소 1) + 다음 1 | 연락처·QR·주소 1 + network 선택 | 붙여넣기 1 | 수취인 1 |
| 금액 | chip 1 (또는 keypad n) + 검토 1 | 입력 n | 입력 n | 입력 n + 결제 수단 1 |
| 검토 | 확인하고 보내기 1 + Face ID | Preview 1 → Pay now 1 (+2FA 고액) | Review 1 → Submit 1 | Continue 1 → Send 1 |
| 최소 탭 | **6 + Face ID**, 화면 4 | 약 6–7 | 약 6–7 + 보안 검토 대기 | 약 5–6 |
| 결과 | S23: 보냄 → 블록 포함 → 확정, 15초 polling | 상태 + 내역 | explorer link | 단계 timeline + ETA + push |
| 접수 feedback | haptic 없음. 전환만 | 화면 전환 | 화면 전환 | 화면 전환 + push |
| 확정 feedback | success haptic (S23을 보고 있을 때만) | push | push | push |

### 4.4 위험 경로·실패·재시도

| 상황 | VaultMe | 경쟁사 |
|---|---|---|
| 비슷한 주소·burn·token contract | 회색 "위험 확인하기" → sheet(warning haptic, 이전/현재 주소 diff 강조, "취소"가 Primary) → 확인 → 파란 버튼. +2탭 | Coinbase·Robinhood: 공개 자료에 diff 비교 없음, 일반 경고 문구. Trust Wallet: 비교 경고 |
| 수수료 바뀜 | NeedsReview: 새 수수료로 갱신 후 "다시 검토" | 공개 자료 없음 |
| 네트워크 오류 | Banner + 이유(offline/busy/clock) + 다시 시도 | 일반 오류 |
| 인증 취소 | 조용히 그대로. 인증 오류는 caption + 다시 시도 | 비슷 |
| 실패 | 실패 이유(확인된 값만) + "다시 보내기" → 같은 값으로 검토 다시 열기, 자동 전송 없음 | Wise: 상태별 취소 규칙. 거래소: 고객지원 |
| Unknown | "다시 확인" 버튼 | 대부분 없음 |

### 4.5 받기 · 내역 · 잠금 · 설정

| Journey | VaultMe | 경쟁사 |
|---|---|---|
| 받기 | 받기 1 → 복사 1 = 2탭. 단, 백업 전이면 S31로 막힘(백업 경로 약 7탭 이상) | Coinbase: Receive → 자산 → network → 주소(3–4). Phantom: 3 |
| 복사 확인 | haptic Light + screen reader 안내만. 보이는 변화 없음 | 대부분 toast 또는 "Copied" |
| 내역 | 탭 1 → 행 1. Skeleton 6행, cache 오류 Banner + 다시 시도. pull-to-refresh 없음 | Wise: 단계 timeline, ETA, 지연 안내 |
| 진행 중 거래 | S23·S41만 15초 polling. Home은 focus 때 kv만 다시 읽음 | Wise·Coinbase: push |
| 잠금 | 화면이 뜨면 Face ID 자동. 0탭. 30초 grace. 경로 유지 | 동급 |
| 설정 | 탭 1 → 행 1. 계정 블록 복사 | 동급 |

## 5. Gap (우선순위)

표기: **Figma 먼저** = AGENTS rule 6–7. Figma frame이나 annotation을 먼저 바꾸고 owner 승인을 받습니다. **앱 코드만** = 이미 Figma에 있는 상태·동작을 맞추는 일입니다.

### P0

**P0-1. Home이 진행 중 거래를 갱신하지 않음 → 보내기 차단 loop**
- 근거: `useTrackedTx` polling은 S23/S41 focus 때만 돕니다. Home의 `usePendingTx`는 kv만 다시 읽습니다(`src/features/send/model/usePendingTx.ts`, `useTrackedTx.ts`). `blocksNewSend`는 Pending·Unknown이면 새 보내기를 막습니다.
- 결과: S23에서 바로 "확인"을 누르면 Home은 계속 "보내는 중"입니다. 보내기를 누르면 차단 sheet → "진행 중인 거래 보기" → S41이 확인 → 돌아와야 풀립니다. 3탭 + 최대 15초.
- 고침 (interaction spec):
  - Trigger: Home focus + app active + pending tx가 polled 상태.
  - State: Home에서도 `useTrackedTx`(같은 15초 polling, 즉시 1회 확인)를 씁니다. 상태가 바뀌면 최근 행 badge와 차단 조건이 같이 바뀝니다.
  - Motion: 행 status label 교차 fade 150 ms ease-out `(0.23,1,0.32,1)`. Reduce Motion에서도 opacity 유지.
  - Haptic: Home에서는 없음(사용자가 만든 동작이 아님).
- 변경: **앱 코드만** (Home pending 상태 frame 423:742가 이미 있음).

**P0-2. Busy 상태 icon이 멈춘 "새로고침" 모양**
- 근거: `Button` busy는 `loading` icon을 씁니다. `Icon.tsx`에서 `loading: RestartIconL`입니다. 회전 animation이 코드 어디에도 없습니다(`rotate`, `withRepeat` 검색 결과 SkeletonRow만).
- 결과: 확인하고 보내기, 지갑 만들기, 복구, 다시 확인 버튼이 기다리는 동안 "다시 시도" 기호처럼 보입니다. 가장 중요한 순간에 진행 신호가 없습니다.
- 고침:
  - Trigger: `busy=true`.
  - Motion: icon `rotate` 0→360°, 800 ms, linear, 반복(Reanimated `withRepeat`). transform만 씁니다.
  - Reduce Motion: 회전 없음. 대신 label을 진행형으로 바꿉니다(예: "보내는 중…").
  - Haptic: 없음.
  - State: `accessibilityState.busy` 유지(이미 있음).
- 변경: Figma Button busy variant에 spinner motion 사양이 있으면 **앱 코드만**. 없으면 **Figma 먼저**(annotation + 진행형 label copy).

### P1

**P1-1. 복사 확인이 눈에 보이지 않음**
- 근거: 받기·자산·설정 복사는 `haptic.copy()` + `announceForAccessibility`뿐입니다. haptic이 꺼진 사용자, 대부분의 Android 기기는 아무 변화를 못 봅니다. Haptic은 단독 feedback이 되면 안 됩니다.
- 고침: Trigger 복사 성공. 버튼 label "주소 복사" → "복사했어요" + check icon, 150 ms crossfade ease-out, 1.5초 뒤 되돌림. Haptic Light는 label이 바뀌는 같은 frame. i18n key `receive.copied`는 이미 있습니다.
- 변경: **Figma 먼저** (Button "Copied" 상태 frame).

**P1-2. 검토 → 결과 전환이 두 번의 navigation + 접수 순간 feedback 없음**
- 근거: `router.dismissAll()` 직후 `router.push('/send/result')` (`src/pages/review/index.tsx`). 백업 확인도 `dismissTo('/home')` + `push('/receive')`입니다. 실기기에서 Home이 잠깐 보였다가 결과가 올라올 위험이 있습니다(실기기 확인 필요). 또 Pending 접수 순간에는 haptic이 없습니다. success는 Confirmed에만 있습니다.
- 고침:
  - Navigation: 한 번의 전환으로 stack을 [tabs, result]로 만듭니다. 결과 화면 `animation: 'fade'` 200 ms 또는 native default 하나만.
  - Haptic: 결과 화면 mount frame에 `impactAsync(Medium)` 1회("접수됨"). success는 Confirmed에 그대로 둡니다.
  - Motion: ProgressSteps 첫 단계 채움 300 ms ease-out. Reduce Motion은 즉시 표시.
- 변경: haptic 목록(§9.3)이 바뀌므로 **Figma 먼저** (motion annotation + owner 결정). navigation 정리만은 앱 코드.

**P1-3. Sheet grabber는 있지만 끌어서 닫기가 안 됨**
- 근거: `BottomSheet.tsx`는 timing으로만 열고 닫습니다. Gesture가 없습니다. Grabber가 거짓 affordance가 됩니다. iOS 사용자는 아래로 끕니다.
- 고침: `Gesture.Pan()`. 아래로 이동은 1:1, 위로는 rubber-band. 놓을 때 이동 > 높이 30% 또는 속도 > 500 pt/s면 닫기, 아니면 spring `{ duration: 300, dampingRatio: 0.8, velocity }`로 복귀. 닫기 = `onClose`(위험 sheet에서는 "취소"와 같음, 안전). Haptic 없음. 같은 김에 deprecated `runOnJS`를 `scheduleOnRN`으로, `.value`를 `.get()/.set()`으로 바꿉니다.
- 변경: **앱 코드만** (grabber는 Figma 301:607에 있음). 동작 annotation은 Figma에 추가 권장.

**P1-4. Keypad가 거부한 입력에도 성공처럼 반응**
- 근거: `Keypad`는 모든 key에서 `haptic.select()`를 먼저 부릅니다. `applyKey`가 자릿수 제한으로 입력을 버려도 haptic은 납니다. 잔액 초과는 빨간 숫자 + notice만, haptic·motion 없음.
- 고침: 입력이 실제로 바뀔 때만 selection haptic. 거부된 key는 금액 수평 shake 4 pt × 3회, 240 ms + `haptic.error` 1회. 잔액 초과로 처음 바뀌는 순간에만 error haptic 1회. Reduce Motion은 shake 없이 색 변화만.
- 변경: haptic 억제는 **앱 코드만**. shake는 **Figma 먼저** (motion annotation).

**P1-5. 백업 단어 확인이 너그럽지 않음**
- 근거: 틀리면 notice 1줄뿐입니다(`backup/check.tsx`). 어느 칸인지 모릅니다. background로 가면 S03으로 돌아가 Face ID부터 다시 합니다.
- 고침: 틀린 칸만 invalid 표시(`status.danger` border, helper "N번째 단어가 달라요"), 그 칸에 focus, `haptic.error` 1회. 맞은 칸은 유지. Background 초기화는 보안 결정이므로 유지하되, 돌아왔을 때 "보안을 위해 처음부터 다시 확인해요" Inline 안내를 보여 줍니다.
- 변경: **Figma 먼저** (invalid 칸 상태, copy).

### P2

| # | Gap | 고침 | 변경 |
|---|---|---|---|
| P2-1 | 최근 주소를 누르면 칸만 채움 → "다음" 1탭 더 | 최근 주소 탭 → 바로 S20B. 비슷한 주소 검사는 S22에서 유지 | Figma 먼저 (flow) |
| P2-2 | 내역·Home에 pull-to-refresh 없음 | `RefreshControl`(native). 끝나면 Banner 갱신 시각 업데이트. Haptic 없음 | Figma 먼저 (annotation) |
| P2-3 | S23 success haptic이 Confirmed 결과 화면을 다시 열 때마다 반복 | 이전 상태 ref로 "바뀐 순간"에만 1회 | 앱 코드만 |
| P2-4 | 잠금 해제 시 화면이 즉시 바뀜(`display: none` 교체) | 잠금 화면 opacity 1→0, 150 ms ease-out. Reduce Motion에서도 fade 유지 | Figma 먼저 (annotation) |
| P2-5 | 복구 입력이 `inactive`(알림 배너, Control Center)에도 지워짐 | `background`에서만 지우기. 보안 판단이므로 owner 결정 | Figma 먼저 (owner) |
| P2-6 | 받기가 백업 전에 막힘(S31). Coinbase Wallet·Phantom은 바로 받기 | 의도된 마찰. 유지하거나 "받기 허용 + 고정 백업 Banner" 중 owner가 다시 결정 | Figma 먼저 (grilling) |
| P2-7 | 확정 알림 경로 없음(push opt-in sheet S50은 있음) | C3에서 Confirmed/Failed push. 앱 밖에서도 상태 연속성 확보 | Figma 먼저 |

## 6. VaultMe가 이미 더 잘하는 점

1. **비슷한 주소 방어**: 이전 주소와 현재 주소를 나란히 두고 다른 묶음을 빨강 + 밑줄로 표시합니다. 안전한 "취소"가 Primary입니다. 공개 자료 기준 Coinbase·Robinhood에는 이 수준이 없습니다.
2. **검토 화면에서 바로 수정**: 받는 사람·보내는 것 각각 "수정". 뒤로 여러 번 갈 필요가 없습니다.
3. **정직한 상태 모델**: 보냄 → 블록 포함 → 확정, Unknown "다시 확인", Replaced, 확인된 실패 이유만 표시. 거래소 앱보다 Wise에 가깝습니다.
4. **실패 후 다시 보내기**: 같은 값으로 검토를 다시 열고 Face ID부터 다시 거칩니다. 빠르지만 자동 전송은 없습니다.
5. **수수료를 아는 chip**: 25% / 50% / 전액이 최대 수수료를 뺀 값입니다. "수수료 제외" 안내가 붙습니다.
6. **잠금**: 자동 Face ID, 0탭, grace 잠금 뒤 경로 유지, OS 인증 시트가 잠금을 다시 걸지 않음.
7. **motion 절제**: tab 전환 animation 없음, press scale 0.97 / 100 ms ease-out, sheet 250/200 ms iOS curve, Reduce Motion에서 motion만 끄고 haptic은 유지. Haptic 어휘가 5개로 작고 일관됩니다.
8. **빠른 첫 도달**: 백업을 뒤로 미루고, 백업이 끝나면 받기로 이어 줍니다.

## 7. 사용한 skill

| Skill | 출처 | 용도 |
|---|---|---|
| `animate-expo` | 설치됨, `~/.claude/skills/animate-expo` (Emil Kowalski 철학 기반) | RN motion·haptic 규칙, spring/easing 값, thread 규칙 |
| `emil-design-eng` | 설치됨, `~/.claude/skills/emil-design-eng` (Emil Kowalski) | animation 판단 틀(빈도·목적·easing·지속 시간) |
| `impeccable` (critique, native 경로) | 설치됨, `~/.claude/skills/impeccable` | heuristic critique 틀. Native라 Assessment A만 수행(detector 비대상) |

- `find-skills` 검색: `npx skills find "mobile interaction design review"`. 결과는 이미 설치된 `ui-ux-pro-max`의 낮은 설치 수 fork뿐이었습니다. 검증된 fintech UX benchmark나 interaction heuristic skill이 없어서 **설치하지 않았습니다**.
- `review-animations` skill은 이 환경에 없습니다.
- 다른 리뷰어 보고서(`seamless-*`)는 읽지 않았습니다.
