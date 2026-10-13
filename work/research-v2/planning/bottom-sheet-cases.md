# Bottom Sheet 사용 사례 리서치 (VaultMe)

조사일: 2026-10-13. 1차 출처만 사용. 못 읽은 것은 "확인 못함".

## 1. 출처 표

| # | 출처 | URL | 상태 |
|---|---|---|---|
| 1 | Apple HIG Sheets | https://developer.apple.com/design/human-interface-guidelines/sheets | verified (developer.apple.com/tutorials/data/design/human-interface-guidelines/sheets.json 로 본문 확인) |
| 2 | Apple HIG Alerts | https://developer.apple.com/design/human-interface-guidelines/alerts | verified (동일 방식, alerts.json) |
| 3 | Material 3 Bottom sheets (m3.material.io) | https://m3.material.io/components/bottom-sheets/guidelines | 확인 못함 (JS 렌더링, 본문 없음) |
| 3b | Material Components Android BottomSheet 문서 (M3 구현 문서) | https://github.com/material-components/material-components-android/blob/master/docs/components/BottomSheet.md | verified (modal/standard 정의만. "언제 쓰라"는 가이드는 아님) |
| 4 | Coinbase CDS Tray | https://cds.coinbase.com/components/overlay/Tray/ | verified (일부 truncated, Props 표 없음) |
| 5 | Coinbase CDS Alert | https://cds.coinbase.com/components/overlay/Alert/ | verified |
| 6 | Coinbase CDS "tray vs modal vs alert" 비교 문구 | 위 페이지들 | 확인 못함 (비교 가이드 없음) |
| 7 | MMDS BottomSheet / BottomSheetFooter README | https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/BottomSheet | verified (BottomSheet, BottomSheetFooter, BottomSheetDialog 읽음). "언제 시트를 쓰라"는 가이드 문구는 없음 |
| 8 | MetaMask Mobile 소스 + locales/languages/en.json | https://github.com/MetaMask/metamask-mobile (main) | verified (아래 파일 직접 확인) |
| 9 | Rainbow / Uniswap | - | 확인 못함 (시간상 미조사) |

## 2. 규칙 (HIG / M3 / CDS / MMDS)

### Apple HIG Sheets (#1)
- Sheet 용도: 부모 뷰로 돌아오기 전에 끝낼 수 있는 "간단한 작업", 정보 입력.
- 길거나 복잡한 flow는 sheet 대신 full-screen 계열을 고려.
- iOS는 modal / nonmodal 둘 다 가능. Modal은 부모 뷰 조작을 막음.
- 한 번에 sheet 하나만. 시트에서 시트로 가야 하면 먼저 닫고 연다.
- Done은 Cancel 또는 Back과 짝으로. Done만 두면 "완료해야만 나갈 수 있다"로 읽힘. 세 버튼 동시 노출 금지.
- 크기 조절 가능한 sheet에는 grabber를 둔다. grabber는 VoiceOver와도 연동.
- 아래로 스와이프 dismiss를 지원. 저장 안 한 변경이 있으면 스와이프 시 확인(action sheet) 제공.
- 선택지/중요 정보만 필요하면 alert 또는 action sheet를 고려 (watchOS 항목이나 취지는 동일).

### Apple HIG Alerts (#2)
- 드물게 사용. 정보만 알리는 용도로는 쓰지 않는다.
- 되돌릴 수 없는 드문 파괴 작업만 alert로 확인. 흔하고 undo 가능한 작업에는 쓰지 않음.
- 앱 시작 시 alert 표시 금지.
- 버튼은 최대 3개. 제목은 상황을 구체적으로. 버튼은 동사형. "OK"는 정보성 alert에서만.
- 파괴 작업에는 Cancel 필수. Cancel을 default로 두지 않음.
- 파괴 style은 "사용자가 의도하지 않은" 파괴 버튼에만. 사용자가 직접 선택한 파괴 작업(휴지통 비우기)에는 적용 안 함.
- 의도한 작업의 선택지는 alert가 아니라 action sheet.

### Material 3 (#3, #3b)
- m3.material.io 가이드 본문: 확인 못함.
- Android 구현 문서(검증): Modal bottom sheet는 "선택지를 보여주며 나머지 화면 조작을 막는다". 인라인 메뉴/단순 dialog의 모바일 대안.
- Modal은 scrim(어둡게)이 있고, scrim 탭하면 dismiss, 아래로 끝까지 드래그해도 dismiss.
- Standard sheet는 scrim 없이 메인 UI와 동시에 사용.
- drag handle은 optional, 접근성용으로 둠 (문서 예시 주석 "Drag handle for accessibility").

### Coinbase CDS (#4, #5)
- Tray: 가장자리에서 올라오는 overlay. 모바일은 bottom + handlebar, 태블릿/데스크톱은 right.
- 기본 dismiss: handlebar 스와이프, close 버튼, ESC, 바깥 클릭.
- `preventDismiss`: 모든 기본 dismiss 제거. 이때 footer 등에 명시적 닫기 버튼 필수.
- 접근성: 접근 가능한 이름 필수, 닫힌 뒤 trigger로 focus 복귀, `reduceMotion` 지원.
- Alert: "중요 정보를 전달하고 사용자 조작을 막는 dialog". 버튼은 preferred action + dismiss action(Cancel). 파괴 작업은 preferredActionVariant "negative" 예시.
- Alert의 scrim/ESC dismiss 동작은 문서에 없음 (확인 못함). Tray vs Modal vs Alert 선택 기준 문서도 없음 (확인 못함).

### MMDS (#7)
- BottomSheet: `goBack` 콜백 필수. 닫힘 시 `onClose`.
- `isInteractable=false`: 스와이프/오버레이 탭 dismiss 비활성, drag handle 숨김. 즉 강제 응답용 sheet를 공식 지원.
- `isFullscreen`: 전체 높이 sheet 가능.
- BottomSheetFooter: secondary(왼쪽/위) + primary(오른쪽/아래), 가로/세로 배치. 변형 고정.
- "sheet vs full screen" 선택 기준 문서: 확인 못함.

## 3. 지갑 사례 (MetaMask Mobile, 소스 확인)

경로 기준: `app/components/...` (main 브랜치, 2026-10-13 조회). 문구는 `locales/languages/en.json`.

| Vendor | 사례 | 형태 | 버튼 | dismiss 규칙 | 출처 |
|---|---|---|---|---|---|
| MetaMask | Send alert (수신자 경고 등) | BottomSheet(+RN Modal). 여러 경고면 이전/다음 ButtonIcon | Cancel(secondary) + "I understand"(primary). 마지막 경고에서만 최종 acknowledge | `onClose` 콜백. 기본 interactable | `Views/confirmations/components/send/send-alert-modal/send-alert-modal.tsx` |
| MetaMask | 고위험 요청 확인 (confirm-alert-modal) | BottomSheet | "Review all alerts"(tertiary) + 체크박스 "I have acknowledged the alert and still want to proceed" 후 진행 | 체크 전 진행 불가(체크박스 게이트) | `Views/confirmations/components/modals/confirm-alert-modal/confirm-alert-modal.tsx`, en.json `alert_system.confirm_modal` |
| MetaMask | Alert 상세 (alert-modal) | BottomSheet | danger면 "Acknowledge", 아니면 "Got it". danger는 체크박스 | 일부 조건에서 버튼 disabled (정확한 조건 확인 못함) | `.../modals/alert-modal/alert-modal.tsx` |
| MetaMask | Remove account | BottomSheet (코드 주석: Figma "BottomSheet" alert dialog) | Cancel + Remove (BottomSheetFooter). 문구 "Remove {{accountName}}?" / "You can restore this account anytime by importing it with the private key." | 기본 | `Views/ManageAccounts/sheets/RemoveAccount/RemoveAccount.tsx` |
| MetaMask | Hide token | BottomSheet(RN Modal 위) | Hide + Cancel, 제목 "Hide token?" | 기본 | `UI/Tokens/TokenList/RemoveTokenBottomSheet.tsx` |
| MetaMask | Forgot password / Delete wallet | BottomSheet, 안에서 단계 전환 | 단계형 (Reset wallet 포함) | `isInteractable={!isDeletingWallet}`: 삭제 진행 중에는 dismiss 불가 | `UI/DeleteWalletModal/index.tsx`, en.json `login.*` |
| MetaMask | Protect your wallet (필수) | react-native-modal, 하단 스타일 | "Protect wallet" 단일 | 단일 버튼. dismiss 옵션 코드 확인 못함 | `Views/ProtectWalletMandatoryModal/ProtectWalletMandatoryModal.tsx`, en.json `protect_your_wallet_modal` |
| MetaMask | Push 알림 opt-in | BottomSheet | "Turn on notifications" + "Not now" | "Not now"로 거절 가능 | `Views/Notifications/PushNotificationOnboarding/NewUserSheet/NewUserSheet.tsx`, en.json `notifications.push_onboarding.new_user` |
| MetaMask | 알림 기능 gate | BottomSheet(`transparentModal` 라우트) | "Turn on notifications" | 시트 닫히면 goBack | `Views/Settings/NotificationsSettings/FeatureNotificationsGateSheet.tsx` |
| MetaMask | SRP 공개 | 본문 화면은 Settings route(전체 화면). 앞단 "Security quiz" 소개 컴포넌트는 SafeAreaView 기반, sheet 여부 확인 못함 | 본문: Cancel / Next(confirm) | "Make sure nobody is looking at your screen." 경고 문구 | `Views/RevealPrivateCredential/RevealPrivateCredential.tsx`, `Views/MultichainAccounts/sheets/RevealSRP/RevealSRP.tsx` (폴더명만 sheets) |
| MetaMask | Account selector / Network selector | 폴더 확인(`Views/NetworkSelector/RpcSelectionModal` 등). 구현 상세 파일 미확인 | - | 확인 못함 | 확인 못함 |
| Coinbase CDS | Tray (선택/보조 콘텐츠) | bottom + handlebar | footer 버튼 | 스와이프/닫기/ESC/바깥 탭. `preventDismiss`로 강제 응답 | https://cds.coinbase.com/components/overlay/Tray/ |
| Coinbase CDS | Alert (critical, blocking) | dialog | preferred + Cancel | 문서에 없음 | https://cds.coinbase.com/components/overlay/Alert/ |
| Rainbow / Uniswap | send confirm / 경고 | - | - | 확인 못함 | - |

관찰 요약:
- MetaMask는 경고 확인(ack), 파괴 확인(remove/hide), opt-in 권유를 BottomSheet로 처리.
- 높은 위험 경고는 체크박스 또는 명시 acknowledge 버튼을 요구.
- 진행 중인 파괴 작업은 `isInteractable=false`로 dismiss 차단.
- 비밀(SRP) 본문은 전체 화면 route에서 표시 (`RevealPrivateCredential`).

## 4. VaultMe 매핑

전제: 비밀(phrase 표시)은 full screen 고정. 아래는 "추천"이며 근거 강도를 적음.

| 후보 | 추천 | 이유 | 출처 |
|---|---|---|---|
| S22 경고 ack (first recipient / lookalike / burn / token-contract) | Bottom sheet | 상태: 현재 flow 중 짧은 확인 한 건. MetaMask send-alert-modal이 같은 케이스를 sheet로 처리. 버튼 Cancel + "I understand". 경고 여러 개면 한 번에 한 sheet, 순차 표시(HIG: 한 번에 하나). burn/token-contract처럼 자금 영구 손실이면 체크박스 gate 또는 primary를 danger 스타일 고려 | MetaMask `send-alert-modal.tsx`, `confirm-alert-modal.tsx`; HIG Sheets |
| S22 burn / token-contract 차단 수준 | Inline + 진행 버튼 비활성 (또는 sheet에서 진행 불가) | 앱 자체가 막아야 할 오류는 확인 대상이 아님. MetaMask는 문구 "you will lose them" 후 ack. VaultMe 정책은 제품 결정 필요 | MetaMask en.json `send.token_contract_warning` |
| S24 send blocked (pending tx) | Inline (S20 상단 배너) 또는 Bottom sheet(정보+단일 "확인") | HIG: 정보만 알리는 alert 지양. 막힌 이유 + 다음 행동이 있으면 sheet 가능. 동일 근거의 직접 MetaMask 사례는 확인 못함 (usePendingTransactionAlert 훅은 확인, 표시 형태 확인 못함) | HIG Alerts |
| S50 push opt-in | Bottom sheet | MetaMask NewUserSheet가 동일 패턴: "Turn on" + "Not now". 거절 쉬워야 함. 앱 시작 직후 표시는 HIG가 지양하므로 홈 진입 후 | MetaMask `NewUserSheet.tsx`; HIG Alerts |
| S31 backup-required | Full screen (기본), 홈에서의 안내는 Inline 배너 | 백업은 phrase를 다루는 flow. 안내만 하는 경우 sheet로 "Back up now" CTA 가능하나 phrase 표시는 불가. MetaMask Protect wallet은 하단 modal 단일 버튼 | MetaMask `ProtectWalletMandatoryModal.tsx` |
| 카메라 권한 거부 설명 | Full screen 내 Inline (S21 안 빈 상태 + "설정 열기") | 카메라 화면 자체가 막혀 대체 UI 필요. sheet는 화면 위에 또 덮는 구조 | 일반 판단. 직접 출처 확인 못함 |
| 알림 권한 거부 설명 | Bottom sheet (S50/S62에서) | Push opt-in과 같은 형태로 "설정 열기"/"나중에" | MetaMask FeatureNotificationsGateSheet |
| 주소 복사/공유 액션 (S30) | Bottom sheet (OS share sheet 우선) 또는 Inline 토스트 | 복사는 Inline 피드백. 공유는 OS share sheet 사용 | HIG Sheets (share sheet 예시). 직접 사례 확인 못함 |
| 알림 끄기 확인 (S62) | Inline (토글 즉시 반영) 또는 Alert | undo 가능한 흔한 동작은 alert 지양. 되돌릴 수 없는 게 아니므로 Alert 불필요 | HIG Alerts |
| Reveal phrase 사전 경고 (OS auth 전, S61 진입) | Bottom sheet (경고 + 계속/취소) 또는 Full screen | 경고 단계만 sheet. 이후 phrase 표시와 OS auth는 full screen. MetaMask는 SRP 본문을 route로 둠, 앞단 quiz sheet 여부는 확인 못함. 보수적 선택: full screen 한 흐름 | MetaMask `RevealPrivateCredential.tsx` |
| S03 phrase 표시 / S04 verify / S61 phrase | Full screen (고정) | 비밀 노출 + 긴 작업. HIG: 복잡한 flow는 full-screen 모달. 스와이프 dismiss로 실수 종료 방지 | HIG Sheets; MetaMask `RevealPrivateCredential.tsx` |
| Account / network 정보 | Bottom sheet 또는 Inline | Sepolia 단일이라 선택 UI 불필요. 정보 확인만이면 sheet, 상시면 inline 라벨 | MetaMask PermittedNetworksInfoSheet 파일 존재 확인(내용 확인 못함) |
| Tx detail quick view (S40 -> S41) | Full screen (S41) | 상세 정보가 길고 복사/익스플로러 링크가 있음. 탐색 계층이므로 push 화면 | HIG: sheet는 navigation 용도로 쓰지 말 것 (watchOS 항목이나 취지 동일, 직접 근거는 약함) |
| "다시 보내지 말고" unknown state 안내 | Full screen 결과 화면(S23) 내 Inline 강조 | 중요 안내가 닫히면 안 됨. sheet는 스와이프/바깥 탭으로 사라져 놓칠 수 있음. 반드시 읽혀야 하면 `preventDismiss`/`isInteractable=false` 패턴은 가능하나 비추천 | CDS Tray `preventDismiss`; MMDS `isInteractable` |
| QR 결과 불일치 (S21) | Bottom sheet (경고 + 다시 스캔/취소) | 카메라 위에서 짧은 확인. 단 주소 형식이 틀렸으면 Inline 오류가 더 가벼움 | 직접 출처 확인 못함 |
| Lock S90 / Update required S91 / Root warning S92 | Full screen | 앱 사용을 막는 상태. dismiss 불가여야 함 | 일반 판단. 직접 출처 확인 못함 |

## 5. 공통 구현 규칙 (제안)

- 한 번에 sheet 하나. 연속 경고는 순차 교체.
- 파괴/위험 확인 sheet는 Cancel 필수, 진행 중에는 dismiss 잠금 (MetaMask `isInteractable`).
- 위험 경고는 바깥 탭/스와이프로 닫히면 "취소"와 동일하게 처리 (ack로 간주 금지).
- grabber/닫기 버튼 + 접근성 label 제공. 닫힌 뒤 focus를 trigger로 복귀 (CDS).
- reduce motion 지원 (CDS `reduceMotion`).
