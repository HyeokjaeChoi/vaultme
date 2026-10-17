# VaultMe Icons 사용 안내

상태: 현행 Icon 계약 · 문서 갱신: 2026-10-17

범위: Solar(Linear·Bold·Bold Duotone)·identity·foreground·접근성·license

[문서 홈](README.md) · [현재 release](vaultme-release.json) · [변경 이력](vaultme-v2-change-log.md)


**Icon은 목록을 빠르게 읽게 한다. 결정에 필요한 글자는 유지한다.** 기능 icon은 Solar다(오너 결정 2026-10-17, Phosphor 대체). 자산 identity는 별도 원본 color SVG다. [Catalog](wallet-icon-catalog.html)에서 실제 모양과 출처를 확인한다.

## 0. Solar 스타일 (오너 결정 2026-10-17)

| 스타일 | 용도 | Figma 이름 규칙 | 크기 |
| --- | --- | --- | --- |
| Linear | 기본 UI. 행동·내비게이션 기본·상태 기본 | `Icon / <role> / <name>` (기존 master ID·이름 유지) | 기존 크기 유지(대부분 20, `qr`·`more` 24) |
| Bold | 선택된 탭, 상태 badge, 활성 상태 | `Icon / <role> / <name> / bold`, B/Row badge | 20 (badge 글리프 18 안 15) |
| Bold Duotone | 빈 상태·결과 hero | `Icon / hero / <name>` | 48 |

- Duotone 보조 층은 같은 역할 색 변수를 50% 투명도로 쓴다. raw hex는 없다.
- Bold는 Linear를 대신하지 않는다. 같은 화면에서 선택 표시(탭 active)나 상태 badge에만 쓴다.
- Linear와 Bold는 같은 `icon.*` alias를 쓴다. Linear 원본 stroke는 Figma에서 윤곽선(fill)으로 변환했다. 그래서 master 색은 fill 하나에 연결된다(INSTANCE_SWAP 규칙 13 유지).
- 자산 identity SVG(ETH, USDC)는 그대로다. Solar가 아니다.

### 0.1 매핑 (Phosphor → Solar Linear)

| Figma master (ID) | Solar 이름 | 비고 |
| --- | --- | --- |
| `Icon / action / send` 137:6 | `arrow-right-up` | |
| `Icon / action / receive` 137:24 | `arrow-left-down` | |
| `Icon / account` 137:41 | `wallet` | |
| `Icon / status / pending` 137:58 | `clock-circle` | Bold 추가 |
| `Icon / status / confirmed` 137:75 | `check-circle` | Bold 추가 |
| `Icon / status / warning` 137:92 | `danger-triangle` | Bold 추가 |
| `Icon / status / failed` 137:110 | `close-circle` | Bold 추가 |
| `Icon / status / unknown` 137:127 | `question-circle` | Bold 추가 |
| `Icon / action / copy` 137:144 | `copy` | |
| `Icon / navigation / back` 137:161 | `arrow-left` | |
| `Icon / status / loading` 137:178 | `restart` | |
| `Icon / navigation / forward` 137:196 | `arrow-right` | |
| `Icon / status / info` 137:213 | `info-circle` | Bold 추가 |
| `Icon / selection / checked` 137:230 | `check` | |
| `Icon / navigation / disclosure` 137:247 | `alt-arrow-right` | chevron |
| `Icon / action / close` 137:264 | `close` | |
| `Icon / navigation / settings` 137:282 | `settings` | Bold 추가 |
| `Icon / navigation / activity` 137:299 | `history` (2026-10-17, 전에는 `list`) | Bold 추가. 아래 "내역 탭 아이콘" |
| `Icon / action / connection` 137:316 | `link-round` | |
| `Icon / asset / fallback` 137:333 | `dollar-minimalistic` | 자산 identity 없음 fallback |
| `Icon / action / refresh` 137:350 | `refresh` | |
| `Icon / action / request` 137:368 | `hand-money` | |
| `Icon / account / backup` 137:385 | `shield-check` | |
| `Icon / action / backspace` 330:2747 | `backspace` | |
| `Icon / action / qr` 434:230 | `qr-code` | 24 |
| `Icon / action / more` 434:235 | `menu-dots` | 24 |
| 새 `Icon / navigation / assets` 506:24468 | `home-2` | 기존 Assets 탭은 wallet(`Icon / account`)을 썼다. 오너 매핑(home/assets)에 따라 home으로 바꿨다 |

아직 Figma master가 없는 후보(코드에서 필요하면 같은 규칙으로 추가): `share`(share), `external`(`square-arrow-right-up`), `eye`/`eye-closed`, `bell`, `lock-keyhole`, `key`, `face`(`face-scan-circle`), `network`(`global`), `trash`(`trash-bin-minimalistic`). 모두 Solar에 Linear·Bold·Bold Duotone이 있다.

### 0.2 새 component (추가만, 게시 안 함)

| 종류 | 이름 | ID |
| --- | --- | --- |
| Linear | `Icon / navigation / assets` | 506:24468 |
| Bold | `Icon / navigation / assets / bold` | 506:24479 |
| Bold | `Icon / navigation / activity / bold` | 506:24486 |
| Bold | `Icon / navigation / settings / bold` | 506:24493 |
| Bold | `Icon / status / pending / bold` | 506:24500 |
| Bold | `Icon / status / confirmed / bold` | 506:24507 |
| Bold | `Icon / status / failed / bold` | 506:24514 |
| Bold | `Icon / status / warning / bold` | 506:24521 |
| Bold | `Icon / status / info / bold` | 506:24528 |
| Bold | `Icon / status / unknown / bold` | 506:24535 |
| Duotone 48 | `Icon / hero / receive` (`inbox-in`, 빈 내역) | 506:26134 |
| Duotone 48 | `Icon / hero / success` (`check-circle`) | 506:26142 |
| Duotone 48 | `Icon / hero / failed` (`close-circle`) | 506:26149 |
| Duotone 48 | `Icon / hero / pending` (`clock-circle`) | 506:26156 |
| Duotone 48 | `Icon / hero / unknown` (`question-circle`) | 506:26163 |
| Duotone 48 | `Icon / hero / shield` (`shield-check`, 백업) | 506:26171 |
| Linear | `Icon / account / key` (`key-minimalistic`, 복구 구문) | 516:235 |
| Linear | `Icon / settings / bell` (`bell`, 거래 알림) | 516:244 |
| Linear | `Icon / settings / eye` (`eye`, 0원 거래 표시·탭해서 보기) | 516:253 |
| Linear | `Icon / settings / network` (`global`, 네트워크) | 516:264 |
| Linear | `Icon / status / device-warning` (`shield-warning`, 기기 보안 경고·백업 필요) | 516:274 |
| Duotone 48 | `Icon / hero / face` (`face-scan-circle`, 잠금 Face ID 진행) | 516:288 |

Navigation `Product navigation` 67:342는 선택된 항목에 Bold, 나머지에 Linear를 쓴다(`icon.navigation.activeFg` 계열 색은 기존 Component 변수 그대로). `B/Row badge` 495:358의 글리프는 Solar Bold 원형(`round-arrow-right-up`, `round-arrow-left-down`, `clock-circle`, `close-circle`, `check-circle`, `question-circle`, `refresh-circle`)이다.

## 1. 용도

| 위치 | Icon | 함께 표시할 내용 |
| --- | --- | --- |
| 주요 행동 | Send, Receive, Connection, Refresh | 행동 label. Send·Approve·Sign·Revoke를 서로 구분 |
| 계정 | Wallet | 계정 이름. Review에서는 전체 주소 |
| Network | Ethereum identity | network 이름. 로고는 지원 network 구현이나 인증을 뜻하지 않음 |
| 자산 | ETH·USDC 원본 identity | 이름·symbol·balance. 미확인 자산에는 중립 fallback과 이름 |
| 상태 | Pending, Confirmed, Failed, Warning, Info, Unknown | 정확한 label과 이유. 검사 결과와 완료 사실을 구분 |
| Navigation | Assets, Activity, Settings | visible label과 선택 상태 |

Redesign B(2026-10-16)에서 기능 icon 2개를 추가했다: `Icon / action / qr`(Solar `qr-code`, Linear, 24, alias `icon.action.fg`, 접근 이름 "QR 코드 스캔")와 `Icon / action / more`(Solar `menu-dots`, Linear, 24, alias `icon.action.fg`, 접근 이름 "더 보기"). icon-only control이므로 44 px target이 필요하다. Local 기능 25개 + identity 2개 = 27개. QR icon은 QR 기능 구현이나 인증을 뜻하지 않는다.

Account, network, asset, recipient/spender, amount/allowance, estimated fee, action status는 Review에서 생략하지 않는다. Full address와 warning도 유지한다. Icon·색만으로 안전성이나 성공을 전달하지 않는다. 같은 network의 Asset row는 상단 context의 반복 label만 생략한다. 다른 network의 행에는 label을 남긴다.

## 2. 크기와 색 alias

16 / 20 / 24 / 32 px의 기존 scale을 사용한다. Hero(Bold Duotone)는 48 px다. Solar 원본 격자는 24이고 stroke는 1.5다. 20 px master는 stroke 1.25로 줄여서 윤곽선으로 변환했다. Icon 크기와 클릭 target은 다르다. Target은 최소 44 × 44 px다. Raw 값 추가 없이 기존 Primitive → Semantic → Component를 연결한다.

| Component 경로 | Alias / 용도 |
| --- | --- |
| `icon.size.inline/control/feature` | `iconSize.inline/control/feature`: 16/20/24 px |
| `icon.action.fg` | `{icon.primary}`: 일반 행동 |
| `icon.action.onPrimary` | `{action.primary.fg.default}`: Blue Primary 위 white |
| `icon.account.fg`, `icon.account.size` | `{icon.primary}`, `{iconSize.control}` |
| `icon.network.size`, `icon.network.fallbackFg` | `{iconSize.inline}`, `{icon.secondary}` |
| `icon.asset.size`, `icon.asset.fallbackFg` | `{iconSize.asset}`: 32 px, `{icon.secondary}` |
| `icon.navigation.fg`, `icon.navigation.activeFg` | `{icon.secondary}`, `{icon.primary}`. 선택 표시는 기존 active state도 유지 |
| `icon.status.pending/warning` | `{status.warning.fg}` |
| `icon.status.confirmed` | `{status.success.fg}`: 확인한 완료만 |
| `icon.status.failed/info/unknown` | `status.danger/info/unknown.fg` 각각 alias |
| `icon.status.clear` | `{check.clear.fg}`: 제한된 검사 결과. 안전 보증 아님 |

Semantic `iconSize.asset={size.avatar_sm}`와 Component `icon.*` 20개를 추가했다. 기존 경로는 유지한다. Functional SVG의 `currentColor`는 문맥의 foreground에 연결한다. Asset logo의 원본 fill·opacity는 유지한다. Logo를 action blue로 바꾸지 않는다. 웹 identity는 `<img>`로 표시해 기능 SVG의 `fill:currentColor`와 분리한다.

## 3. 접근성

- Label 옆 SVG와 img는 `aria-hidden="true"`다. 같은 이름을 두 번 읽지 않게 한다.
- Icon-only control에는 행동을 설명하는 `aria-label` 등 accessible name을 둔다. 예: `Copy recipient address`, `Close review`.
- 중요한 금융 행동은 icon + visible label을 사용한다. Tooltip만으로 설명하지 않는다.
- 44 px target, focus ring, keyboard order와 disabled 이유를 유지한다. Glyph가 있다고 동작을 구현한 것은 아니다.
- 금액·warning·확인 행동에 icon 애니메이션을 추가하지 않는다.

## 4. 관측과 선택의 근거

이전(Phosphor 시기) browser 조사에서 [21st.dev Phosphor](https://21st.dev/community/icons/phosphor)의 Wallet Details를 확인했다. Author `Phosphor Icons`, MIT 링크와 React/SVG/Vue/React Native 형식 선택을 관측했다. `wallet` 검색은 관련 항목도 반환했다. Ethereum 검색의 `currency-eth`는 기능 glyph이며 원본 자산 identity와 다르다. 이 화면 확인을 전체 product flow 조사로 확대하지 않는다. [Browser 기록](../work/research-v2/icons/21st-browser-observations.json).

| Source | License / 사용 |
| --- | --- |
| [Solar Icon Set](https://github.com/480-Design/Solar-Icon-Set) (480 Design) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 원문. 출처 표시가 필요하다. Linear·Bold·Bold Duotone 사용. 표시 문구는 아래 "출처 표시"를 따른다. 변경 사항: 크기 조정, Linear stroke를 윤곽선으로 변환, 색을 `icon.*` 변수에 연결 |
| [`@solar-icons/react-native` 2.3.2](https://www.npmjs.com/package/@solar-icons/react-native) | MIT. RN 패키지(코드). 아이콘 그림 자체의 license는 위 CC BY 4.0이다 |
| Phosphor core (이전) | MIT. 2026-10-17에 Solar로 대체했다. 코드(`apps/mobile`)가 Phosphor를 쓰는 동안은 MIT notice를 유지한다 |
| [Cryptocurrency Icons](https://github.com/spothq/cryptocurrency-icons) | [CC0-1.0 원문](https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/LICENSE.md). Community ETH·USDC identity 2개. Issuer 인증이나 최신 공식 brand palette로 주장하지 않음 |

**출처 표시(필수, 앱 정보·라이선스 화면과 이 문서):** "Icons by 480 Design — Solar Icon Set, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Changes were made: resized and recolored."

ETH `#627EEA`, USDC `#3E73C4`는 원본 artwork 색이다. VaultMe canonical palette 변경이 아니다. 서로 다른 기능 icon library를 섞지 않는다. [Source 연구](../work/research-v2/icons/research.md), [계획](../work/research-v2/icons/icon-plan.md), [Native manifest](../work/research-v2/icons/figma-assets.json).

## 적용과 재사용

Figma의 `INSTANCE_SWAP`은 vector foreground를 초기화할 수 있다. Swap 뒤 가장 구체적인 문맥 Component token을 다시 연결하고 frame을 확인한다. Primary icon은 `icon.action.onPrimary`의 white다. Disabled는 Button의 disabled foreground를 따른다. 웹 기능 icon은 문맥의 `currentColor`를 따른다.

`Icon`/`ShowIcon`, `AssetIcon`, `NetworkIcon` property는 additive다. 기존 master ID와 property 계약을 보존한다. Asset logo의 고유 fill은 유지한다. Icon이 있다고 연결·서명·revoke 기능이 구현된 것은 아니다.

Local 파일, native source, Library publication, consumer adoption은 각각 확인한다. 현재 결과는 [release record](vaultme-release.json)를 따른다. 이전 제한된 browser 관측은 [변경 이력](vaultme-v2-change-log.md)에서 찾는다.

## 내역 탭 아이콘 (2026-10-17, 최종 검수 P2-14)

후보 2개를 비교했다. `history`를 골랐다.

| 후보 | 장점 | 단점 |
| --- | --- | --- |
| `history` (시계 + 되돌아가는 화살표) | "지난 일, 시간 순서"를 바로 뜻한다. 탭 바의 다른 아이콘(home, settings)과 모양이 겹치지 않는다 | 시계만 보면 "예약"으로 읽을 수도 있다. 라벨 "내역"이 함께 있어 문제가 없다 |
| `clipboard-list` (클립보드 + 줄) | 목록이라는 뜻은 분명하다 | 설정 "오픈소스 라이선스" 행의 `document-text`와 모양이 비슷하다. 문서·할 일로 읽힌다. 이전 `list`처럼 정렬·메뉴로 읽힐 위험이 남는다 |

- 바꾼 곳: master 2개의 artwork만 바꿨다. ID와 property는 그대로다. `Icon / navigation / activity` 137:299 (Linear, `icon/navigation/fg`, stroke 1.5/24), `Icon / navigation / activity / bold` 506:24486 (Bold, `icon/navigation/activeFg`). Product navigation(67:342)은 이 master를 instance로 쓰므로 모든 탭 바가 함께 바뀌었다.
- 코드: Solar `HistoryLinear` / `HistoryBold` (Solar icon set, CC BY 4.0, 480 Design).

## 오류 hero 아이콘 (2026-10-17, 최종 검수 P2-5)

- 새 `Icon / hero / cloud-cross` 541:238 (Solar `cloud-cross` Bold Duotone 48, `icon/status/warning`, 뒤 층 50%). 내역을 불러오지 못한 빈 상태(S40 error-noCache)에 쓴다.
- Unknown 결과의 `Icon / hero / unknown`(`question-circle`)은 결과를 모를 때만 쓴다. 연결 오류와 섞지 않는다.
- S31 백업 필요 hero는 `Icon / hero / shield-warning` 533:21900을 경고 색(`icon/status/warning`)으로 쓴다. 체크가 있는 `shield-check`은 "백업 안 됨"에 쓰지 않는다.
- `Icon / hero / shield-warning`의 Light 분홍빛은 마스터 Duotone 규칙(같은 역할 색 + 뒤 층 50%) 그대로다. S92 instance에 override는 없었다 (P2-16 확인).

