# VaultMe Foundation 사용 안내

상태: 현행 사용 규범 · 문서 갱신: 2026-10-04

범위: Light Foundation의 값·색·type·layout·motion·재사용

[문서 홈](README.md) · [현재 release](vaultme-release.json) · [변경 이력](vaultme-v2-change-log.md)


**계정·자산·금액·권한·거래 상태를 서명 전에 읽게 한다.** 값의 원본은 [token JSON](wallet-foundation.tokens.json)이다. 문서는 [v2 확정 계획](../work/research-v2/planning/redesign-plan.md)을 따른다. 현재 적용 상태는 [release record](vaultme-release.json), 과거 결과는 [변경 이력](vaultme-v2-change-log.md)에서 확인한다.

## 1. 먼저 할 일

1. UI를 만들기 전에 [DESIGN](VaultMe-DESIGN.md)을 읽는다.
2. [Component 계약](wallet-component-contracts.md)에서 필요한 C01–C28과 상태를 고른다.
3. 가장 구체적인 Component token을 사용한다. 없으면 Semantic token을 사용한다.
4. [Figma source Library](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8)에서 master instance를 조립한다.
5. 실제 내용과 상태를 확인한다. Variant 이름만 바꾸면 완료가 아니다.

현재 산출물은 design system이다. 로컬 Review artifact는 합성 데이터를 사용하는 Prototype이다. 실제 지갑 연결, 서명, chain 계산, 지원 network, key 보관 또는 보안 성능을 뜻하지 않는다.

## 2. 값은 한 곳에서 관리한다

`wallet-foundation.tokens.json`이 원본이다. `packages/tokens/build.mjs`가 앱용 token을 생성한다. JSON은 `primitive`, `semantic`, `semanticDark`, `component` 네 Token Set을 사용한다. `semanticDark`는 Dark mode에서 `semantic` 값을 덮어쓰고, `packages/tokens/build.mjs`가 이를 적용한다. Alias 경로에는 Set 이름을 넣지 않는다.

```text
Primitive: color.neutral.900 = #11161D
Semantic: text.primary = {color.neutral.900}
Component: transactionPanel.address = {text.primary}
```

| Layer | 역할 | 수정 규칙 |
| --- | --- | --- |
| Primitive | 원시 색·크기·type·shadow | 새 raw 값은 여기만 추가 |
| Semantic | 역할: text, surface, typography, layout | 정확한 단일 alias |
| Component | 특정 사용 위치 | 정확한 단일 alias. 가장 구체적인 경로를 UI에 사용 |

복합 typography의 raw 속성도 Primitive에 둔다. Typography와 shadow의 CSS·Figma 표현은 generator에서 만든다. 생성된 CSS를 별도 theme source로 편집하지 않는다. [Tokens Studio 참조 문서](https://docs.tokens.studio/manage-tokens/token-values/references/), [타입 문서](https://docs.tokens.studio/manage-tokens/token-types/).

## 3. 색의 출처와 역할

제공된 1024 × 1536 landing image가 시각 기준이다. 관측 값은 균일한 영역의 빈번한 RGB이며 전체 이미지를 정확히 복제한 값은 아니다.

| Anchor | 값 | 출처 / 용도 |
| --- | --- | --- |
| Canvas | `#FBFCFE` | 이미지 관측. 밝은 화면 |
| Ink | `#11161D` | 이미지 관측. 주요 글자. 기존 Ink CTA는 Blue A 승인 전 기준 |
| Brand tint | `#DCE8FD` | 이미지 관측. 옅은 보조 면 |
| Success tint | `#E9FDF1` | 이미지 관측. 완료 사실 |
| Danger tint | `#FBE8E9` | 이미지 관측. 오류·위험 |
| Warning / Unknown | 기존 amber / neutral scale | product state 확장. 이미지 관측 아님 |
| Control outline | `neutral.450 #808D9D` | v1 contrast 보정. 이미지 관측 아님 |

사용자는 Borderless와 Blue A 업데이트를 승인했다. Generator의 Primary는 default `#3152FF`, hover `#2944DB`, pressed `#2138B8`, foreground white다. Secondary surface는 기존 `#DCE8FD`와 Ink text를 사용한다. Secondary action은 neutral을 유지한다. Blue A는 공식 업계 UI 조사와 VaultMe의 행동 위계를 반영한 승인된 brand 확장이다. 이미지에서 관측한 색이라고 기록하지 않는다. 새 raw brand 값은 Primitive에만 두고 Semantic과 Component로 alias한다. 전체 Light 방향과 기존 image anchors는 유지한다.

Blue A는 action 역할이다. Success, 가격 gain, 안전성 의미로 사용하지 않는다. Secondary surface 위 Blue A 글자는 4.4967:1이므로 일반 text 4.5:1 기준에 미달한다. 그 위치에는 Ink를 사용한다. 가격의 기간별 변화에는 `financial.change.*`를 사용한다. 보내는 `−`와 받는 `+`를 가격 손익으로 해석하지 않는다.

`check.clear`는 **수행한 검사에서 문제를 찾지 못한 상태**다. 중립 면을 사용한다. `status.success`는 확인된 완료 사실에만 사용한다. 색과 함께 icon·label·이유를 표시한다. 하단 Dark CTA는 marketing 장면이며 Dark 제품 theme가 아니다.

### 실제 색 alias

| Layer / 경로 | 연결 |
| --- | --- |
| Primitive `color.identity.blue.600`, `color.identity.blue.700`, `color.identity.blue.800` | default/hover/pressed 승인 값 |
| Semantic `brand.primary` | `{color.identity.blue.600}` |
| Semantic `brand.secondary` | `{color.brand.100}` |
| Semantic `navigation.active` | `{brand.primary}` |
| `action.primary.bg.default/hover/pressed` | brand.primary / identity blue .700 / .800 |
| `productNavigation.active` | `{navigation.active}`. Marketing navigation의 기존 경로와 구분 |
| `border.focus`, `border.selected`, `icon.brand` | `{brand.primary}` |
| `text.link` | `{color.neutral.900}` (Dark `{color.neutral.50}`). 2026-10-17부터 Ink. 밑줄이나 화살표와 같이 쓴다. 파랑이 아니다 |

Status, financial.change, check.clear의 기존 색은 유지했다. Secondary action은 neutral. Default/hover/pressed는 기존 neutral 200/300/400에 연결한다 (2026-10-13 변경: canvas가 neutral 50이 된 뒤 default가 canvas와 같아져 버튼이 보이지 않았다). 이는 Secondary 브랜드 surface와 다른 역할이다.

### Surface 위계: 평평한 흰색 (Redesign B, 2026-10-16)

Redesign B는 `screenB/bg`(`{surface.default}`, 흰색) 한 면 위에 list row, section 제목, 간격으로 정보를 묶는다. Card는 묶음이 꼭 필요할 때만 쓴다. 아래 C23 Secondary tint 설명은 Redesign B 이전(2026-10-04) 기록이며, restyle한 master에서는 C23에 tint fill이 없다(flat). `surface.canvas`는 기존 화면이 쓰므로 값을 바꾸지 않았다.

(이전 기록) Wallet Home은 Light canvas → C23 요약 → 흰색 데이터 목록 순서로 구성했다. C23의 넓고 낮은 Secondary tint는 한 곳에 뒀다. Assets·Activity·Settings·Review에 tint hero를 반복하지 않는다. Navigation은 기존 neutral 면과 active marker를 사용한다. Blue A는 Primary action·active·focus 역할이다.

C23의 Complete/Partial/Unavailable은 같은 tint를 쓴다. 수치·통화·estimate·coverage는 모두 Ink다. Quote 상태는 문구와 누락 범위로 구분한다. Passive balance는 클릭 가능한 card가 아니다. C23에는 shadow와 장식 border를 넣지 않는다. C04 안에 C23를 다시 넣지 않는다.

| Layer / 경로 | 단일 Alias | 역할 |
| --- | --- | --- |
| Semantic `surface.portfolioSummary` | `{surface.brandTint}` | C23 대표 요약 면 |
| Semantic `effect.overlayShadow` | `{elevation.md}` | 기존 floating overlay의 shadow |
| Semantic `effect.modalScrimOpacity` | `{opacity.40}` | 기존 modal scrim의 불투명도 |
| Component `portfolioBalance.bg` | `{surface.portfolioSummary}` | 모든 Quote root fill |
| Component `portfolioBalance.padding` | `{layout.screen.padding}` | 내부 여백. 높이는 내용에 따라 증가 |
| Component `portfolioBalance.radius` | `{shape.group}` | 요약 묶음의 모서리 |
| Component `portfolioBalance.borderWidth` | `{borderWidth.none}` | 기본 외곽 border 없음 |
| Component `portfolioBalance.note` | `{text.primary}` | 기존 `text.secondary` 연결을 Ink로 변경 |
| Component `overlay.bg` / `overlay.fg` | `{surface.raised}` / `{text.primary}` | 기존 floating host의 읽기 면·기본 글자 |
| Component `overlay.radius` / `overlay.shadow` | `{shape.overlay}` / `{effect.overlayShadow}` | 기존 floating host 모서리·shadow |
| Component `overlay.scrimBg` / `overlay.scrimOpacity` | `{color.neutral.950}` (2026-10-16 변경: mode 불변, 이전 `{surface.inverse}`) / `{effect.modalScrimOpacity}` | Modal의 뒤 화면 차단 층 |

`overlay.*`는 기존 host의 내부 역할이다. 새 C29나 public API가 아니다. Scrim opacity는 scrim에만 적용한다. Nonmodal popover에는 scrim이 없다. 고정 drawer는 기존 기능 경계선을 사용한다. Floating shadow를 C23·row·Input·review group·notice에 확대하지 않는다. 자식 Component의 상태 foreground가 기본 overlay 글자보다 우선한다.

Canvas·summary·navigation·row·review·notice·drawer에는 gradient가 없다. Landing의 기존 Dark closing CTA와 작은 임시 feedback toast의 inverse 조합은 유지할 수 있다. Toast에는 필수 Review 정보나 유일한 오류 설명을 넣지 않는다. Modal scrim은 읽기 면이나 Dark theme가 아니다.

이 변경은 기존 Primitive를 재사용하는 승인된 역할 확장이다. 새 raw 값은 없다. [Surface 계획](../work/research-v4/fintech-surface/vaultme-surface-enhancement-plan.md)과 [공개 System 근거](../work/research-v4/fintech-surface/public-design-system-reference-map.md)는 설계 결정의 출처다. Native 적용·publication·consumer adoption 결과는 새 변경의 실제 증거로 확인한다. 과거 release 결과를 새 alias의 검증으로 읽지 않는다.

### Surface 적용 확인 · 2026-10-04

[Native source review](../work/v4/verification/native/native-review-proof.json)에서 C23의 세 Quote와 P01/P02·P05 배경 Home의 tint·Ink·기존 IDs를 확인했습니다. PNG review에는 흰색 P04 Review·독립 P05 drawer·긴 값·좁은 폭·Partial/Unavailable이 포함됩니다. Source는 10 pages·693 native Variables입니다. Managed 690개와 legacy easing STRING 3개입니다. Text Styles 23개·Effect Styles 3개를 유지합니다. Portable JSON은 796 tokens입니다. Primitive 203개·Semantic 105개·Component 488개입니다.

신규 native scalar Variables는 11개입니다. Shadow alias `effect.overlayShadow`와 `overlay.shadow`는 `nativeType=null`입니다. 기존 `elevation/md` Effect Style로 연결합니다. 감사한 native pages에는 floating dialog/popover/scrim host가 0개였습니다. 새 host를 만들지 않았습니다. `overlay.*`의 native host 채택은 해당 host가 실제로 있을 때 확인합니다. 독립 drawer는 기존 transactionPanel·footer·경계 역할을 사용합니다.

[Web observation](../work/v4/verification/web/browser-observation.json)은 375/390/768/1440 px 화면의 C23 overflow 없음과 explicit text200 Partial 줄바꿈을 기록합니다. 독립 web consumer는 세 Quote·longBalance override·320 px overflow 없음·기존 form feedback을 확인했습니다. 합성 overlay의 Escape close와 trigger focus return도 확인했습니다. Text200은 browser zoom 검사가 아닙니다. Manual screen reader·실제 wallet 검증은 미확인입니다.

**Surface Library publication과 독립 Figma consumer 적용을 확인했습니다.** [Publication proof](../work/v4/verification/native/publication-proof.json)은 Semantic·Component·C23와 별도 review한 Product navigation·Status label의 순차 발행을 기록합니다. Source UI에는 남은 미발행 indicator가 없습니다. Published asset 수는 85개입니다.

[Figma consumer proof](../work/v4/verification/native/consumer-surface-proof.json)는 기존 Button/Input/Transaction panel 세 remote instance의 update 전후 override 보존과 새 C23 세 Quote·longBalance의 발행 후 채택을 구분합니다. 새 C23의 update 전후 override 보존은 아직 검증하지 않았습니다. [Web consumer proof](../work/v4/verification/web/consumer-web-proof.json)는 합성 C23와 기존 form·preview overlay의 제한된 browser 결과입니다. 실제 wallet·전체 runtime·manual screen reader 검증이 아닙니다. Package 완료는 이 문서에서 선언하지 않습니다. Current release의 별도 결과를 확인합니다.

## 4. Typography

제품 UI 글꼴은 Pretendard 400/500/600, 주소·hash는 IBM Plex Mono다. 700은 큰 숫자(`type.productB.figure`)에만 쓴다(오너 결정 2026-10-17). Figma는 오너가 글꼴을 바꾸기 전까지 임시로 Gothic A1을 쓴다. 금액은 tabular numerals다. 기존 `Product /` 역할(Inter 기준)과 marketing type scale은 값을 바꾸지 않았다. Redesign B의 `Product B` 척도는 새 Primitive `type.productB.*`(font family `pretendard`)로 추가했다. Semantic `typography.*` alias는 아직 연결하지 않았다.

| `type.productB.*` | Size / line | 자간(px) | Weight |
| --- | --- | --- | --- |
| `figure` | 44 / 52 | -1.2 | 700 (잔액·금액 숫자만, tabular) |
| `figureUnit` | 24 / 32 | -0.5 | 600, 색 `text.secondary` |
| `displayL` | 40 / 48 | -1.2 | 600 |
| `displayM` | 32 / 40 | -0.8 | 600 |
| `title1` | 26 / 34 | -0.6 | 600 |
| `title2` | 22 / 30 | -0.5 | 600 |
| `title3` | 19 / 27 | -0.4 | 600 |
| `headline` | 17 / 25 | -0.3 | 600 (버튼·알림 제목·강조) |
| `rowTitle` | 17 / 25 | -0.3 | 500 (행 제목: Home 자산·내역 행, 설정·라이선스 행, Action row, Switch row). Figma `Product B/Row title`. 600은 버튼·강조, 700은 숫자(figure)에만. 2026-10-17 미감 리뷰 P1-1 |
| `body` | 16 / 24 | -0.3 | 400 |
| `bodySmall` | 15 / 22 | -0.2 | 400 |
| `label` | 14 / 20 | -0.2 | 500 |
| `caption` | 12 / 17 | -0.1 | 400 |
| `address` | 14 / 20 | 0 | 400 Plex Mono |

한글에 맞춰 모든 크기에 음수 자간을 쓴다(양수 없음). 2026-10-17 오너 승인. `font.tracking.headline|body|figure|figureUnit`은 새 Primitive다. Figma 텍스트 스타일은 오너가 데스크톱 앱에서 바꾼다(`Product B/Figure`, `Product B/Figure unit` 신규).

JSON 자간은 build가 퍼센트만 px로 바꾸므로 `font.tracking.*`에 퍼센트로 저장했다(예: displayL -3% × 40 = -1.2 px).

기존 `Product /` 역할 표(v2 확정값): 제품 화면에는 아래 역할을 사용한다. 이는 v2 확정값이며 peer product의 실측 폰트값이 아니다.

| Semantic role | Size / line | Weight | 사용 |
| --- | --- | --- | --- |
| `typography.title` | 24 / 32 px | Semi Bold | 제품 화면 제목 |
| `typography.section` | 16 / 24 px | Semi Bold | 목록·section 제목 |
| `typography.balance` | 40 / 48 px | Medium | 한 화면의 주요 총액 |
| `typography.amountHero` | 40 / 48 px | Bold | 보내기 금액 단계와 검토 화면의 보낼 금액 (화면당 하나) |
| `typography.amount` | 32 / 40 px | Medium | 금액 입력 |
| `typography.reviewAmount` | 28 / 36 px | Medium | 서명 전 핵심 금액 |
| `typography.row` | 16 / 24 px | Medium | 자산명·수량·Activity 금액 |
| `typography.body` | 14 / 20 px | Regular | 설명·필수 metadata |
| `typography.label` | 14 / 20 px | Semi Bold | field·review label |
| `typography.meta` | 12 / 18 px | Medium | 보조 시간·문서 caption |
| `typography.address` | 14 / 20 px | Regular Mono | 전체 주소·hash |

Figma 제품 Style 이름은 `Product / Title` 등이다. 기본 제품 TEXT는 역할 Style에 연결한다. T02의 직접 font-size override는 아래 검증 예외를 따른다. 웹 숫자는 tabular numerals와 우측 정렬을 사용한다. Native Figma의 TNUM 적용은 미확인이다. 금액과 단위를 함께 둔다. 중요한 주소·fee·오류는 14 px 이상이다. 금액은 ellipsis로 자르지 않는다. 아주 작은 수량은 전체 정밀도 문자열을 Review에도 표시한다.

### Button · pill (Redesign B)

Button은 pill이다. 높이 lg 56 / md 48 / sm 40(`size.pill_lg/md/sm`, 새 Primitive), 실제 target은 기존 `button.hitTarget` 44 px 이상을 유지한다. Component `buttonB.*`는 alias만 둔다: `height.lg|md|sm` → `size.pill_*`, `radius` → `radius.pill`, `paddingX.lg|md|sm` → `space.6|5|4`, `primary.bg|fg` → `button.primary.bg.default|fg.default`, `primary.bgDisabled` → `surface.disabled`(neutral.100), `primary.fgDisabled` → `text.disabled`, `secondary.bg|bgPressed` → `surface.pressed`, `secondary.fg` → `text.primary`. 파랑 Primary는 화면당 1개이고 Secondary는 neutral이다. Bottom sheet는 위 모서리 32(`sheetB.radius` → `radius.3xl`)이며 Secondary를 Primary 위에 둔다. Row는 `rowB.height` → `size.asset_row`(64), `rowB.paddingX` → `layout.screen.padding`이다. 기존 `button.size.*` 값(44/52 기준)은 JSON에서 바꾸지 않았다. Figma master는 40/48/56으로 restyle했다.

### 불투명도 단위 (Figma만)

Figma `opacity/*` Primitive는 OPACITY scope가 퍼센트(0–100)라서 0, 8, 16, 24, 40, 56, 72, 100으로 바꿨다. portable JSON `primitive.opacity.*`는 fraction(0.4 등)을 유지한다. 이 단위 차이는 의도한 것이고, JSON 값은 바꾸지 않았다.

## 5. Layout과 밀도

| 항목 | 규칙 |
| --- | --- |
| Spacing | 기존 4 px scale. screen padding 16 px, product section gap 24 px, group gap 16 px, row gap 12 px, field gap 8 px |
| Asset row | min-height 64 px. 내용이 늘면 높이 증가 |
| Activity row | min-height 80 px. 내용이 늘면 높이 증가 |
| Row slots | icon 32 px → gap 12 px → body fill → value hug → accessory 20 px |
| Row padding | x 0 / y 12 px. inset 목록은 container에서 x 16 px |
| Controls | visual sm 36 / md 44 / lg 52 px. 실제 target은 모두 최소 44 × 44 px |
| Field | label → 8 px → input → 8 px → helper/error. 전체 높이 고정 금지 |
| Radius | row 0; field/button 12; review group/task 16; modal/sheet 24 px |
| Shadow | 목록·field·review group 없음. 떠 있는 dialog/popover에만 기존 `elevation.md` |
| Focus | 3 px ring + 2 px offset. 키보드로 항상 확인 가능 |

모든 자산 행을 80 px로 만들지 않는다. Permission·backup의 내용 높이도 고정하지 않는다. 기존 `*.height`는 compatibility 경로이며 새 화면에는 `*.minHeight` 또는 content height를 적용한다.

| Viewport | 구조 |
| --- | --- |
| 320–767 px | 16 px padding, 한 열, full-width review. table은 label을 가진 stacked item |
| 768–1199 px | content max 704 px, review max 480 px, compact navigation |
| 1200 px 이상 | content max 1200 px, 자산/Activity 2열, review drawer 480 px |

대표 frame은 390 × 844 mobile과 1440 × 1024 desktop이다. 기존 375 px 기준을 지우지 않는다. 390 px는 specimen preset이며 breakpoint가 아니다. 주소는 자연스럽게 줄을 바꾸고, 금액이 충돌하면 값 영역을 다음 줄로 옮긴다. Footer가 주소·warning을 덮지 않게 scroll 영역을 분리한다.

Marketing layout은 기존 mobile/tablet/desktop 4/8/12 columns, reading max 720 px, hero 5+7 columns를 유지한다. 제품 목록에 marketing section gap과 card shadow를 반복하지 않는다.

### Borderless 기본 규칙

일반 정보 container와 wallet row는 **borderless가 기본**이다. Type, 정렬, 기존 간격으로 같은 정보를 묶는다. 독립 task는 필요하면 한 surface를 사용한다. Tint·큰 gap·full border로 같은 의미를 반복하지 않는다. 선을 뺀 자리를 shadow나 과도한 여백으로 채우지 않는다.

| 경계 | 기본 | 기능상 예외 |
| --- | --- | --- |
| Card, notice, review panel, 주소 block | 외곽 stroke 없음 | 다른 task와 구별되지 않을 때 명시한 경계만 사용 |
| Asset, Activity, 연결·권한 목록 | 정렬·간격, 마지막 선 없음 | 긴 여러 줄 항목의 짝을 읽기 어렵거나 table 비교에 필요할 때 separator |
| Account·Network 선택 | row 외곽 box 없음, check·label·선택 면 | 선택을 읽기 어려울 때 보조 outline. 색만으로 선택 표시 금지 |
| Editable Input | 입력 영역을 알아볼 수 있는 경계 또는 동등한 표현 | label·helper/error, focus와 invalid 상태는 항상 유지 |
| Header·navigation·footer·drawer | 자동 반복 선 없음 | 고정 footer/toolbar와 scroll body, 독립 drawer 경계가 섞일 때 한 선 |

Amount wrapper는 내부 invalid 상태를 받아 오류 경계를 표시해야 한다. 기본 테두리 제거가 focus ring이나 error 표시를 지우면 안 된다. 3 px focus + 2 px offset과 44 px target은 유지한다. Warning은 icon·title·reason으로 읽게 한다.

Border 색 path는 보존한다. 기본 width와 기능상 예외 width를 Component alias로 나눈다. 추가된 width 역할은 `input.borderWidth`, `recipientField.borderWidth`, `amountField.borderWidth`가 hairline, 일반 정보 container·row가 none이다. `amountField.innerBorderWidth`는 none이고 wrapper가 error/focus를 담당한다. 기능상 예외는 `allowanceRow.table.dividerWidth`, `productNavigation.borderWidth`, `reviewFooter.borderWidth`, `transactionPanel.drawerBorderWidth/sectionDividerWidth`다. 모두 기존 Primitive width에 alias한다. 전체 43개 경로는 [Migration](vaultme-v2-migration.md)에 있다. `border:0` 전역 덮기, `outline:none` 전역 규칙, border 색의 전역 transparent 변경은 사용하지 않는다. [권고와 근거](../work/research-v2/borders/recommendation.md), [제한된 UI 검토](../work/research-v2/borders/skill-audit.md).

## 6. 행동과 상태

Connection, Message signing, Token approval, On-chain transaction은 서로 다른 review다. 해당 행동의 account, network, asset, recipient 또는 spender, amount 또는 allowance, estimated fee, status를 유지한다. Connection과 off-chain signing에 해당하지 않는 fee·allowance를 억지로 넣지 않는다.

- Review/Detail에는 recipient·spender 전체 주소를 표시한다.
- Fee는 native asset로 표시한다. Fiat는 부가 estimate다.
- ETH send: `0.042 ETH + 0.00063 ETH fee = estimated 0.04263 ETH`.
- USDC send: `150 USDC + 0.00063 ETH fee`. 다른 asset을 한 숫자로 더하지 않는다.
- Missing quote는 `Price unavailable`이다. 0으로 대체하지 않는다.
- Unknown result에서는 원거래 상태를 먼저 조회한다. 바로 `Send again`을 제시하지 않는다.
- Disconnect는 token allowance revoke가 아니다. Revoke는 별도 on-chain transaction이다.
- Readable message와 성공한 simulation은 안전 보증이 아니다.

상태별 필수 문구와 C01–C28/P01–P12 목록은 [Component 계약](wallet-component-contracts.md)에 있다. 상태 문구는 Variant의 고정 내용이다. 사용자 이름·금액 등 editable TEXT property와 분리한다.

## Icons

기능·상태·Navigation은 Phosphor regular, ETH·USDC identity는 원본 color SVG다. 중요한 행동은 icon + visible label을 쓴다. Review의 계정·network·자산·전체 주소·금액/권한·estimated fee·상태는 유지한다. Label 옆 icon은 aria-hidden, icon-only control은 행동 이름과 44 px target이 필요하다. 같은 network의 Asset row에서 중복 label만 줄인다. 다른 network는 표시한다. 실제 경로·라이선스·상태는 [Icons 안내](wallet-icon-guide.md)와 [Catalog](wallet-icon-catalog.html)를 따른다.

## 7. Motion과 접근성

색 hover/pressed 120 ms, 작은 disclosure 160 ms, dialog 200 ms. 계정·network·키보드 선택은 즉시 반영한다. 금액·주소·warning에 blur, bounce, stagger를 쓰지 않는다. Reduced motion에서는 transform 장식을 제거한다.

입력에는 label, helper/error, `aria-describedby` 연결이 필요하다. Loading은 버튼 폭을 유지하고 중복 행동을 막는다. Disabled 원인은 근처에 설명한다. Warning은 hover 없이 읽을 수 있어야 한다. Dialog의 Escape와 focus restore는 실제 Prototype에서 확인한다.

정적 목표는 일반 text 4.5:1 이상, 필요한 control/focus 3:1 이상이다. 대비 수치만으로 전체 WCAG 또는 screen reader 통과를 선언하지 않는다. [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

## 8. 가져오기와 재사용

| 경로 | 목적 | 확인할 것 |
| --- | --- | --- |
| Tokens Studio JSON | portable 값 교환 | 새 파일에서 세 Set을 함께 활성화. Composite와 native scalar 수는 다름 |
| Native source | 기존 Variables, Styles, master 갱신 | 같은 source file과 stable ID 보존. 전체 JSON 재import 전 중복 검사 |
| Published Library | 다른 Figma 파일에서 instance 재사용 | 변경 review와 publication 증거. Consumer subscription은 별도 확인 |
| Generated CSS | 웹 UI에서 alias 소비 | Generator 산출물을 사용. 직접 편집하지 않음 |

현재 source, publication, 소비 검증은 [release record](vaultme-release.json)를 따른다. Project는 native asset의 조직 위치다. 로컬 연구·코드·package는 workspace에 둔다. 기존 Draft 기록은 과거 이력이다.

Foundation 변경 시 generator, JSON, 해당 Figma source, guidance를 함께 갱신한다. `pnpm --filter @vaultme/tokens test`가 alias 계층을 검사하고, build가 해석되지 않는 alias에서 실패한다. 영향을 받은 대비와 실제 Figma frame을 확인한다. [Migration](vaultme-v2-migration.md)에 compatibility 변경을 기록한다.

## 9. 적용 계약과 증거

[C01 Button](components/C01-button.md), [C03 Input](components/C03-input.md), [C15 Transaction panel](components/C15-transaction-panel.md)부터 읽는다. 조합은 [Component 목록](components/README.md)을 따른다. 각 문서는 Figma property와 제안 code prop의 차이를 명시한다.

문서·정적 contrast·Figma geometry·browser keyboard·manual screen reader 검사는 서로 다른 증거다. 현재 성공 여부는 release에 연결된 결과로 판단한다. Native TNUM, 실제 기기와 실제 wallet runtime을 문서만으로 통과 처리하지 않는다. T02의 직접 font-size override는 200% stress 예외다.

[Locale 계약](wallet-component-contracts.md#locale-계약)을 따른다. 현재 specimen은 `en-US` 합성 Prototype다. 한국어 설명은 문서 언어다. 한국어 제품 지원을 뜻하지 않는다.


### Canvas 보완 · 2026-10-05

사용자는 전체 배경의 색 차이가 너무 약하다고 확인했다. 기존 `surface.canvas`를 `{color.neutral.25}`에서 `{color.neutral.50}`으로 변경했다. 현재 배경은 **#F6F8FB**다. 이는 이미지에서 새로 추출한 값이 아니라, 기존 Neutral Primitive를 재사용한 승인된 설계 판단이다. 원본 이미지 Anchor `#FBFCFE`는 Primitive에 보존한다.

White 데이터·검토 면과 배경의 구분을 조금 더 보이게 한다. 색 차이만으로 정보 그룹을 구분하지 않는다. 기존 제목·정렬·간격을 유지한다. 잔액의 #DCE8FD + Ink, Primary Blue A, 상태색, Borderless 규칙은 유지한다. Token path/type와 Figma Variable ID를 유지하며 alias 한 개만 변경한다.

Canvas 구현 확인: 기존 Figma source의 Semantic alias를 수정하고 Library를 재발행했습니다. 별도 Figma consumer의 Canvas 2곳과 7개 remote Instance의 값 보존을 확인했습니다. 웹 consumer는 320 px에서 가로 넘침이 없습니다. 근거: `work/v5/verification/native-proof.json`, `publication-proof.json`, `consumer-figma-proof.json`, `consumer-web-proof.json`. 실제 wallet runtime과 manual AT 검증은 포함하지 않습니다.

## Spacing 정리 · 2026-10-05

- Product Section 간격은 기존 `layout.sectionGap.product` 24 px를 사용합니다. Group 16 / Row 12 / Field 8을 구분합니다.
- Desktop의 Review content max-width는 기존 `layout.review.maxWidth` 480 px입니다. 일반 1200 px content 규칙이 이를 덮지 않습니다.
- Home White reading container는 기존 screen padding 16 px를 사용합니다. Row 자체 horizontal padding 0은 유지합니다.
- Tablet의 stacked section 간격은 24 px입니다. Desktop column gutter도 24 px입니다. 예전 divider의 별도 inset을 반복하지 않습니다.
- Home Backup 안내는 한 곳에만 둡니다.
- Native product와 stress screen의 Section role을 연결했습니다. Permissions는 Connections / Allowances / comparison rows로 묶었습니다. 기존 node/master/property IDs를 보존합니다. 새 wrapper는 documentation/screen assembly입니다. Library Component owner가 아닙니다.
- Primitive·Semantic·Component Token 값과 Component master를 바꾸지 않은 screen assembly 수정입니다. 기존 published Library는 유지합니다. Library 발행 여부는 source UI에서 별도로 확인합니다.
- 점검과 실제 구현 근거: `work/v6/spacing-audit/`. 모든 variant와 실제 wallet runtime의 완전 검증을 뜻하지 않습니다.

### Notice 2단계, 회색 구획 띠, Row 배지 (2026-10-17, 오너 승인)

- `noticeBanner.*`: Banner(막는 상황, 페이지 단위)는 tint 배경(`info|warning|danger|unknown|confirmed|clear.bg`는 `statusNotice.*.bg`와 같은 `status.*.bg` 역할), `radius` → `radius.lg`(16), `padding` → `space.4`(16), `iconSize` → `iconSize.control`(20). Inline(도움말 1줄)은 기존 모양이다. Figma `B/Notice inline`은 `Tier=Inline|Banner` × `Tone`이다.
- `sectionBand.*`: `height` → `space.3`(12), `bg` → `surface.canvas`, `blockPaddingY` → `space.5`(20, 띠로 나뉜 블록 안 위아래). 20은 제품 척도(24/16/12/8)에 없지만 기존 Primitive이며 오너 승인 예외다. 검토·결과·거래 상세·설정에만 쓰고 홈·내역은 흰색이다. border·shadow 없음.
- `rowBadge.*`: B/Row `Leading=Asset badge`. 자산 아이콘 40 + 18 px 배지(`size.badge`), 2 px `surface.default` ring. 색은 sent `icon.secondary`, received `status.success.fg`, pending `color.amber.600`, failed `status.danger.fg`. 배지 글리프는 Solar Bold 원형(`round-arrow-right-up` / `round-arrow-left-down`, `clock-circle`, `close-circle`)이다(`wallet-icon-guide.md` §0). Linear 아이콘은 18 px 배지에서 원형 윤곽이 겹쳐 Bold를 골랐다.
- 꺼진 Primary: `surface.disabled`(Light neutral.100, Dark neutral.800) 배경 + `text.disabled`.
- `Brand/Mark`: 로고 마크 draft(72/40/24, OnLight/OnBrand). 오너 검토 전이다. 토큰 없이 `brand.primary`와 `color.neutral.0`을 직접 binding한다.

### Banner 제목, sheet Secondary, Dark Banner 채움 (2026-10-17, 오너 승인)

- `B/Notice inline` 399:122 `Tier=Banner` 변형에 `Title` 레이어를 더했다. 새 property `Title`(TEXT)과 `Show title`(BOOLEAN, 기본 false)이다. 제목은 `Product B/Headline`(17/600), 본문 `Message`는 `Product B/Body Small` + `text.secondary`, 사이 간격 `space.1`(4). 제목이 있는 Banner만 `Show title`을 켠다. 기존 소비 프레임은 기본값으로 바뀌지 않는다.
- 새 Semantic `surface.pressedOnRaised`(Light neutral.100, Dark neutral.600)와 Component `buttonB.secondary.bgOnRaised`: bottom sheet(raised 면) 안 Secondary 배경. Dark 경계 1.93:1은 수용했다(`outputs/wallet-component-contracts.md` 근거).
- `rowBadge.pending.fg`: `status.warning.fg` → `color.amber.600`(두 모드). 흰 Solar Bold 글리프 대비 4.57:1.
- 새 Primitive `color.red.950` #3C1F21, `color.amber.950` #342617. 900 단계에서 OKLCH로 만들었다(같은 hue, L 0.28, chroma ×0.5). Dark `status.danger.bg` → `red.950`, `status.warning.bg` → `amber.950`(전에는 900). Dark Banner 본문 `text.secondary` 대비 9.64:1 / 9.47:1, 상태 icon(red.300 / amber.300) 6.09:1 / 9.39:1. Light 값은 그대로다.
- 이 Dark 변경은 `status.*.bg`를 쓰는 모든 곳(Banner, 테스트넷 칩, 상태 라벨)에 같이 적용된다.



## 2026-10-17 시각 품질 수정 (미감 리뷰 P0/P1/P2, #54)
- 새 text style `Product B/Row title`(Pretendard 500, 17/25, -0.3), token `type.productB.rowTitle`. B/Row, B/Settings row, B/Switch row, B/Action row 제목에 쓴다.
- 새 semantic color `surface.inset` (Light = surface.subtle, Dark = surface.raised). B/Secret grid 판이 Dark canvas보다 어둡던 문제(P1-7)를 고친다. Figma 02 Semantic에 변수 추가.
- B/Keypad key 숫자 Title 2(22) → Title 1(26). B/Detail row는 center 정렬. B/Progress steps는 3칸 균등(점·라벨 중앙, 선은 점 사이만), 아래 여백 space/6.
- Tab header 패턴(Home·내역·설정): 높이 58, 왼쪽 제목(또는 계정), 오른쪽 `Sepolia 테스트넷` 칩 1개, 좌우 `layout/screen/padding`. 내역의 "테스트 데이터" 칩은 첫 날짜 헤더 오른쪽(absolute)으로 내림. 자산 상세 Nav 제목은 왼쪽 Title 2.
- 받기(S30): faucet 행을 Footer stack(faucet → 주소 복사 → 공유) 안으로, QR은 `surface/subtle` 타일(radius/2xl, padding space/3). 금액 입력: 금액을 Title block과 칩 사이 수직 중앙. Failed 결과: 하단 버튼 2개(확인 Primary, 다시 보내기 Secondary), 거래 상세 보기는 hero 아래 인라인 링크.
- Brand/Mark: 오너가 option A(V 모노그램 + 열쇠 구멍)를 골랐다. 마스터 495:17569의 내용을 바꾸고 `Size=96`(OnLight/OnBrand)을 더했다. 브랜드 화면은 96, 마크 아래 `space/8`, 워드마크 Display M. Face ID 아이콘은 입 없는 Solar face-scan-square(linear, icon/primary).
- 오너 결정 필요(안 함): 13 px Caption 신규 type(P2-7), Address M 15 px(P1-3b), 칩 색 `Sepolia 테스트넷`은 `status/warning` 계열 유지(P2-6, 경고처럼 읽히는지는 오너 판단), 탭 바 Bold/Linear optical size(P2-2, 아이콘 변경 필요).

## 2026-10-17 Accent 규칙, mono 사실 라벨, 칩 1개 (재검수 반영, 오너 지침, #54)

근거: `work/review/rr-staff-pd-2026-10-17.md` §6, `rr-yc-founder`, `rr-yc-analyst`. 기준은 stack-line.dev(절제, accent 하나, mono 사실, 정직한 문구, 엄격한 정렬). 픽셀 숫자가 아니라 구조를 고쳤다.

### Accent 규칙 (한 화면에 파랑은 두 곳까지)

| 역할 | 색 | 쓰는 곳 |
| --- | --- | --- |
| 행동 | 파랑 `brand.primary` | Primary 버튼, 선택 탭(`navigation.active`), focus. 이 둘뿐 |
| 링크 | Ink + 밑줄 | `text.link`(= `text.primary`) + text style `Product B/Link`. 구획 "전체 보기", Block header "수정", Notice 링크, 주소 입력의 붙여넣기 |
| 칩 | 중립 하나 | `chip.bg`(`{surface.pressed}`) + `chip.fg`(`{text.secondary}`). amber, 파랑, 초록, 빨강은 칩 색이 아니다 |
| 상태 | 초록, 빨강, amber | 상태 badge와 경고(Banner, Inline)에만 |
| 받은 금액 | Ink + "+" | `financial.change.positive` = `{text.primary}`. 초록을 쓰지 않는다 |

### 새 token과 style

| 이름 | 값 | 메모 |
| --- | --- | --- |
| Semantic `text.link` | Light `{color.neutral.900}`, Dark `{color.neutral.50}` | 값 변경. 소비 코드는 생성값을 다시 읽으면 된다 |
| Semantic `financial.change.positive` | Light `{color.neutral.900}`, Dark `{color.neutral.50}` | 값 변경 |
| Component `chip.bg`, `chip.fg` | `{surface.pressed}`, `{text.secondary}` | 새로 추가 |
| Primitive `font.lineHeight.px16` | 16px | 새로 추가 |
| `type.productB.fact` = Figma `Product B/Fact` | IBM Plex Mono 400, 12/16, 자간 +2% (`font.tracking.wide`) | 사실 정보. 색은 `text.tertiary`(또는 `text.secondary`) |
| `type.productB.factUpper` = Figma `Product B/Fact upper` | IBM Plex Mono 500, 12/16, +2%, 대문자 | 영어 사실 줄(`SEPOLIA · CHAIN ID 11155111`) |
| `type.productB.link` = Figma `Product B/Link` | `Product B/Label`(Pretendard 500, 14/20) + 밑줄 | 링크 글자 |

Figma Variable: Component `chip/bg` VariableID:594:188, `chip/fg` VariableID:594:189. 새 Variable은 Primitive에 없고 기존 alias만 쓴다.

### Mono 사실 라벨 쓰는 곳

네트워크·chainId, 블록, 해시, 버전, 사실로서의 시각. 감정이나 설명은 sans다. Tx 상세(시각, 네트워크, 해시, 블록), 결과(네트워크 행), 받기(제목 줄 오른쪽 `Sepolia · 11155111`), 설정(네트워크, 버전), 라이선스(라이선스 ID, 버전), 자산 상세(네트워크, 컨트랙트, 소수 자릿수), 시작(버전 줄). 전체 주소는 `B/Address`를 그대로 쓴다.

### 주소 표시: 4글자 묶음 없음 (오너 2026-10-17)

`B/Address`는 10개 조각을 gap 0으로 붙여 하나의 문자열처럼 감싼다(Figma 구현 방식. 앱은 Text 하나에 span을 쓴다). 앞 6자(`0x` + 4)와 끝 4자는 strong 그대로다. 비슷한 주소의 다른 글자는 글자 단위로 `Product B/Address M diff` + `status/danger/fg`다. 390 폭에서 최대 2줄이다. `B/Detail row`의 Address 값과 `B/Address compare`도 띄어쓰기 없이 붙여 쓴다.
