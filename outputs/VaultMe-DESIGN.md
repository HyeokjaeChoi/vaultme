---
product: VaultMe
source: supplied 1024×1536 landing-page image
scope: light Foundation and synthetic wallet design specimens
version: 2.0
token_file: wallet-foundation.tokens.json
figma: https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8
---

# VaultMe 디자인 언어

상태: 현행 디자인 규범 · 문서 갱신: 2026-10-04

범위: 시각 언어·정보 위계·wallet 의미

[문서 홈](README.md) · [현재 release](vaultme-release.json) · [변경 이력](vaultme-v2-change-log.md)


**서명 전에 계정·자산·금액·상대방·권한·비용·상태를 읽게 한다.** 현재 작업은 재사용 가능한 Foundation과 합성 데이터 Prototype이다. 실행 가능한 wallet 기능과 보안 성능은 별도 구현·검증 대상이다.

## 기준 순서

1. 제공된 landing image: VaultMe의 visual direction과 관측 palette.
2. [Token JSON](wallet-foundation.tokens.json): Primitive → Semantic → Component 값의 원본.
3. [Published Figma Library](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8): native Variables/Styles/master의 source.
4. [v2 확정 계획](../work/research-v2/planning/redesign-plan.md): 제품 anatomy, C01–C28, P01–P12.
5. 타사 reference: 정보 배치와 상태 설명의 근거. VaultMe 색·지원 기능의 근거로 사용하지 않는다.

## Visual grammar

- 넓은 Light canvas와 Ink 제목. 주요 행동은 승인된 Blue A.
- Pale blue는 Secondary surface와 선택·설명용 보조 tint. 그 위의 text는 Ink.
- 큰 잔액은 한 화면에서 한 곳. Row의 자산명·수량·fiat quote를 비교 가능하게 정렬.
- Asset와 Activity는 flat list. Card는 독립 task와 review grouping에 사용.
- 일반 container와 row는 borderless. Type·정렬·간격으로 묶고 기능상 이유가 있는 경계만 남김.
- Control 12 px, group 16 px, overlay 24 px radius. 목록마다 shadow를 반복하지 않음.
- 상태는 icon·label·이유로 표시. 확인한 완료만 success.
- Dark closing CTA는 marketing 장면. 앱 Dark mode는 Q80(2026-10-13)으로 지원한다. OS 설정을 따르고 Semantic `Dark` mode로 전환한다.

색 Anchor는 `#FBFCFE`, `#11161D`, `#DCE8FD`, `#E9FDF1`, `#FBE8E9`를 유지한다. Amber warning, Neutral unknown, `neutral.450` control border는 출처가 기록된 system 확장이다. 사용자는 Blue A를 승인했다. Primary default/hover/pressed는 `#3152FF` / `#2944DB` / `#2138B8`, foreground는 white다. Secondary surface는 `#DCE8FD` + Ink, secondary action은 neutral이다.

Blue A는 공식 업계 UI 조사와 제품 행동 위계에 따른 승인된 brand 확장이다. 이미지 추출값이 아니다. Raw 값은 Primitive에만 두고 Semantic → Component alias로 연결한다. Primitive `color.identity.blue.600/.700/.800` → Semantic `brand.primary`, `brand.secondary`, `navigation.active` → Component 역할에 연결한다. Action blue를 성공·가격 gain·안전성으로 해석하지 않는다. Blue A text on Secondary surface는 4.4967:1로 일반 text 기준에 미달하므로 Ink를 사용한다. 기존 이미지의 전체 Light 방향을 유지한다.

## Surface 위계

**Redesign B(2026-10-16)는 평평한 흰색 한 면(`screenB/bg` = `surface.default`)이다.** Tint 요약과 canvas 구분을 쓰지 않고 row, section 제목, 간격으로 묶는다. 아래는 Redesign B 이전 기록이다.

Light canvas 위에 **C23 대표 요약 한 곳만 Secondary tint**로 구분한다. 큰 balance는 한 곳이다. Assets·Activity·권한 목록과 Review는 흰색의 평평한 읽기 면을 사용한다. Navigation은 neutral 면과 기존 active marker를 유지한다. 페이지마다 tint hero를 반복하지 않는다.

C23의 Complete/Partial/Unavailable은 같은 배경을 사용한다. `portfolioBalance.bg={surface.portfolioSummary}` → `{surface.brandTint}`로 연결한다. 값과 note는 `text.primary`의 Ink를 사용한다. Quote 상태는 valuation 범위·estimate·누락 설명으로 읽게 한다. Tint를 success·gain·safety로 사용하지 않는다.

C23는 `portfolioBalance.padding/radius/borderWidth`를 사용한다. 내부 여백은 `layout.screen.padding`, 모서리는 `shape.group`, 기본 border는 `borderWidth.none`다. Shadow가 없는 낮은 요약 묶음이다. C04로 중첩하지 않는다. Row는 기존 `*.list.radius`와 `shape.row` 역할을 사용한다. 기존 Component radius를 전역 치환하지 않는다.

`overlay.*`는 기존 floating dialog/popover host의 내부 조립 역할이다. White 읽기 면·Ink 글자·`shape.overlay`·기존 `elevation.md`를 alias로 연결한다. Modal scrim은 기존 inverse + `opacity.40`을 사용한다. Nonmodal에는 scrim을 넣지 않는다. 새 public family나 Dark theme를 뜻하지 않는다. Fixed drawer는 기존 경계선으로 구분한다.

UI surface에는 gradient·glow·texture·장식 illustration이 없다. Landing의 기존 artwork field와 Dark closing CTA는 기존 역할을 따른다. 작은 임시 feedback toast의 inverse 조합은 유지할 수 있다. 거래를 판단하는 정보는 toast 밖의 밝은 읽기 면에 남긴다.

근거는 [승인된 Surface 계획](../work/research-v4/fintech-surface/vaultme-surface-enhancement-plan.md)과 [공개 System 조사](../work/research-v4/fintech-surface/public-design-system-reference-map.md)다. Coinbase CDS의 역할 구분과 제한된 brand 면을 참고했다. 타사의 palette를 복사하지 않았다. 적용 단계별 완료는 [release](vaultme-release.json)의 실제 증거로만 확인한다.

### Surface 적용 확인 · 2026-10-04

[Native source review](../work/v4/verification/native/native-review-proof.json)에서 C23의 세 Quote와 P01/P02·P05 배경 Home의 tint·Ink·기존 IDs를 확인했습니다. PNG review에는 흰색 P04 Review·독립 P05 drawer·긴 값·좁은 폭·Partial/Unavailable이 포함됩니다. Source는 10 pages·693 native Variables입니다. Managed 690개와 legacy easing STRING 3개입니다. Text Styles 23개·Effect Styles 3개를 유지합니다. Portable JSON은 796 tokens입니다. Primitive 203개·Semantic 105개·Component 488개입니다.

신규 native scalar Variables는 11개입니다. Shadow alias `effect.overlayShadow`와 `overlay.shadow`는 `nativeType=null`입니다. 기존 `elevation/md` Effect Style로 연결합니다. 감사한 native pages에는 floating dialog/popover/scrim host가 0개였습니다. 새 host를 만들지 않았습니다. `overlay.*`의 native host 채택은 해당 host가 실제로 있을 때 확인합니다. 독립 drawer는 기존 transactionPanel·footer·경계 역할을 사용합니다.

[Web observation](../work/v4/verification/web/browser-observation.json)은 375/390/768/1440 px 화면의 C23 overflow 없음과 explicit text200 Partial 줄바꿈을 기록합니다. 독립 web consumer는 세 Quote·longBalance override·320 px overflow 없음·기존 form feedback을 확인했습니다. 합성 overlay의 Escape close와 trigger focus return도 확인했습니다. Text200은 browser zoom 검사가 아닙니다. Manual screen reader·실제 wallet 검증은 미확인입니다.

**Surface Library publication과 독립 Figma consumer 적용을 확인했습니다.** [Publication proof](../work/v4/verification/native/publication-proof.json)은 Semantic·Component·C23와 별도 review한 Product navigation·Status label의 순차 발행을 기록합니다. Source UI에는 남은 미발행 indicator가 없습니다. Published asset 수는 85개입니다.

[Figma consumer proof](../work/v4/verification/native/consumer-surface-proof.json)는 기존 Button/Input/Transaction panel 세 remote instance의 update 전후 override 보존과 새 C23 세 Quote·longBalance의 발행 후 채택을 구분합니다. 새 C23의 update 전후 override 보존은 아직 검증하지 않았습니다. [Web consumer proof](../work/v4/verification/web/consumer-web-proof.json)는 합성 C23와 기존 form·preview overlay의 제한된 browser 결과입니다. 실제 wallet·전체 runtime·manual screen reader 검증이 아닙니다. Package 완료는 이 문서에서 선언하지 않습니다. Current release의 별도 결과를 확인합니다.

## Borderless와 기능상 예외

일반 group·notice·review panel·주소 block은 외곽 stroke 없이 시작한다. Flat row는 정렬·기존 간격으로 구분한다. 독립 task만 필요한 surface를 사용한다. 선을 뺀 자리를 반복 shadow나 큰 여백으로 채우지 않는다.

Editable Input 인지, focus, invalid/selected 상태, 조밀한 table 비교, 고정 footer와 scroll body, 독립 drawer의 경계는 개별 예외다. 무엇을 구분하는 선인지 설명할 수 있어야 한다. Account/Network 선택은 check·label·선택 면을 유지한다. Amount wrapper도 내부 invalid를 받아 error 경계를 표시한다. 3 px/2 px focus와 44 px target은 유지한다.

Border 색 token path는 보존한다. Width 역할 43개를 Component alias로 추가했다. 기본 정보 container/row는 none, input·recipient·amount wrapper와 필요한 table/nav/footer/drawer 경계는 hairline이다. 정확한 경로는 [Migration](vaultme-v2-migration.md)을 따른다. 전역 `border:0`, `outline:none`, transparent 색 덮기를 하지 않는다. Wallet 필수 데이터·warning·전체 주소를 줄이지 않는다. [Border 권고](../work/research-v2/borders/recommendation.md), [UI 검토 범위](../work/research-v2/borders/skill-audit.md).

## Icons

Phosphor regular의 기능·상태·Navigation icon을 유지한다. 자산 identity는 별도 원본 color SVG다. Wallet·lock·check는 인증이나 안전 보증이 아니다. 중요한 금융 행동에는 icon + visible label을 둔다. Full address, 금액·권한, network, fee와 warning을 줄이지 않는다. Label 옆 icon은 aria-hidden, icon-only control은 accessible action name과 44 px target을 사용한다. 같은 network의 Asset row에서 중복 text만 줄인다. 다른 network label은 남긴다. 크기·foreground는 가장 구체적인 Component alias를 사용하고 logo 고유색은 보존한다. [Icons 안내](wallet-icon-guide.md), [Catalog](wallet-icon-catalog.html).

## 제품 type와 layout

Redesign B부터 UI는 Pretendard 400/500/600(큰 숫자 `figure`만 700, 2026-10-17), 주소·hash는 IBM Plex Mono다(Figma는 임시 Gothic A1). 새 척도는 [Foundation guide](wallet-foundation-guide.md) `type.productB.*`를 따른다. 아래 수치는 기존 `Product /` 역할 기록이다. `typography.balance`는 40/48 px, `typography.amountHero`는 40/48 px Bold(보낼 금액, 화면당 하나), amount 32/40 px, reviewAmount 28/36 px, title 24/32 px, row 16/24 px, body·label·address 14/20 px다. 12/18 px meta는 보조 시간과 문서 caption에만 쓴다. 기본 제품 TEXT를 역할 Style에 연결한다. T02의 22개 TEXT는 200% font-size override로 Style 연결이 해제된 stress 예외다.

웹 숫자는 tabular numerals, 우측 정렬, 단위 표시를 사용한다. Native TNUM 적용은 미확인이다. 아주 작은 수량은 전체 정밀도를 Review에서 읽을 수 있게 한다. 금액에 ellipsis를 쓰지 않는다. 긴 이름·값이 충돌하면 값 영역을 다음 줄로 옮긴다.

Mobile padding 16 px, section gap 24 px. Asset min-height 64 px, Activity min-height 80 px. Body는 fill, value는 hug, accessory 공간은 유지한다. 높이는 내용에 따라 늘어난다. 모든 target은 최소 44 × 44 px다.

320–767 px 한 열, 768–1199 px content max704, 1200 px 이상 max1200와 2열. Desktop review는 480 px drawer다. Table은 Mobile에서 label이 있는 stacked item이 된다. Footer와 scroll body를 분리한다. 주소·warning 위로 footer를 덮지 않는다.

## Foundation 변경 · 2026-10-17

오너 승인("싹다"). 한글 자간은 모든 크기에 음수다. 큰 숫자(잔액·금액)만 700이고 단위는 24/32 600 `text.secondary`로 분리한다. 검토·결과·거래 상세·설정에는 12 px `surface/canvas` 회색 띠(`sectionBand`)를 쓴다. 홈·내역은 흰색이다. Notice는 Banner(tint, radius 16, padding 16)와 Inline 두 단계다. 꺼진 Primary는 `neutral.100` + `text/disabled`다. 상세는 [Foundation guide](wallet-foundation-guide.md) §4.

## Design principles (2026-10-17)

근거: `work/review/rr-staff-pd-2026-10-17.md` §6 (Mobbin iOS 비교). 기준 사이트: [stack-line.dev](https://stack-line.dev). 절제, accent 하나, mono 사실 라벨, 정직한 문구, 엄격한 정렬. 오너 지침: 픽셀 숫자를 쫓지 않고 위계, accent 규율, 레이아웃 구조, 정보 구조, type system, component 논리, 일관성을 먼저 본다.

1. accent는 화면당 하나다. 파랑은 Primary 버튼과 선택 탭뿐이다. 링크는 Ink + 밑줄, 칩은 중립 하나, 상태(초록·빨강·amber)는 badge와 경고에만, 받은 금액은 Ink + "+"다.
2. 큰 숫자는 크고 촘촘하게(700, 음수 자간). 나머지는 조용한 400/500이다.
3. 사실은 mono 마이크로 라벨로 쓴다(`Product B/Fact`): 네트워크, chainId, 블록, 해시, 버전, 사실로서의 시각. 감정과 설명은 sans다. 전체 주소는 `B/Address`다.
4. 선은 기능이 있을 때만 쓴다: 입력 인지, focus, 고정 footer. 구분은 간격과 12 px 띠로 한다.
5. 빈 공간은 설계한다. 화면당 쉼은 한 곳이다. 금액, 칩, 키패드, CTA는 엄지 영역에 한 열로 붙인다.
6. 카피는 약속이 아니라 사실이다. 돈이 나가는 문장은 가장 크게, 가장 진하게 쓴다(Body Small + Ink).
7. 가장 가치 있는 행동에 accent를 준다(실패 뒤 "다시 보내기"). 되돌릴 수 없는 일을 묻는 sheet는 안전한 쪽이 Primary다.
8. 같은 정보는 한 번만 보인다(큰 숫자와 첫 행 중복 금지, 칩은 화면당 1개).
9. 자주 쓰는 것은 움직이지 않는다(키패드). 드문 순간만 움직인다(확정, 잠금 해제). 곡선은 ease-out, 250 ms 이하. 움직임 줄이기에서는 최종 상태만 보인다.
10. 모든 시각 변경은 Figma 먼저, 그다음 앱이다(docs/agents/design-system.md rule 6). Figma와 같다는 말은 품질의 증명이 아니다. 새 구조를 만들기 전에 Mobbin 화면 1–2장을 보고 frame annotation에 링크를 남긴다.

## Review anatomy

1. 행동과 account/network. dApp 행동에는 origin.
2. 결정할 값: 보내는 amount 또는 approval limit.
3. Asset identity와 recipient/spender 전체 주소.
4. Native asset 단위의 estimated network fee. Fiat는 부가 estimate.
5. 총 차감 또는 권한 의미. 다른 asset을 단일 합계로 더하지 않음.
6. 검사 결과, 이유, 범위·시각, 원문/상세.
7. 취소와 정확한 행동 label.

Connection은 선택 계정·network·공개되는 정보를 검토한다. Allowance를 부여하지 않는다. Message signing은 읽힌 필드 또는 raw payload를 검토한다. 해석할 수 없는 예시에서는 Reject를 우선하고 signing을 비활성화한다. Approval은 token·spender·limited/unlimited 범위·fee를 검토한다. Transaction은 실제 자산 변화·recipient·fee·결과 상태를 검토한다.

`No risk signals` Variant의 문구는 `No issues found in available checks`다. Neutral notice를 사용한다. `Unable to verify`는 검사 실패 이유를 표시한다. 성공한 simulation과 readable message는 안전 보증이 아니다.

## 상태와 행동

- `Price unavailable`: token balance 유지. Fiat 0으로 대체하지 않음.
- `Price updated 12 min ago`: stale 시각과 Refresh prices.
- `Fee estimate expired. Refresh it before you continue.`: 갱신 전 Continue 차단.
- `Network fee unavailable`: Retry estimate, signing 차단.
- `Unlimited USDC`: spender가 revoke 전 향후 입금분도 사용할 수 있음을 설명.
- Submitting, Pending, Confirmed, Failed, Unknown은 서로 다른 실제 내용.
- Unknown result: `Check the original transaction before sending again.`
- Backup confirmed는 확인 절차가 완료된 scenario에서만 사용. 비밀 구문·private key 없음.

C21 Token allowance row는 `Scope=Limited/Unlimited`와 `Layout=Mobile/Desktop` 두 축을 가진다. Desktop은 table column, Mobile은 label을 보존한 stacked row다. 기존 Limited/Unlimited master ID는 Mobile variant로 보존했다.

Editable user TEXT와 state 고정 copy를 분리한다. Variant의 상태 label을 set 공통 TEXT 기본값으로 덮지 않는다. 모든 상태를 실제 characters로 검사한다.

## Motion과 접근성

Hover/press 색 120 ms, disclosure 160 ms, dialog 200 ms. 화면 push 250 ms ease-out `cubic-bezier(0.23,1,0.32,1)`, bottom sheet 등장 250 ms `cubic-bezier(0.32,0.72,0,1)`, 닫힘 200 ms (들어온 길로 되돌아감). Foundation 문구는 영어, 화면 문구는 locale별로 덮어쓴다 (Q81). Selection은 즉시 반영한다. 금액·주소·warning에 blur, bounce, stagger를 쓰지 않는다. Reduced motion에서는 transform을 제거한다.

3 px focus ring + 2 px offset, visible label/error, keyboard order, 44 px target을 유지한다. 중요한 내용을 hover에 숨기지 않는다. Prototype에서 Escape/focus restore와 320/390/768/1440 및 200% text를 검사한다. Figma와 정적 대비만으로 접근성 통과를 선언하지 않는다.

## 재사용과 제품 경계

같은 [Figma source](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8)와 stable ID를 유지한다. Native 갱신, JSON import, Library publication, consumer subscription은 각각 증거를 기록한다. 이후 Library update는 변경 review 후 publish한다. 현재 상태는 [release record](vaultme-release.json)를 따른다.

합성 데이터 표시는 frame 밖 caption 또는 artifact control bar에 둔다. Product frame에는 구현 설명을 넣지 않는다. 현재 specimen 언어는 `en-US`다. 지원 시장·locale·network·custody·recovery는 별도 제품 결정이다.

실제 recovery phrase와 private key를 산출물에 넣지 않는다. 확인되지 않은 Buy, Bridge, Stake, Swap 실행, hardware wallet, biometrics, 인증 badge, QR, chart를 추가하지 않는다.

## 다음 문서

정확한 값과 사용법은 [Foundation guide](wallet-foundation-guide.md)를 따른다. 행동 데이터와 상태는 [Component 계약](wallet-component-contracts.md), 실제 family 사용법은 [Component 목록](components/README.md)을 따른다. Figma 문서 보드 구성은 [Figma organization](figma-organization.md)을 따른다. 연구 근거는 [Reference 검토](vaultme-reference-review.md)에 있다.


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
