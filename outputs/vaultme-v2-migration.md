# VaultMe v2 이관 안내

상태: 현행 compatibility·이관 안내 · 문서 갱신: 2026-10-04

범위: 기존 path·property·source ID·consumer update와 복원

[문서 홈](README.md) · [현재 release](vaultme-release.json) · [변경 이력](vaultme-v2-change-log.md)


## 빠른 적용

1. [문서 홈](README.md)에서 소비 목적에 맞는 파일을 고른다. Source는 이 workspace의 `outputs/`다.
2. [Token JSON](wallet-foundation.tokens.json)을 portable 값 source로 사용한다. ZIP은 전달 묶음이다. 별도 theme source가 아니다.
3. 기존 [Published Figma source](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8)는 전체 재import하지 않는다. Native Variables/Styles와 stable ID를 갱신한다.
4. 새 Token Studio 작업 파일에서는 JSON의 `primitive`, `semantic`, `component`를 함께 활성화한다. Alias가 해석되지 않으면 선행 Set부터 확인한다.
5. 기존 UI는 아래 compatibility 경로를 확인하고 새 Component 역할로 연결한다.
6. 변경된 Component 상태와 조립 화면을 확인한 뒤 소비 파일에 적용한다.

## v1에서 v2로 바뀐 의미

| Before | v2 계약 | 소비 파일에서 할 일 |
| --- | --- | --- |
| Marketing type를 제품 행에도 사용 | Semantic `typography.*` 제품 역할 10개 | title/balance/amount/row/body/address로 역할을 나눔 |
| 개별 asset/activity card | Flat list, min-height, body fill/value hug | 반복 radius/shadow 제거, 큰 값은 다음 줄 |
| 모든 wallet row를 80 px로 해석 | Asset 64 px / Activity 80 px minimum | height 고정 해제, 긴 내용 높이 증가 |
| 고정 backup/permission height | Content height | 텍스트·warning을 자르지 않음 |
| Check clear를 success 색으로 표시 | Neutral `check.clear.*` | 완료 결과와 검사 결과 분리 |
| Variant copy 공통 TEXT 기본값 | State copy 고정, user TEXT 별도 | 상태별 실제 characters 검사 |
| Full address가 약한 metadata | `transactionPanel.address={text.primary}` | 14 px 이상, 전체 주소 줄바꿈 |
| 전체 token JSON 재import | 기존 native collection/ID 갱신 | 중복 Variable/Style 제거보다 사전 mapping 우선 |

## Stable path와 새 역할

기존 Primitive palette와 13개 기존 Text Style의 의미·ID는 가능한 한 유지한다. Inter/IBM Plex Mono를 바꾸지 않는다. 새 raw 값은 승인된 결정에 따라 Primitive에만 추가한다. Blue A 확장은 승인된 값이다.

| 경로 | 호환 계약 |
| --- | --- |
| `assetRow.height`, `activityRow.height` | 기존 path 보존. 새 화면은 `assetRow.minHeight`, `activityRow.minHeight` 사용 |
| `backupStatus.height`, `connectedAppRow.height`, `allowanceRow.height` | Deprecated. 삭제하지 않고 기존 소비를 보호. 새 화면에는 고정 height로 쓰지 않음 |
| `transactionPanel.safe.*` | Deprecated compatibility alias. 새 `transactionPanel.check.clear.*` 역할로 연결. Safety 이름을 신규 사용에 추천하지 않음 |
| `transactionPanel.address` | 주요 검토 정보로 `text.primary` alias |
| `transactionPanel.radius` | `shape.group` alias |
| `assetRow.nameStyle/balanceStyle`, `activityRow.titleStyle/amountStyle` | `typography.row` alias |
| `assetRow.metaStyle`, `activityRow.metaStyle` | `typography.body` alias |
| `button.size.sm.label`, `button.size.md.label` | `typography.label`: 14/20 px Semi Bold |
| `button.size.lg.label` | `typography.section`: 16/24 px Semi Bold |
| `input.textStyle` | `typography.row`: 16/24 px Medium |
| `badge.textStyle` | `typography.label`: 14/20 px Semi Bold. 기존 작은 caption과 다름 |
| `assetRow.iconSize` | `size.avatar_sm`: 32 px. Row slot 규칙과 일치 |

새 Semantic: `surface.selected/hover/pressed`, `border.selected`, `financial.change.positive/negative/neutral`, `check.clear.fg/bg/border`, `typography.*`, `layout.screen.padding`, `layout.sectionGap.product`, `layout.groupGap/rowGap/fieldGap`, `layout.review.maxWidth`, `shape.control/group/overlay/row`.

추가된 control alias는 `input.placeholder={text.tertiary}`, `input.focusRing={focus.color}`, `input.bg.disabled={surface.subtle}`와 `iconButton.bg.default/hover/pressed`, `iconButton.disabledFg`다. Focus·pressed·disabled 표현은 이 역할을 사용한다.

과거 수치와 source snapshot은 [변경 이력](vaultme-v2-change-log.md)에 보존한다.

새 Component family는 실제 화면에 필요한 `portfolioBalance`, `productHeader`, `productNavigation`, `reviewFooter`, `statusNotice`, `addressBlock`, `emptyState`, `skeleton`이다. C01–C28의 공개 family 이름과 token root 이름은 같은 개념의 서로 다른 표현일 수 있다. 정확한 연결은 token-map과 [Component 계약](wallet-component-contracts.md)을 사용한다.

## Generator와 CSS

### 승인된 Borderless + Blue A 이관

현재 상태: 사용자 승인, Generator 정적 검증, Blue/border Native 적용 완료. Icons Native와 통합 Library 공개 완료. Border 연구의 원문은 승인 전 제안 기록이다. 이번 실행 권한은 후속 사용자 승인에서 왔다. [Border 권고](../work/research-v2/borders/recommendation.md), [검토 범위](../work/research-v2/borders/skill-audit.md).

Borderless는 **width 역할 추가**로 적용한다. 기존 border-color token path는 보존한다. 일반 정보 container·row의 기본 width는 none, 입력 인지·error·선택·필요한 separator 등 기능상 예외는 hairline 역할을 사용한다. Component는 기존 Primitive border-width를 alias한다. 실제 43개 width 경로는 아래 최종 표와 token-map에서 확인한다. 기존 소비 파일은 width 역할을 별도로 채택해야 한다. Source 변경만으로 모든 소비 파일이 갱신되는 것은 아니다.

Input의 focus/error, Account·Network의 check/selected label, C21 Scope/Layout, 44 px target과 wallet 필수 데이터를 유지한다. 전역 `border:0`/`outline:none` 또는 기존 border 색의 전역 transparent 덮기는 migration 방법이 아니다. Amount wrapper는 내부 invalid 상태를 받아 error 표시를 유지한다.

Generator의 Blue A Primary default/hover/pressed는 `#3152FF` / `#2944DB` / `#2138B8`, foreground white다. Secondary surface `#DCE8FD`는 Ink text와 사용한다. Secondary action은 neutral이다. 새 raw action-brand 값은 Primitive에만 추가하고 기존 Semantic/Component 경로를 가능한 한 유지해 alias target을 갱신한다. Image anchors와 전체 Light 방향은 유지한다. Source provenance는 승인된 업계 UI 조사·제품 의도이며 이미지 추출이 아니다. Action blue를 success/gain/safety로 재사용하지 않는다.

Secondary tint 위 Blue A text는 4.4967:1로 일반 text 기준에 미달한다. Ink를 적용한다. 실제 적용과 정적 대비 결과는 release record를 따른다. Library update와 소비 파일의 update 채택은 각각 별도다.

`python3 work/build_foundation.py`가 canonical JSON과 generated 표현을 만든다. Semantic/Component 값은 정확한 단일 alias다. 복합 typography도 Primitive에만 raw 속성을 둔다. 생성된 `vaultme-v2.tokens.css`는 compiler output이다. CSS에 raw theme 값을 별도 편집하지 않는다.

`work/v2/token-map.json`은 Figma sync와 CSS의 path mapping에 사용한다. Figma scalar로 표현되지 않는 typography/shadow/easing은 Style 또는 metadata로 남긴다. Figma Variable 개수와 JSON token 개수는 같아야 한다는 기준을 쓰지 않는다. 서로 공통으로 표현한 항목의 값·alias·type을 비교한다.

검증 실패가 canonical output을 덮어쓰지 않게 generator의 검사 순서를 유지한다. Path 삭제 또는 의미 변경은 migration에 기록하고 consuming UI를 확인한다.

### Component width 대응

아래 width 역할은 기존 Primitive에 alias한다. 현재 경로 존재 여부는 token source를 따른다.

새 경로는 width 43개 + Component 색 alias 1개 + Primitive 색 3개 + Semantic 색 역할 3개다. JSON alias에는 아래 Component set 이름을 넣지 않는다.

| Component width path | Alias |
| --- | --- |
| `accountRow.borderWidth.default` | `{borderWidth.none}` |
| `accountRow.borderWidth.selected` | `{borderWidth.none}` |
| `activityRow.borderWidth` | `{borderWidth.none}` |
| `allowanceRow.borderWidth` | `{borderWidth.none}` |
| `allowanceRow.table.dividerWidth` | `{borderWidth.hairline}` |
| `amountField.borderWidth` | `{borderWidth.hairline}` |
| `amountField.innerBorderWidth` | `{borderWidth.none}` |
| `approvalPanel.borderWidth` | `{borderWidth.none}` |
| `assetRow.borderWidth` | `{borderWidth.none}` |
| `assetRow.dividerWidth` | `{borderWidth.none}` |
| `backupStatus.borderWidth` | `{borderWidth.none}` |
| `button.ghost.borderWidth` | `{borderWidth.none}` |
| `button.primary.borderWidth` | `{borderWidth.none}` |
| `button.secondary.borderWidth` | `{borderWidth.none}` |
| `card.borderWidth` | `{borderWidth.none}` |
| `card.dividerWidth` | `{borderWidth.none}` |
| `card.group.borderWidth` | `{borderWidth.none}` |
| `connectedAppRow.borderWidth` | `{borderWidth.none}` |
| `connectionRequest.borderWidth` | `{borderWidth.none}` |
| `feeSummary.borderWidth` | `{borderWidth.none}` |
| `feeSummary.dividerWidth` | `{borderWidth.none}` |
| `input.borderWidth` | `{borderWidth.hairline}` |
| `networkRow.borderWidth.active` | `{borderWidth.none}` |
| `networkRow.borderWidth.default` | `{borderWidth.none}` |
| `networkRow.borderWidth.unavailable` | `{borderWidth.none}` |
| `productHeader.borderWidth` | `{borderWidth.none}` |
| `productNavigation.borderWidth` | `{borderWidth.hairline}` |
| `productNavigation.itemBorderWidth` | `{borderWidth.none}` |
| `receivePanel.borderWidth` | `{borderWidth.none}` |
| `recipientField.borderWidth` | `{borderWidth.hairline}` |
| `reviewFooter.borderWidth` | `{borderWidth.hairline}` |
| `signatureRequest.borderWidth` | `{borderWidth.none}` |
| `statusNotice.clear.borderWidth` | `{borderWidth.none}` |
| `statusNotice.confirmed.borderWidth` | `{borderWidth.none}` |
| `statusNotice.danger.borderWidth` | `{borderWidth.none}` |
| `statusNotice.info.borderWidth` | `{borderWidth.none}` |
| `statusNotice.unknown.borderWidth` | `{borderWidth.none}` |
| `statusNotice.warning.borderWidth` | `{borderWidth.none}` |
| `transactionPanel.borderWidth` | `{borderWidth.none}` |
| `transactionPanel.disclosureBorderWidth` | `{borderWidth.none}` |
| `transactionPanel.dividerWidth` | `{borderWidth.none}` |
| `transactionPanel.drawerBorderWidth` | `{borderWidth.hairline}` |
| `transactionPanel.sectionDividerWidth` | `{borderWidth.hairline}` |

`allowanceRow.table.divider={border.subtle}`도 추가했다. 기존 border 색은 보존한다. Generic `button.borderWidth`는 compatibility로 남아 있다. 새 소비 UI는 더 구체적인 variant별 width를 사용한다. 소비 파일은 width 역할을 실제 CSS/레이아웃에 채택해야 한다.

| 새 색 경로 | Alias / 값 |
| --- | --- |
| Primitive `color.identity.blue.600` | `#3152FF` |
| Primitive `color.identity.blue.700` | `#2944DB` |
| Primitive `color.identity.blue.800` | `#2138B8` |
| Semantic `brand.primary` | `{color.identity.blue.600}` |
| Semantic `brand.secondary` | `{color.brand.100}` |
| Semantic `navigation.active` | `{brand.primary}` |

기존 `action.primary.bg.default/hover/pressed`, `border.focus/selected`, `icon.brand`, `text.link`는 새 action-brand alias로 연결한다. `productNavigation.active={navigation.active}`다. Secondary action은 neutral 50/100/200을 default/hover/pressed로 사용한다. Status, financial.change, check.clear 색은 기존 palette를 유지했다.

로컬 Amount wrapper는 초기 render와 onInput에서 input의 `aria-invalid`와 같은 값으로 `data-invalid`를 받는다. `input.border.error`와 기존 focus ring을 사용하며 Continue 조건은 recipient/amount/fee를 유지한다. 이 수정은 로컬 코드 결과다. Blue/border Native 오류 경계와 focus는 별도 확인했다. Icons Native와 통합 Library update는 완료했다.

## Native source와 Library 이관

Portable JSON import는 값 교환이다. Native update는 기존 ID의 갱신이다. Library publish는 asset 공개다. Consumer subscription은 별도 파일의 소비다. 하나가 성공해도 다른 단계의 성공을 뜻하지 않는다.

같은 source file key와 IDs를 보존한다. 전체 JSON 재import 전 collection, Variable, Style 중복을 확인한다. Local research, code, package는 workspace에 둔다. Source ID는 [native ledger](../work/figma-state.json), 현재 수치·publication 증거는 [release record](vaultme-release.json)를 따른다.

## Property compatibility

공개 전 참조가 없던 legacy TEXT property key를 제거한 이력이 있다. 기존 자동화는 현재 `componentPropertyDefinitions`를 먼저 읽는다. 삭제된 key를 실제 연결된 TEXT property로 바꾼다. Variant state copy를 공통 TEXT 기본값에 다시 연결하지 않는다. 기존 node/master ID와 Variant axes는 유지한다. [정리 이력](../work/v2/verification/library-assets-fix.json)을 참조한다.

Input의 `HelperText`와 `ErrorText`는 additive TEXT다. Invalid는 ErrorText를 사용한다. Icon button의 `Icon`은 additive INSTANCE_SWAP다. C28의 `Action`은 additive Variant axis이며 기존 State와 Send Variant ID를 보존한다.

Icons의 `Icon`, `ShowIcon`, `AssetIcon`, `NetworkIcon`은 additive property다. Swap 후 contextual foreground를 다시 bind한다. Primary에는 `icon.action.onPrimary`를 사용한다. Asset 원본 색은 보존한다.

## 문서 구조 이관

기존 8개 문서의 파일명은 유지했다. 역할과 읽는 순서는 [문서 홈](README.md)에 있다. Component별 recipe는 `components/`에 추가했다. 오래된 중복 release summary는 [변경 이력](vaultme-v2-change-log.md) 한 곳으로 모았다. 현재 release record는 수치와 digest의 단일 진입점이다.

문서의 제안 code prop은 설치 가능한 SDK API가 아니다. 실제 consumer는 타입·event·validation·접근성 책임을 구현하고 evidence를 연결한다. Figma props와 code props의 대응을 독립 소비 환경에서 확인한다.

## 적용·업데이트·복원 순서

1. 사용하는 release ID, token path, Figma property와 source ID를 기록한다.
2. 새 release의 compatibility와 증거를 읽는다.
3. 변경한 역할만 적용한다. Amount, fee, full address, 상태 문구를 보존한다.
4. Focus, 좁은 폭, 긴 수량, 200% text, no motion을 확인한다.
5. Consumer에서 결과를 확인한 뒤 adopted 상태를 기록한다.
6. 실패하면 기록한 이전 release의 JSON/CSS/assets와 이전 Figma source snapshot으로 복원한다. 값과 consumer code를 함께 되돌린다.

Published Library update는 instance 변경 review를 포함한다. Local package 변경만으로 consumer adoption을 완료 처리하지 않는다. 현재 subscription 증거는 release record를 따른다.

## 2026-10-04 · Light + C23 Surface 이관

이번 승인 범위는 기존 값의 역할 확장이다. 새 Primitive·기존 path 삭제·새 public family는 없다. Semantic 3개와 Component 10개를 추가한다. 기존 `portfolioBalance.note`는 `{text.secondary}`에서 `{text.primary}`로 연결을 변경한다. 배경이 Secondary tint인 모든 Quote의 note를 Ink로 읽게 한다.

| 신규 경로 | Alias |
| --- | --- |
| `surface.portfolioSummary` | `{surface.brandTint}` |
| `effect.overlayShadow` | `{elevation.md}` |
| `effect.modalScrimOpacity` | `{opacity.40}` |
| `portfolioBalance.bg` | `{surface.portfolioSummary}` |
| `portfolioBalance.padding` | `{layout.screen.padding}` |
| `portfolioBalance.radius` | `{shape.group}` |
| `portfolioBalance.borderWidth` | `{borderWidth.none}` |
| `overlay.bg` | `{surface.raised}` |
| `overlay.fg` | `{text.primary}` |
| `overlay.radius` | `{shape.overlay}` |
| `overlay.shadow` | `{effect.overlayShadow}` |
| `overlay.scrimBg` | `{surface.inverse}` |
| `overlay.scrimOpacity` | `{effect.modalScrimOpacity}` |

C23 set `68:180`와 Quote master `68:168`, `68:172`, `68:176`의 기존 IDs를 유지한다. `Quote`·`Balance` property의 이름·ID·상태 의미를 유지한다. 실제 source definition을 먼저 읽는다. 새 배경을 위해 master 재생성·instance detach·전체 JSON 재import를 하지 않는다.

1. 현재 release와 consumer의 source digest·override를 기록한다.
2. C23 root를 새 fill/padding/radius/borderWidth alias에 연결한다. Value와 note는 Ink다. 높이는 내용에 따라 늘린다.
3. Complete/Partial/Unavailable과 P01/P02·P05의 배경 Home을 확인한다. Asset·Activity·Review는 기존 읽기 면을 유지한다.
4. 기존 floating host에만 `overlay.*`를 연결한다. Scrim opacity는 scrim에만 쓴다. Nonmodal에는 scrim이 없다. 기존 fixed drawer 경계는 유지한다.
5. 긴 값·320 px·200% text·visible focus·44 px target·quote 누락·필수 Review 정보를 확인한다.
6. Source review 후 Library publication을 기록한다. 독립 Figma consumer의 update와 override retention, web consumer의 C23·영향받은 host를 새 digest로 확인한다.
7. Package verifier 완료 후 release를 마감한다. 문제가 있으면 이전 JSON/CSS·native source·consumer 조립을 함께 복원한다.

`card.shadow`와 `transactionPanel.shadow`는 legacy compatibility 경로다. 존재한다고 기본 group에 shadow를 적용하지 않는다. 새 overlay 역할로 전체 Component radius·shadow를 치환하지 않는다. Primary Blue A·neutral Secondary action·status·기존 border-color path는 유지한다.

문서 갱신과 alias 명세는 새 native·publication·adoption 완료 증거가 아니다. 과거 Button/Input web proof와 세 Figma linked specimen proof는 새 C23/host까지 포함하지 않는다. 이번 변경의 상태는 [current release](vaultme-release.json)와 실제 새 검증 자료로 확인한다. 계획과 공개 System 연구는 [Surface 연구](../work/research-v4/fintech-surface/vaultme-surface-enhancement-plan.md)에 있다.

### Surface 적용 확인 · 2026-10-04

[Native source review](../work/v4/verification/native/native-review-proof.json)에서 C23의 세 Quote와 P01/P02·P05 배경 Home의 tint·Ink·기존 IDs를 확인했습니다. PNG review에는 흰색 P04 Review·독립 P05 drawer·긴 값·좁은 폭·Partial/Unavailable이 포함됩니다. Source는 10 pages·693 native Variables입니다. Managed 690개와 legacy easing STRING 3개입니다. Text Styles 23개·Effect Styles 3개를 유지합니다. Portable JSON은 796 tokens입니다. Primitive 203개·Semantic 105개·Component 488개입니다.

신규 native scalar Variables는 11개입니다. Shadow alias `effect.overlayShadow`와 `overlay.shadow`는 `nativeType=null`입니다. 기존 `elevation/md` Effect Style로 연결합니다. 감사한 native pages에는 floating dialog/popover/scrim host가 0개였습니다. 새 host를 만들지 않았습니다. `overlay.*`의 native host 채택은 해당 host가 실제로 있을 때 확인합니다. 독립 drawer는 기존 transactionPanel·footer·경계 역할을 사용합니다.

[Web observation](../work/v4/verification/web/browser-observation.json)은 375/390/768/1440 px 화면의 C23 overflow 없음과 explicit text200 Partial 줄바꿈을 기록합니다. 독립 web consumer는 세 Quote·longBalance override·320 px overflow 없음·기존 form feedback을 확인했습니다. 합성 overlay의 Escape close와 trigger focus return도 확인했습니다. Text200은 browser zoom 검사가 아닙니다. Manual screen reader·실제 wallet 검증은 미확인입니다.

**Surface Library publication과 독립 Figma consumer 적용을 확인했습니다.** [Publication proof](../work/v4/verification/native/publication-proof.json)은 Semantic·Component·C23와 별도 review한 Product navigation·Status label의 순차 발행을 기록합니다. Source UI에는 남은 미발행 indicator가 없습니다. Published asset 수는 85개입니다.

[Figma consumer proof](../work/v4/verification/native/consumer-surface-proof.json)는 기존 Button/Input/Transaction panel 세 remote instance의 update 전후 override 보존과 새 C23 세 Quote·longBalance의 발행 후 채택을 구분합니다. 새 C23의 update 전후 override 보존은 아직 검증하지 않았습니다. [Web consumer proof](../work/v4/verification/web/consumer-web-proof.json)는 합성 C23와 기존 form·preview overlay의 제한된 browser 결과입니다. 실제 wallet·전체 runtime·manual screen reader 검증이 아닙니다. Package 완료는 이 문서에서 선언하지 않습니다. Current release의 별도 결과를 확인합니다.

## 보관·전달 경계

`wallet-foundation-board.v1-archived.svg`는 retired v1 자료다. 현재 artifact나 package에 넣지 않는다. `work/build_figma_board.py`는 종료 안내를 제공한다. 현재 시각 source는 native Figma다.

[Review artifact](vaultme-v2-review/index.html)는 합성 scenario다. 실제 chain 계산·서명·broadcast·revoke·custody를 수행하지 않는다. Unknown 결과는 원거래 조회부터 한다. Package와 ZIP의 현재 검증은 release record에서 확인한다.

## 2026-10-04 · Overview 문서 이관

Figma의 시작점은 기존 Overview `5:2`다. C01–C28의 기존 안내 section과 master ID를 유지한다. Guide의 master 링크로 실제 정의를 열고, 상세 사용법은 `components/` recipe에서 읽는다. 로컬 경로 표시는 공개 웹 링크가 아니다.

이번 변경에서 token JSON/CSS/map의 byte, master property와 Variant 계약은 유지됐다. 소비 앱에 새로운 token이나 prop을 적용할 필요는 없다. 문서 보드의 예제 INSTANCE와 안내 text만 변경됐다. 기존 consumer override가 이번 작업에서 다시 검증됐다는 뜻은 아니다.

Native 재생성은 현행 `work/v2/compose_figma_call.py documentation overview` 또는 `work/v2/compose_guidance_call.py overview`가 만든 입력을 사용한다. Overview는 `figma-guidance.js`의 기존 ID 갱신 경로를 따른다. 과거 실행 snapshot을 임의로 다시 실행하지 않는다. Markdown 수정 뒤 reader를 다시 생성한다.

문서 패키지는 새 immutable release ID로 전달한다. 이전 Library publication과 consumer proof를 새 날짜로 바꾸지 않는다. 이번 desktop 직접 탐색은 미확인이다. [통합 증거](../work/v2/verification/overview-guidance-integration.json)와 [release 사용 규칙](vaultme-release-guide.md)에서 범위를 확인한다.


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

## Dark mode를 portable JSON에 추가 · 2026-10-13

Figma `02 Semantic`(`VariableCollectionId:2:151`)의 `Dark` mode(`298:0`)를 읽기 전용으로 읽었다. 94개 Semantic 변수 중 Light와 값이 다른 60개가 모두 기존 Primitive를 alias한다. raw 값은 없다.

`wallet-foundation.tokens.json`에 Tokens Studio 방식으로 추가했다: 최상위 set `semanticDark`(위 60개 override, `{color…}` alias만), `$metadata.tokenSetOrder`, `$themes`(Light, Dark). 기존 `primitive`, `semantic`, `component`의 경로와 값은 바꾸지 않았다. 나머지 34개는 Light와 같다.

`packages/tokens/build.mjs`가 Dark를 이 set에서 만든다. 임시 `dark.json`은 삭제했다. 기존 JSON을 읽는 다른 도구는 repo에서 찾지 못했다. `work/build_foundation.py`는 이 workspace에 없어서 실행하지 못했다. Tokens Studio에서 실제 import한 확인은 하지 않았다.

## 2026-10-13 Secondary action fill과 amountHero

- `semantic.action.secondary.bg.{default,hover,pressed}` Light: `neutral.50/100/200` → `neutral.200/300/400`. 이유: 2026-10-05에 `surface.canvas`가 `neutral.50`이 되어 Secondary default가 canvas와 같은 색이 됐다. Ink 대비 14.2:1 / 11.8:1 / 7.2:1. 버튼 면과 canvas 대비는 1.2:1이다. 버튼은 라벨로 식별되므로 1.4.11 대상이 아니다. Dark 값은 바꾸지 않았다. 경로·ID 유지 (Figma `action/secondary/bg/*` VariableID:2:186–188).
- 새 Primitive `type.product.amountHero`(40/48 Bold)와 Semantic `typography.amountHero`. Figma Text Style `Product / Amount Hero`. 기존 Style은 바꾸지 않았다.
- 추가 컴포넌트(미게시): `Icon button / Plain` 330:3401, `Keypad` 330:3423, `Summary row` 330:10480, `Icon / action / backspace` 330:2747 (Phosphor, MIT).
- Library 게시는 소유자 검토 후 별도 단계다.
- 소유자 승인: `component.button.size.lg.paddingX` `space.5`(20) → `space.4`(16), `component.receivePanel.radius` `radius.xl`(20) → `radius.lg`(16). Figma VariableID:2:253, VariableID:30:48 alias 변경, 경로·ID 유지. Library 게시 완료는 이 단계 이후 기록.

- Figma에만 있던 C29–C33 Component Variable 24개를 portable JSON `component`에 추가했다 (`switch` 4, `segmented` 6, `listItem` 7, `bottomSheet` 1, `sensitiveReveal` 6). 모두 기존 Semantic/Primitive alias이며 raw 값은 없다. Primitive와 Semantic은 추가 없음 (`space/*`는 이미 JSON에 있음). 기존 값은 바꾸지 않았다. Figma 읽기 전용 비교: Figma 717 Variable, JSON-only는 Text Style/Effect Style 참조(typography, shadow) 80개뿐이다. `segmented.bg`(`action.secondary.bg.default`)는 앱의 기존 `surface.subtle`과 값이 달라 앱 코드는 바꾸지 않았다.

## 2026-10-14 Dark Secondary fill과 Tab bar (finish-review 수정)

- `semanticDark.action.secondary.bg.{default,hover,pressed}`: `neutral.900/800/700` → `neutral.800/700/600`. 이유: Dark canvas(`neutral.950`)와 default 면이 1.06:1이라 버튼이 보이지 않았다. 새 값은 canvas 대비 1.46 / 1.97 / 2.82:1이다. `action.secondary.fg`(`neutral.50`)와의 대비는 12.38 / 9.18 / 6.39:1로 모두 4.5:1 이상이다. Figma `02 Semantic` Dark mode(`298:0`)의 VariableID:2:186–188을 같은 alias로 바꿨다. 경로·ID 유지. `segmented.bg`와 Secondary Button이 이 변수를 alias하므로 Dark에서 함께 바뀐다.
- Product navigation(`67:342`): 모든 variant에 `paddingTop` = `space/2`(8, 변수 binding)를 추가했다. 높이(`productNavigation/height` 64), 색, divider 토큰, 44 pt 대상은 그대로다. master ID는 유지했다. 앱 frame 5개는 Tab bar를 Body 밖으로 옮겨 화면 전체 너비(390)로 쓰고, Home indicator 영역 fill을 `productNavigation/bg`에 binding해 bar 색이 하단 safe area까지 이어진다.
- 앱 `ProductNavigation`: 화면 전체 너비, 상단 padding `space[2]`, bar fill이 safe area까지 확장, `minHeight`, label `maxFontSizeMultiplier` 1.3.
- Settings(R-S60): 거래 알림, 0원 거래 표시, 기기 보안 경고는 List item `Trailing=Switch` + C29 Switch(켜짐/꺼짐/켜짐). 복구 구문 보기는 값 없는 disclosure.
- Library 게시는 이 변경 이후 별도로 기록한다.
- Library 게시 완료 (2026-10-14). 변경 목록 13개: `02 Semantic` 3 변수(dark secondary), `03 Component` 4 변수(`button/secondary/bg/*`, `segmented/bg`), Component 11개(Product navigation, 그리고 Button / Secondary를 쓰거나 binding하는 Button / Secondary, Card / Group, Segmented control, Collection state, Receive address, Review footer, Transaction result, Backup status, Connected app row, Token allowance row). 그 외 항목은 없었다. 설명: "2026-10-14: dark Secondary fill neutral 800/700/600, full-width tab bar with top padding, settings switches."

## 2026-10-16 Redesign B in-place restyle

- 오너 승인 (2026-10-16). 기존 master를 제자리에서 restyle했다: Button ×3, Input, Bottom sheet, Keypad, Portfolio balance, Status notice, Summary row, List item, Asset row, Activity row. Master·set·variant·property ID는 유지했다.
- ID 보존 증거: `work/v7/verification/` (`id-baseline.json`, `post-migration-ids.json`, `pre-migration-inventory.json`).
- 복원 지점: Figma named version "pre-B-migration 2026-10-16" (오너가 앱에서 저장, API id 없음).
- Library는 오너가 publish하기 전까지 미게시다. 게시 증거는 아직 없다.
- 새 Primitive: `size.pill_lg/md/sm` (56/48/40), `font.family.pretendard`, `font.size.product15/17/19/22/26`, `font.lineHeight.px17/22/25/27/30/34`, `font.tracking.displayL/displayM/title1/title2/title3/bodySmall/label/caption`(퍼센트), Primitive 타이포 `type.productB.*` 11개.
- 새 Component alias: `buttonB.height/radius/paddingX/primary/secondary`, `rowB.height/paddingX`, `sheetB.radius`, `screenB.bg`. `buttonB.secondary.bgPressed`는 Figma 이름 목록이 없어 `surface.pressed`로 연결했다.
- 변경 값: `component.overlay.scrimBg` `{surface.inverse}` → `{color.neutral.950}` (mode 불변).
- Figma 전용: `opacity/*` Primitive는 퍼센트(0–100). JSON은 fraction 유지.
- 글꼴: Figma는 임시 Gothic A1, 오너가 Pretendard로 교체한다. 기존 `Product /` Style(Inter)은 값을 바꾸지 않았다.
- Icons: `Icon / action / qr`, `Icon / action / more` 추가.
- 미연결: `button.size.*` 높이(44/52)와 `portfolioBalance.bg` JSON alias는 그대로다 (Figma master는 40/48/56, flat). 후속 결정이 필요하다.

## 2026-10-17 Foundation (Redesign B quality review, 오너 "싹다" 승인)

- JSON: `font.tracking.displayL|title2|title3|bodySmall|label|caption` 값 변경(모두 음수), 새 `font.tracking.headline|body|figure|figureUnit`, `font.size.product44`, `font.lineHeight.px52`, `size.badge`(18). `type.productB.headline|body` 자간 alias를 새 tracking으로 변경. 새 `type.productB.figure`(700 44/52 -1.2)와 `figureUnit`(600 24/32 -0.5).
- 새 Semantic `surface.disabled`(Light neutral.100, Dark neutral.800). `component.buttonB.primary.bgDisabled` `{surface.brandTint}` → `{surface.disabled}`(Figma 418:467의 기존 변수를 re-alias). 새 `buttonB.primary.fgDisabled` → `text.disabled`.
- 새 Component: `sectionBand.{height,bg,blockPaddingY}`, `noticeBanner.{radius,padding,iconSize,*.bg}`, `rowBadge.*`. 모두 기존 Primitive/Semantic alias.
- Figma Variable 추가: Primitive `font/tracking/{displayL..caption,figure,figureUnit}`, `font/size/product44`, `font/lineHeight/px52`, `size/badge`. Semantic `surface/disabled`. Component `sectionBand/*`, `noticeBanner/*`, `rowBadge/*`, `buttonB/primary/fgDisabled`. 텍스트 스타일은 오너가 앱에서 편집.
- Master 변경(추가만): `B/Notice inline` 399:122에 `Tier` property 추가(기존 variant는 `Tier=Inline, Tone=*`, 새 `Tier=Banner, Tone=*` 4개). `B/Row` 418:12824에 `Leading` property 추가(기존 `Leading=Icon`, 새 `Leading=Asset badge` ×4 State). 새 `B/Row badge` 495:358, `Brand/Mark` 495:17569 draft. Button Primary Disabled label을 `buttonB/primary/fgDisabled`로 re-bind(9:283, 398:247). Library는 게시하지 않았다.
- 증거: `work/v9/foundation/`.
- 호환: Notice·Row의 variant 이름이 `Tier=Inline, ` / `Leading=Icon, ` 접두를 가진다. 소비 프레임은 default variant로 유지된다. `font.tracking.*` 값 변경은 `packages/tokens` 생성값(`letterSpacing`)에 반영되며 앱 코드 소비는 별도 단계다.

## 2026-10-17 Icon set: Phosphor → Solar (오너 결정)

- 기능 icon을 Solar로 교체했다. Linear = 기본 UI, Bold = 선택된 탭·상태 badge·활성, Bold Duotone = 빈 상태·결과 hero. 자산 identity SVG(ETH, USDC)는 그대로다.
- 출처: 480 Design Solar Icon Set(CC BY 4.0, 출처 표시 필수). RN 패키지 `@solar-icons/react-native` 2.3.2(MIT). 문구는 `outputs/wallet-icon-guide.md` §4.
- Figma: 기존 Icon master 26개의 ID·이름을 유지하고 vector 내용만 Solar Linear로 바꿨다(Phosphor vector 노드를 유지하고 `vectorPaths`만 교체해서 인스턴스의 색 override 28개가 그대로다). Artwork frame 이름은 `ph:` → `solar:`.
- 추가 component(미게시): Linear `Icon / navigation / assets` 506:24468, Bold 9개(506:24479–506:24535), Hero 6개(506:26134–506:26171). 목록은 guide §0.2.
- 수정: `B/Row badge` 495:358 글리프를 Solar Bold 원형으로, `Product navigation` 67:342 선택 항목을 Bold로(Assets 탭은 wallet → home).
- 남은 것: `apps/mobile` 코드는 아직 Phosphor(`apps/mobile/src/shared/ui/Icon.tsx`, package.json). 카탈로그 프레임 137:3의 문구(Phosphor·MIT)는 텍스트 편집 제한으로 그대로다. Library는 게시하지 않았다.
- 증거: `work/v9/icons/`.

## 2026-10-17 Batch 1 review fixes (Phase A·B) and batch 2 polish (#54)

- 새 Semantic `surface.pressedOnRaised`(Light `{color.neutral.100}`, Dark `{color.neutral.600}`). 새 Component `buttonB.secondary.bgOnRaised` → `{surface.pressedOnRaised}`. 추가만이라 호환 영향 없음.
- 값 변경: `rowBadge.pending.fg` `{status.warning.fg}` → `{color.amber.600}`(두 모드). 소비 코드는 생성값을 다시 읽으면 된다.
- 새 Primitive `color.red.950` #3C1F21, `color.amber.950` #342617. Dark `status.danger.bg` `{color.red.900}` → `{color.red.950}`, Dark `status.warning.bg` `{color.amber.900}` → `{color.amber.950}`. Token path는 그대로다. `packages/tokens` 재생성(`node packages/tokens/build.mjs`), test 19개 통과.
- Figma Variable: Primitive `color/red/950` VariableID:533:76, `color/amber/950` VariableID:533:77 추가. Semantic `status/danger/bg`, `status/warning/bg` Dark mode alias 변경(Variable ID 유지).
- Master 변경(추가만): `B/Notice inline` 399:122 Banner 4 변형(493:17437, 493:17444, 493:17451, 493:17458)에 `Title` 레이어와 property `Title`(TEXT), `Show title`(BOOLEAN, 기본 false). Message 스타일은 `Product B/Body Small` + `text/secondary`로 바뀜(모든 Banner에 적용). `Product navigation` 비선택 라벨 `Product B/Label`(500).
- 새 Icon component(미게시): `Icon / settings / document` 533:21894(Solar document-text Linear), `Icon / hero / shield-warning` 533:21900(Solar Bold Duotone, `icon/status/failed`).
- 새 화면 S64 오픈소스 라이선스(ux-flow S62는 알림 설정이라 S64). Library는 게시하지 않았다.

