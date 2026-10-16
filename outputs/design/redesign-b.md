# Redesign B — Foundation 초안과 핵심 화면 3개 (#54)

상태: 방향 승인 (오너, 2026-10-16). Figma `14 Redesign B` 페이지 — `B Foundation` 398:77, `B Screens` 404:162 (Home 404:163, Home Dark 404:522, Send review 404:315, Activity 404:387, Send review scrolled full 419:12973). 기존 master 반영과 Library publish는 디자인 스킬 검수 뒤 별도 단계에서 한다.

## 1. 결정 (오너, 2026-10-15)

| 항목 | 값 |
|---|---|
| 글꼴 | Pretendard 400/500/600 (700 없음). 금액은 tabular numerals. 주소·hash는 IBM Plex Mono |
| 면 | Coinbase식 평평한 흰 면. list row, section 제목, 간격으로 묶는다. card는 묶음이 꼭 필요할 때만 |
| 안내 | tinted 박스를 줄인다. 아이콘 + 글자 색으로 표시한다 |
| 버튼 | pill. 높이 56 / 48 / 40. 파랑은 화면당 Primary 1개. Secondary는 neutral |
| 수치 | row 64, sheet 위 모서리 32, press scale 0.97–0.98 @100ms, row는 배경색만 바뀜, sheet 250ms ease-out |

근거: `~/Projects/vaultme-design-research/foundation-research.md` (§4), Mobbin 리서치 `mobbin-2026-10-15/SUMMARY.md` (저장소 밖. 이미지 없음, 링크만).

## 2. Figma 글꼴 대체 (임시)

- Figma 원격 MCP(`use_figma`)는 로컬 글꼴을 읽지 못한다. Pretendard 로드가 실패한다 (2026-10-16 확인).
- 학생(Education) 플랜은 Professional 기능이라 shared fonts 업로드가 없다 ([Figma Help](https://help.figma.com/hc/en-us/articles/360039956774)).
- 그래서 Figma 초안은 **Gothic A1** (Regular / Medium / SemiBold)로 만든다. Noto Sans KR은 Figma에 SemiBold(600)가 없어서 제외했다. Latin·숫자 폭은 Pretendard(Inter 계열)와 다르다.
- 오너 승인 뒤 오너가 Figma 앱에서 `Product B / *` 텍스트 스타일의 family를 Pretendard로 바꾼다. 그 뒤 MCP는 해당 텍스트를 수정할 수 없으므로 마지막 단계에서 한다.
- 앱 코드는 처음부터 Pretendard를 쓴다. app-vs-Figma 비교에서 글자 폭 차이는 이 대체 때문이다.

## 3. Foundation 추가 (초안, 기존 값 변경 없음)

### 3.1 Primitive (새 raw 값만)

| 이름 | 값 | 이유 |
|---|---|---|
| `size/pill_lg` | 56 | 버튼 lg |
| `size/pill_md` | 48 | 버튼 md |
| `size/pill_sm` | 40 | 버튼 sm (hit target은 기존 `button/hitTarget` 44) |

나머지는 기존 Primitive에 alias한다: `radius/pill` 999, `radius/3xl` 32, `size/asset_row` 64, `space/*`.

### 3.2 Component (alias만)

| 이름 | alias |
|---|---|
| `buttonB/height/lg·md·sm` | `size/pill_lg·md·sm` |
| `buttonB/radius` | `radius/pill` |
| `buttonB/paddingX/lg·md·sm` | `space/6` · `space/5` · `space/4` |
| `buttonB/primary/bg·fg` | 기존 `button/primary/bg/default` · `fg/default` |
| `buttonB/secondary/bg·fg` | `surface/subtle`(neutral 50) · `text/primary` |
| `rowB/height` | `size/asset_row` (64) |
| `rowB/paddingX` | `layout/screen/padding` |
| `sheetB/radius` | `radius/3xl` (32) |
| `screenB/bg` | `surface/default` (흰색) |

`surface/canvas`(neutral 50)은 기존 화면이 쓰므로 그대로 둔다. Redesign B 화면 배경만 `screenB/bg`(흰색)을 쓴다.

### 3.3 Text style `Product B / *` (Figma는 Gothic A1 대체)

| 스타일 | size/lineHeight | 자간(px) | weight | 용도 |
|---|---|---|---|---|
| Display L | 40/48 | -1.1 | 600 | 잔액 hero |
| Display M | 32/40 | -0.8 | 600 | 금액 입력, 검토 금액 |
| Title 1 | 26/34 | -0.6 | 600 | 화면 제목 |
| Title 2 | 22/30 | -0.4 | 600 | 섹션 제목 |
| Title 3 | 19/27 | -0.2 | 600 | sheet 제목 |
| Headline | 17/25 | 0 | 600 | row 주 텍스트, 버튼 |
| Body | 16/24 | 0 | 400 | 본문 |
| Body Small | 15/22 | 0.1 | 400 | 보조 설명 |
| Label | 14/20 | 0.2 | 500 | 필드 label, 칩 |
| Caption | 12/17 | 0.3 | 400 | 날짜, 부가 정보 |
| Address | 14/20 | 0 | 400 | IBM Plex Mono, 전체 주소 |

### 3.4 컴포넌트 (페이지 `14 Redesign B`, 새 master. 기존 C01–C33 ID 유지)

| 컴포넌트 | 구성 |
|---|---|
| B/Button | Variant: Type(Primary, Secondary, Ghost) × Size(lg, md, sm) × State(Default, Pressed, Disabled). pill. 아이콘 slot |
| B/Row | 64 높이. leading 40 원형 아이콘(자산 SVG 또는 Phosphor) · title(Headline) + subtitle(Caption, text/tertiary) · trailing value(Headline, tnum) + sub value(Caption). 배경 없음, divider 없음 |
| B/Section header | Title 2 + 선택 trailing 링크(Label, text/link) |
| B/Notice inline | 아이콘 20 + Body Small. Tone(Info, Warning, Danger, Success)은 아이콘·글자 색만. 박스 없음 |
| B/Detail row | label(Body Small, text/tertiary) 왼쪽 · value(Body, text/primary) 오른쪽. 주소 값은 Address 스타일로 전체 표시, 4글자 묶음, 줄바꿈 허용 |
| B/Balance hero | label(Label) · amount(Display L) · sub(Body Small) |
| B/Action row | B/Button md 2개 가로 (보내기 Primary, 받기 Secondary) |
| B/Bottom sheet | 위 모서리 32, grabber, Title 3, 본문, 버튼 stack (Primary 아래) |

기존 Product header(68:167), Product navigation(67:342), Status label(67:241)은 재사용한다.

## 4. 핵심 화면 3개 (390×844, 배경 `screenB/bg`)

### Home (S10R 기반)
1. Product header: 계정 1 / Sepolia
2. B/Balance hero: "총 평가금액" · "표시할 수 없어요" · "테스트넷 자산은 시장 가격이 없어요. 수량은 아래에서 보세요."
3. B/Action row: 보내기(Primary) · 받기(Secondary)
4. B/Section header "자산"
5. B/Row × 2: Sepolia ETH / USD Coin (수량 tnum, "시장 가격 없음")
6. Product navigation (자산 / 내역 / 설정)

### Send review (S22)
1. Product header (뒤로, "보내기 검토")
2. 금액 hero: Display M "0.05 ETH" + Body Small 보조
3. B/Detail row: 계정 · 네트워크 · 자산 · 받는 주소(전체, Address) · 예상 네트워크 수수료 · 최대 수수료 · 예상 총 차감액(값만 600)
4. B/Notice inline (Info): "잔액, 수수료, 주소 형식을 09:41에 확인했어요. 받는 사람의 안전을 보증하지는 않아요."
5. Caption: "금액과 수수료는 ETH로 나가요. 최종 수수료는 달라질 수 있어요."
6. 하단 고정: B/Button lg Primary "확인하고 보내기" · Ghost "수정"

### Activity (S40)
1. Product header "내역"
2. 날짜 그룹 B/Section header (Label, 요일 포함 "10월 16일 (금)")
3. B/Row: 보냄 / 받음 / 보내는 중 / 실패 (상태는 subtitle 글자, 금액 부호 tnum. 실패 금액은 text/tertiary + 취소선 검토)
4. Product navigation

Dark 확인: Home 1장.

## 5. 완료 조건

- `vaultme-figma-screen` audit 결과 모든 count 0 (`ROOT_IDS`에 새 frame).
- 화면 스크린샷을 메인 에이전트가 직접 검토. impeccable / emil-design-eng / taste 검토 기록.
- 오너 승인 전: Library publish 없음, 기존 master·Variable 값 변경 없음.

## 6. 결정 기록 (오너, 2026-10-16 "전부 승인")

| # | 항목 | 결정 |
|---|---|---|
| 1 | 단계 제목 질문형 해요체 | 적용 ("얼마를 보낼까요?" 형태). ux-copy.md를 이 기준으로 다시 검토한다 |
| 2 | 금액 입력 커스텀 키패드 + 칩 | 적용. 칩 25% / 50% / 전액 (보낼 수 있는 금액 기준, 내림). ETH 전액 = 잔액 − 최대 수수료. 키패드 보조 키: ETH ".", USDC "00" |
| 3 | Pending 거래 홈 상단 표시 | 적용 |
| 4 | 가격 등락 색 | 보류 (가격 표시 없음) |
| 5 | 본인이 보낸 0원 거래 표시 | 미정 (#53 후속) |

### 검수 뒤 추가 결정 (오너, 2026-10-16)

| # | 항목 | 결정 |
|---|---|---|
| 6 | Send review 순서 | 위험 순서: 금액 → 받는 주소 → 자산·네트워크·계정 → (Section gap) → 수수료 묶음. 총 차감액 아래에 "최대 …" 보조 값 |
| 7 | Home 상단 | 테스트넷 + 주 보유량 (예: 라벨 "Sepolia 테스트넷", 값 "0.05 ETH"). Q48 문구 "표시할 수 없어요"를 대체한다 |
| 8 | 보내기 직전 | CTA 위에 "보내면 취소할 수 없어요. 다음 단계에서 Face ID로 확인해요." 추가. CTA 문구는 "확인하고 보내기" 유지 |
| 9 | 확인 안내 문구 | "주소 형식만 확인했어요. 받는 사람이 맞는지는 직접 확인해 주세요." 로 다듬는다 |
| 11 | copy | ux-copy.md "Redesign B 수정안" 33행 전체 승인. S22 제목 "이대로 보낼까요?", 인증 이름 기기별 |
| 10 | 다시 확인 | 확인 안내에 "다시 확인" 링크 (S22 업데이트 시각 + 재계산 요구) |

해석: 오너의 "전부 승인"을 방향 승인 + 위 1–3 추천안 적용으로 기록했다. 다르면 오너가 정정한다.

## 7. 검수

- 디자인 스킬 검수는 필수다 (오너, 2026-10-16): impeccable critique, emil-design-eng.
- `design-taste-frontend`는 랜딩·마케팅 페이지용이고 앱 화면은 대상이 아니라고 스킬 설명이 밝힌다. 그래서 앱 화면 검수에는 쓰지 않는다.

## 8. 나머지 화면 (4단계, 2026-10-16)

Figma `14 Redesign B`. audit 모든 count 0. Library publish 없음, 기존 master·Variable 값 변경 없음.

- 추가 컴포넌트 (398:77): B/Input 421:805, B/Chip 421:812, B/Keypad key 421:825, B/Keypad 421:888, B/Amount display 422:636, B/Status hero 422:667, B/Skeleton row 422:668, B/Empty state 422:674, B/Switch row 422:699, B/Secret grid 426:2044, B/Settings row 426:2045 (Show value, Show chevron).
- `B Screens · Send & Activity` 423:642 (24장): S10N, S10P, S20a ×2, S20b ×3, S22L, S22L+ACK, S22B, S22T, S24, S23 ×6, S40 empty/loading/error, S41 Confirmed/Unknown, S11.
- `B Screens · Onboarding & Settings` 423:13439 (18장): S01–S06, S30(+Dark), S31, S50, S60–S63, S90–S92.
- 보내기 단계 제목은 온보딩과 같은 패턴 (뒤로 줄 + Title 1).

### 검수 (impeccable critique + emil, 2026-10-16)

반영: 보내기 직전 안내를 Warning notice로, Unknown의 "다시 보내지 말고…"를 Warning notice로, 금액 초과를 Danger notice로, 보내기 제목 크기, S41 Confirmed CTA 제거, ⚠는 행동 필요·위험에만 (나머지 ⓘ), 내역 부제 "{자산} · {시각}", 한국어 단어 중간 줄바꿈 수동 줄바꿈.

기각: 회색 글자 대비 부족 지적. `text/tertiary` light #505C6C는 흰 배경에서 약 6.8:1 (축소 PNG 추정 오류).

코드 단계로 넘김: hit target 44, press scale·sheet·skeleton 모션, 복사 완료 상태.

### 5단계로 넘긴 것

- `overlay/scrimOpacity` 0.4 → 40 (scope 0–100). S50 scrim은 지금 literal 0.4.
- 헤더 "…" 24px 아이콘, Status hero Unknown 아이콘 색 (지금 neutral).
- 09 Icons에 QR 아이콘 추가 (지금 "QR 코드 스캔" 텍스트 링크).

### 오너 결정 (2026-10-16)

| # | 항목 | 결정 |
|---|---|---|
| 12 | 5단계 | 진행. 기존 master 반영, Variable 수정, Library publish |
| 13 | 소각·토큰 컨트랙트 주소 | 비슷한 주소처럼 확인 sheet (S22B+ACK, S22T+ACK) |
| 14 | Dark 범위 | 전체 화면 |

남은 것: 버전 값 "1.0.0"은 placeholder.

### 5·6단계 결과 (2026-10-16)

- 기존 master 12개 in-place restyle, ID·property·variant ID 유지 (`work/v7/verification/`).
- Product B 텍스트 스타일 10개 Pretendard로 교체. tnum은 Figma에서 설정 불가 (설치된 Pretendard에 Numbers spacing 옵션 없음) → 앱 코드에서 `tabular-nums`.
- Library publish 완료: 57개 변경 (`work/v7/verification/publication-proof.json`).
- 남은 것: 구독 파일 업데이트·override 유지 확인 (C23 포함), 페이지 14 section 겹침 정리, 페이지 12 200% 기존 override 겹침 (기록만).
