# VaultMe v2 Component 계약

상태: 현행 Component·action 계약 · 문서 갱신: 2026-10-04

범위: C01–C28, P01–P12, synthetic state·data·locale

[문서 홈](README.md) · [현재 release](vaultme-release.json) · [변경 이력](vaultme-v2-change-log.md)


기준: [확정 계획](../work/research-v2/planning/redesign-plan.md) §3–6.

이 문서는 Figma와 로컬 Prototype의 **닫힌 상태 계약**이다. 실제 wallet API가 아니다. C01–C28/P01–P12의 현재 구현과 증거는 [release record](vaultme-release.json)를 따른다. Family 사용법은 [Component 목록](components/README.md)에 있다.

## Source와 값

[Token JSON](wallet-foundation.tokens.json) → [Foundation guide](wallet-foundation-guide.md) → [DESIGN](VaultMe-DESIGN.md)를 따른다. Semantic과 Component는 정확한 단일 alias다. 가장 구체적인 Component path를 쓴다. 없는 path를 임의 값으로 보완하지 않는다.

코드의 `state`, `scope`, `size`, `quote`는 unrestricted string 대신 literal union을 사용한다. 알 수 없는 상태를 기본 success로 표시하지 않는다. Figma property label과 코드 union의 대응을 기록한다.

## C01–C28: 상태와 구조

아래 목록은 이번 v2 실행 계약이다. 새 public family를 임의로 늘리지 않는다. 내부 subcomponent는 가능하다.

| ID | Family | 닫힌 상태 / 속성 | 필수 구조 |
| --- | --- | --- | --- |
| C01 | Button / Primary·Secondary·Ghost | Size=Small/Medium/Large; State=Default/Hover/Focused/Pressed/Disabled/Loading | label hug, Loading 폭 유지, duplicate action 차단 |
| C02 | Icon button | Default/Hover/Focused/Pressed/Disabled | 44 px target, 일관된 icon, accessible name |
| C03 | Input | Default/Focused/Filled/Invalid/Disabled | label/input/helper-error 세로 배치 |
| C04 | Card / Group | Default/Task | 독립 task 또는 정보 묶음 |
| C05 | Status label | Pending/Confirmed/Failed/Warning/Info/Unknown | icon+정확한 label |
| C06 | Navigation | Marketing Desktop; Product Mobile/Desktop; active/focus | Assets / Activity / Settings |
| C07 | Account selector | Selected/Available | 이름+주소, selected check, 긴 이름 |
| C08 | Network selector | Active/Available/Unavailable | 이름+상태 이유, unavailable 선택 차단 |
| C09 | Asset row | Quote=Available/Unavailable/Stale; Selected/Focused specimen | token balance와 fiat quote 분리, flat row |
| C10 | Activity row | Pending/Confirmed/Failed/Unknown | action/counterparty/amount/status |
| C11 | Receive address | Default/Copied/Copy failed | 전체 주소/network/copy/network 일치 안내. QR 없음 |
| C12 | Recipient field | Empty/Entered/Review/Invalid | 편집과 전체 주소 review 구분 |
| C13 | Amount field | Ready/Insufficient asset/Insufficient fee | 32 px 입력, unit, available balance, 부족 이유 |
| C14 | Fee summary | Fresh/Stale/Unavailable/Insufficient | native fee, fiat estimate, freshness, 차감 방식 |
| C15 | Transaction panel | No risk signals/Review required/Unable to verify | context, 자산 변화, full recipient, fee, checks/detail |
| C16 | Approval panel | Limited/Unlimited/Editing limit | token, full spender, limit, native fee, 권한 의미 |
| C17 | Connection request | One account/Two accounts | origin, 실제 1/2개 선택 행, network, 공개 정보 |
| C18 | Signature request | Readable/Unrecognized | origin/account, 읽힌 필드 또는 원문, 해석 범위, 행동 |
| C19 | Backup status | Pending/Confirmed | 상태별 문구, 비밀 없음, content height |
| C20 | Connected app row | Connected/Disconnected | origin, account/network, Disconnect와 status 분리 |
| C21 | Token allowance row | Scope=Limited/Unlimited; Layout=Mobile/Desktop | token/spender/network/current allowance/review |
| C22 | Product header | Mobile/Desktop | account/network, back/detail |
| C23 | Portfolio balance | Complete quote/Partial quote/Unavailable | 총 quote, 기준 통화, 누락 범위 |
| C24 | Review footer | Ready/Busy/Blocked | Cancel+정확한 행동, 주 버튼 52 px, 차단 이유 |
| C25 | Status notice | Info/Warning/Danger/Unknown/Confirmed | icon/title/reason/해당 다음 행동 |
| C26 | Address block | Compact/Full | Compact는 목록만. Review/Detail은 Full, copy target 44 px |
| C27 | Collection state | Loading/Empty/Unavailable | 같은 list footprint, 설명, 가능한 다음 행동 |
| C28 | Transaction result | Action=Send/Receive/Approve/Revoke; State=Submitting/Pending/Confirmed/Failed/Unknown | 관찰한 상태, hash/time/다음 행동 |

C21은 Scope와 Layout 두 축을 함께 사용한다. 기존 Limited/Unlimited master ID는 Mobile로 보존했다. Desktop은 allowance table, Mobile은 label을 보존한 stacked item이다.

Figma에서는 기존 master ID를 가능한 한 보존한다. User content는 TEXT property로 노출한다. `Unlimited`, Pending, stale 안내 등 state copy는 Variant별 고정 내용이다. 전체 set의 공통 TEXT 기본값에 연결하지 않는다.

```ts
// 제안된 UI 계약. 실제 wallet API가 아니다.
type CheckState = "no-risk-signals" | "review-required" | "unable-to-verify";
type TransactionState = "submitting" | "pending" | "confirmed" | "failed" | "unknown";
type QuoteState = "available" | "unavailable" | "stale";
type FeeState = "fresh" | "stale" | "unavailable" | "insufficient";
type ApprovalScope = "limited" | "unlimited";
type SignatureData = "readable" | "unrecognized";
```

CheckState와 TransactionState는 별개다. “검사에서 문제를 못 찾음”은 “거래 확정”이 아니다. Generic dialog open/closed와 wallet lifecycle도 별개다.

## Surface와 host 계약

Wallet Home의 C23만 대표 Secondary tint 요약 면을 갖는다. Complete/Partial/Unavailable은 같은 `portfolioBalance.bg`를 사용한다. `portfolioBalance.value`와 `portfolioBalance.note`는 Ink의 `text.primary`다. Valuation scope·currency·estimate·coverage/time을 함께 표시한다. Missing quote를 0으로 바꾸지 않는다. Passive balance는 Tab stop이 아니다.

C23 root는 `portfolioBalance.padding/radius/borderWidth`로 조립한다. Borderless이며 shadow가 없다. 큰 balance는 한 곳이다. C04 중첩·페이지별 tint hero·클릭 가능한 balance card를 만들지 않는다. C06 Navigation·Asset·Activity·권한·Review는 기존 neutral 또는 white 읽기 면을 사용한다. Review account/network/asset/full address/amount 또는 allowance/native estimated fee/status는 그대로 읽게 한다.

`overlay.*`는 C07/C08 picker와 C15–C18 review를 담는 기존 floating host의 내부 token 역할이다. 새 C29와 public consumer prop은 없다. `overlay.bg/fg/radius/shadow`는 white·Ink·기존 overlay shape/elevation에 alias한다. 자식 상태 foreground를 덮지 않는다. Modal에만 `overlay.scrimBg/scrimOpacity`를 적용한다. Nonmodal popover에는 scrim이 없다. Fixed drawer는 기존 `transactionPanel.drawerBorderWidth` 기능 경계를 유지한다.

Host 구현자는 accessible title·초기 focus·modal focus containment·Escape/close·trigger로 focus restore를 제공한다. Close는 chain transaction 취소가 아니다. Token 또는 Figma Variant만으로 이 동작이 구현되지 않는다. Inline panel은 dialog가 아니다.

사용 안내는 Anatomy → States → Tokens → Accessibility → Usage → Lifecycle/Evidence 순서로 읽는다. Preview contract와 제품 runtime 상태를 구분한다. 새 Surface의 native 적용·Library publication·독립 consumer update는 각각 새 증거가 있어야 완료로 기록한다.

### 이번 Surface의 실제 적용 범위

[Native review](../work/v4/verification/native/native-review-proof.json)에서 C23의 binding·세 Quote·기존 IDs·영향받은 합성 화면의 PNG를 확인했습니다. 감사한 native pages에는 floating dialog/popover/scrim host가 0개였습니다. Overlay alias는 기존 host를 채택할 때 사용할 내부 역할이며 native host 구현 완료가 아닙니다. 두 shadow alias는 `nativeType=null`이며 기존 `elevation/md` Effect Style에 대응합니다.

[Web observation](../work/v4/verification/web/browser-observation.json)은 C23 responsive·explicit text200 Partial과 독립 consumer의 세 Quote·긴 balance·320 px overflow·기존 form feedback을 기록합니다. 합성 overlay의 Escape/focus return도 확인했습니다. Browser zoom·manual screen reader·실제 wallet 검증으로 확대하지 않습니다. [Publication proof](../work/v4/verification/native/publication-proof.json)에서 Surface와 별도 review한 두 geometry repair의 발행을 확인했습니다. [Figma consumer proof](../work/v4/verification/native/consumer-surface-proof.json)는 기존 세 remote specimen의 update/override 보존과 새 C23 세 Quote·longBalance의 발행 후 채택을 기록합니다. 새 C23의 update 전후 override 보존은 미검증입니다. [Web consumer proof](../work/v4/verification/web/consumer-web-proof.json)는 합성 browser 범위입니다. Package 완료는 별도 확인합니다.

## 행동별 필수 데이터

| 행동 | Review에서 유지할 데이터 | 별도 경계 |
| --- | --- | --- |
| Connection | origin, 선택 account 수/전체 목록, network scope, 공개 정보 | allowance나 on-chain fee를 부여하지 않음 |
| Message signing | origin/account, exact message 또는 raw payload, 해석 상태 | Readable은 안전 보증 아님. Unknown specimen은 signing blocked |
| Token approval | account/network/token, full spender, exact scope/limit, native estimated fee, 의미 | Unlimited는 향후 입금분도 영향. Disconnect와 별개 |
| On-chain send | account/network/asset, amount, full recipient, native estimated fee, total deduction, check/result status | estimate/pending/confirmed/failed/unknown 구분 |

Network fee는 native asset로 표시한다. Fiat는 부가 estimate다. ETH와 ETH fee는 합산 가능하다. USDC와 ETH fee는 별도 줄로 유지한다. Request에 해당하지 않는 allowance를 transaction에 항상 넣지 않는다.

Origin은 요청의 출처다. 검증 시스템이 없는 Prototype에서 `Verified` badge를 만들지 않는다. Explorer/retry/cancel/revoke는 해당 제품 동작이 실제 구현된 뒤 연결한다.

## 상태별 고정 내용

아래 transaction copy는 Send의 기본 의미입니다. C28은 Action별로 title·이유·counterparty·amount 또는 allowance를 구분합니다. Exact copy와 native property는 [C28 recipe](components/C28-result.md)를 따릅니다.

| 상태 | 문구 / 데이터 | 허용된 다음 행동 |
| --- | --- | --- |
| Quote unavailable | `Price unavailable`, token balance 유지 | 가격이 없는 이유 확인 |
| Partial quote | `Priced assets` / `1 asset has no price` | 누락 범위 확인 |
| Stale price | `Price updated 12 min ago` | Refresh prices |
| RPC unavailable | `Could not reach Ethereum` / `Balances may be out of date.` | Try again |
| Invalid recipient | `Enter a valid Ethereum address.` | 편집. Continue blocked |
| Insufficient asset | `Amount exceeds available balance.` | amount 편집 |
| Insufficient fee | `Add ETH to pay the network fee.` | signing blocked |
| Stale fee | `Fee estimate expired. Refresh it before you continue.` | Refresh fee |
| Fee unavailable | `Network fee unavailable`. Estimated total도 알 수 없음. Fee 확인 완료 문구 금지 | Retry estimate, signing blocked |
| No risk signals | `No issues found in available checks` + 범위/시각 | 중립 notice, details |
| Unable to verify | `Could not simulate this request` + 이유 | details |
| Unlimited | `Unlimited USDC` / `This spender can use future USDC deposits until you revoke this approval.` | Set a limit |
| Submitting | `Submitting transaction` | 중복 행동 차단 |
| Pending | `Waiting for confirmation` + 관찰된 hash | detail |
| Confirmed | `Transaction confirmed` + 시각/chain evidence fixture | View activity |
| Failed | `Transaction failed` + 원인 fixture | Review details |
| Unknown | `Transaction status unavailable` / `Check the original transaction before sending again.` | Check status. Send again 없음 |
| Backup confirmed | `Backup confirmed` | 확인 절차 완료 가정은 frame 밖 caption에 표시 |

## P01–P12: 조립 화면

| ID | Screen | Frame | 필수 내용 |
| --- | --- | --- | --- |
| P01 | Wallet / Assets | 390×844 | account/network, 큰 balance, Send/Receive, asset list, nav |
| P02 | Wallet / Assets desktop | 1440×1024 | max1200, 자산 main + recent Activity side |
| P03 | Send / Compose | 390×844 | context, recipient, amount, available balance, estimated fee, Continue |
| P04 | Send / Review | 390×844 | full recipient, amount/native fee/total, status, Confirm send |
| P05 | Send / Review desktop | 1440×1024 | P02 + 480 px drawer, review content 432 px |
| P06 | Connect | 390×844 | reserved origin, 두 account 행, network, 공개 정보, Cancel/Connect |
| P07 | Sign message / Readable | 390×844 | origin/account, domain/nonce/message, 해석 범위, Reject/Sign message |
| P08 | Sign message / Unrecognized | 390×844 | raw payload, 해석 불가 이유, Reject 우선, signing disabled |
| P09 | Token approval / Limited | 390×844 | full spender, 1,500 USDC limit, Edit, fee, Approve limit |
| P10 | Token approval / Unlimited | 390×844 | Unlimited USDC, 향후 입금분 설명, Set a limit |
| P11 | Permissions desktop | 1440×1024 | Connected apps와 Token allowances 별도 section, allowance table |
| P12 | Receive | 390×844 | account/network/full address/Copy/network 안내. QR slot 없음 |

P04의 결과는 Submitting/Pending/Confirmed/Failed/Unknown 다섯 화면이다. Prototype는 바깥 scenario control로 합성 결과를 선택한다. Confirm 버튼 클릭만으로 Confirmed가 되지 않는다. 모든 frame 밖에 `Design prototype · Synthetic data` caption을 둔다.

## Redesign B 시각 계약 (2026-10-16)

Master·variant·property ID와 property 이름은 바꾸지 않고 시각만 restyle했다(증거: `work/v7/verification/`). 면은 평평한 흰색(`screenB/bg`)이다. Library 게시는 오너 publish 전까지 하지 않는다.

| Master | 시각 계약 |
| --- | --- |
| C01 Button ×3 | pill(`buttonB.radius`), 높이 40/48/56(Small/Medium/Large). 기존 State와 Label·Icon·ShowIcon 유지. 44 px target 유지 |
| C03 Input | Redesign B Input 스타일. State 이름 유지 |
| C29–C33 Bottom sheet | 위 모서리 32(`sheetB.radius`), Secondary가 Primary 위 |
| Sheet 안 Secondary (2026-10-17) | 배경 `buttonB.secondary.bgOnRaised` → `surface.pressedOnRaised` (Light neutral.100, Dark neutral.600). 되돌릴 수 없는 일을 묻는 sheet는 "취소"가 Primary, 실행 쪽은 danger 글자 Secondary (§9.3). Dark 경계 대비는 1.93:1이다. **수용(pd-review batch 1 P1-9, 2026-10-17):** 버튼 글자(`buttonB.secondary.fg`, 약 7:1)가 컨트롤을 식별한다. WCAG 2.2 SC 1.4.11은 글자가 컨트롤을 식별하면 경계 대비를 요구하지 않는다. 변경 없음. 글자를 지우거나 icon-only Secondary를 sheet에 두면 이 수용은 무효다 |
| Keypad | Redesign B 스타일. property 없음 |
| C23 Portfolio balance | flat, tint 없음. Quote 이름 유지 |
| C25 Status notice | 박스 없이 인라인 icon + 글자. Tone 이름 유지 |
| Summary row, List item | Redesign B 스타일. Format·Trailing 유지 |
| C09 Asset row | 64(`rowB.height`), flat |
| C10 Activity row | 최소 64, flat, 40 원형 icon |

## 합성 fixture와 Stress

Address: account `0x1111111111111111111111111111111111111111`, second `0x2222222222222222222222222222222222222222`, recipient `0x3333333333333333333333333333333333333333`, spender `0x4444444444444444444444444444444444444444`. EVM fixture는 0x + 40 hex, hash는 0x + 64 hex다. Origin은 `swap.example`이다.

Account는 `Everyday`, `Long-term holdings`. 잔액은 `1.284732 ETH`, `2,482.17 USDC`. Send는 `0.042 ETH`, fee `0.00063 ETH`, estimated total `0.04263 ETH`. Ethereum/ETH/USDC는 예시 맥락이며 지원 선언이 아니다. Decimal 값은 문자열로 보관한다.

| ID | 검사 내용 |
| --- | --- |
| T01–T02 | 320 px, 200% text |
| T03–T05 | 48자 account, 긴 origin, full address/hash |
| T06–T07 | `0.000000000000000001 ETH`, `12,345,678.123456 USDC` |
| T08–T09 | missing quote, stale quote/fee |
| T10 | empty/one/20 asset rows |
| T11 | 긴 한국어 설명, 독일식 number formatting |
| T12–T13 | 두 account, warning 3줄 |
| T14–T15 | unknown result, offline 후 retry |
| T16 | allowance/revoke와 Disconnect 상태 독립 |

## 접근성과 적용 확인

### Border 계약

일반 container와 flat row는 borderless를 기본으로 한다. C04/C23/C25/C26/C27/C28의 장식 perimeter, C14의 작은 묶음 내부 반복 선, C07/C08의 picker box를 자동 추가하지 않는다. 목록의 마지막 선도 기본으로 제거한다. Type·정렬·기존 min-height와 spacing으로 같은 항목을 읽게 한다.

| 기능상 예외 | 지켜야 할 상태 |
| --- | --- |
| C03/C12/C13 editable Input | 입력 인지, label/helper/error, focus. Amount wrapper에 내부 invalid 전달 |
| C07/C08 선택 | check·label·selected surface 유지. 보조 outline은 필요한 경우만 |
| C09/C10/C20/C21 긴 목록·table | 항목 비교가 어려울 때 separator. C21 Scope/Layout 축과 row label 유지 |
| C06/C22/C24 chrome | 고정 bar/body·footer 또는 독립 drawer가 섞일 때 경계 |
| C16/C25 위험·미확인 | icon/title/reason/다음 행동 유지. 색만 남기지 않음 |

Width는 Component 역할 alias로 관리한다. 기존 border-color path는 삭제하거나 전역 transparent로 바꾸지 않는다. 기본 none과 기능상 예외 hairline은 기존 Primitive width 역할에 연결한다. Focus의 3 px ring과 2 px offset은 일반 border width와 별도다. 전역 `border:0`/`outline:none`을 사용하지 않는다.

사용자는 Borderless + Blue A를 승인했다. Blue A는 action 역할이며 success/gain/safety state와 다르다. Primary white text, Secondary tint의 Ink text, neutral secondary action을 유지한다. Width path의 적용 결과는 release record를 따른다. Input/Recipient/Amount outer는 `{borderWidth.hairline}`, amount inner는 `{borderWidth.none}`다. `allowanceRow.table.dividerWidth`, `productNavigation.borderWidth`, `reviewFooter.borderWidth`, `transactionPanel.drawerBorderWidth/sectionDividerWidth`도 hairline이다. 일반 정보 container/row는 none이다. 기존 generic `button.borderWidth`보다 variant별 `button.primary/secondary/ghost.borderWidth`를 사용한다.

Amount wrapper와 내부 input은 같은 validation 결과를 사용한다. Invalid 경계와 오류 문구를 함께 표시한다.

44 × 44 px target, 3 px focus + 2 px offset, persistent label/error, tab order, dialog Escape/focus restore, reduced motion을 확인한다. 숫자를 자르지 않는다. Warning을 hover에 숨기지 않는다. Footer가 full address를 가리지 않게 한다.

Native TNUM은 미확인이다. T02의 22개 TEXT는 직접 font-size 2배 override로 Style 연결이 해제된 stress 예외다. 기본 product Style 누락으로 계산하지 않는다.

Static color contrast, Figma geometry, Prototype keyboard 검사를 구분한다. Figma만으로 screen reader·wallet 기능 통과를 주장하지 않는다. 최종 증거는 [변경 기록](vaultme-v2-change-log.md)에 연결한다.

## Icons 계약

| 적용 위치 | 유지할 계약 |
| --- | --- |
| C01 주요 Button | Send/Approve/Sign/Revoke의 정확한 visible label. Icon은 보조 |
| C02 Icon button | accessible action name, 44 px target, focus/disabled 이유 |
| C05/C25/C28 상태 | icon + label + 이유. clear check와 confirmed를 구분 |
| C11/C15/C16/C17/C18/C21/C24/C26 Review | 관련 account/network/asset/full address/amount 또는 allowance/estimated fee/status |
| C07/C08 Account/Network | Wallet/Ethereum glyph와 실제 이름·선택 marker. 지원·인증 claim 금지 |
| C09 Asset row | 원본 identity, 이름·symbol·balance. 같은 상단 network만 반복 생략 |
| C06 Navigation | Assets/Activity/Settings visible label과 active state |

기능은 Phosphor regular, identity는 별도 원본 color SVG다. Label 옆 SVG/img는 aria-hidden이다. 미확인 identity에는 neutral fallback을 사용한다. Local icon 25개 연결(Redesign B의 `qr`, `more` 추가 전 기록. 현재 기능 25 + identity 2)은 정적 확인 완료이며 Native와 Library 통합도 완료했다. 최종 증거는 아래 적용 기록을 따른다. [Icons 안내](wallet-icon-guide.md), [로컬 검증](../work/v2/verification/icons-local.json).

Icons의 390 px Assets/Send Review는 실제 browser에서 logo load, wallet Review 데이터, 44 px target, overflow 0을 확인했다. Catalog 25행과 status 검색 7개도 확인했다. [Browser 증거](../work/v2/verification/icons-runtime.json). 확인한 합성 화면에 한정한 결과이며 screen reader·실제 wallet 검증은 아니다.

## Locale 계약

현재 UI specimen과 기본 copy는 `en-US`다. 이는 localized product가 아닌 합성 Prototype 계약이다. 한국어 문서는 제품 UI의 한국어 지원 선언이 아니다. T11의 한국어·독일식 숫자는 stress fixture다.

| 데이터 | 현재 계약 |
| --- | --- |
| 수량의 source | Decimal 문자열. Group separator 없음. 예: `1500.25` |
| 기본 표시 | `en-US`, 소수점 `.`, grouping `,`. Unit과 fiat 통화 구분 |
| Amount 입력 | 검증된 decimal 문자열로 변환. 미지원 separator를 추정 변환하지 않음 |
| 작은 수량 | Review에서 원래 precision 보존. 반올림된 0으로 표시하지 않음 |
| Quote/fee unknown | 0으로 대체하지 않음. unavailable 또는 unknown 표시 |
| 언어와 방향 | 기본 UI `lang="en-US"`, `dir="ltr"`. 한국어 stress 구간은 `lang="ko"` |
| 주소·hash | 번역하지 않음. 전체 문자열과 순서 보존 |

Localized product를 만들 때 입력 허용 문자, locale fallback, 통화 위치, 화면 copy, 오류 copy, `lang`/`dir`, font glyph를 함께 확정하고 검사한다. 현재 Prototype의 mixed-language stress는 그 검사의 대체물이 아니다.

## Redesign B 1차 추가 component (2026-10-17)

Figma `Components · Redesign B` (398:77). 모두 새 component다. 기존 master ID와 property는 그대로다.

| Component | Node | 계약 |
| --- | --- | --- |
| B/Section band | 494:341 | 12 px 회색 띠 (`sectionBand/height`, `sectionBand/bg`). 검토·결과·거래 상세·설정에서만. 홈·내역은 쓰지 않음 |
| B/Block header | 494:342 | 띠로 나뉜 블록의 Label 제목 (`text/tertiary`) + 선택 링크 ("수정", "자세히", "거래 상세"). 코드에서 링크 hit area 44 px |
| B/Status chip | 494:1067 | Tone=Testnet / Test data / Network. 정직 표시 칩. 버튼이 아님. 테스트넷 칩은 지갑 화면마다 보임 |
| B/Address | 494:1090 | Size=M (16/24) / L (18/28). 전체 주소 10묶음. 첫 묶음(0x+4)과 끝 묶음은 strong + `text/primary`, 가운데는 `text/secondary`. 비슷한 주소의 다른 묶음은 `Product B/Address M diff` + `status/danger/fg` (밑줄, 색만으로 구분하지 않음) |
| B/Amount hero | 494:1142 | Kind=Review (자산 로고 48, Figure + Figure unit, 문장) / Result (로고 56 + B/Row badge, Title 2, Figure, 문장, 가운데 정렬). Asset은 INSTANCE_SWAP |
| B/Progress steps | 494:1176 | Step=Sent / Included / Confirmed. 끝난 단계 `status/success`, 지금 단계 `status/warning`, 남은 단계 `border/default`. Unknown·Replaced·Failed에는 쓰지 않음 |
| B/Row badge (추가 Kind) | 494:326, 494:331, 494:336 | Kind=Confirmed / Unknown / Replaced. 기존 Sent/Received/Pending/Failed와 같은 구조 |

같이 바꾼 것 (추가만):
- B/Row `Leading=Asset badge` 변형의 Title·Subtitle·Value·Sub value 글자를 기존 text property에 연결했다. 전에는 연결이 없었다.
- B/Notice inline `Tier=Banner` 변형의 Message·Link를 기존 property에 연결했다.
- B/Amount display: Amount는 `Product B/Figure`, Ticker는 `Product B/Figure unit`, 기준선 정렬.
- 새 text style: `Product B/Address M`, `Address M strong`, `Address M diff`, `Address L`, `Address L strong` (IBM Plex Mono 400/600). Token JSON에는 아직 없다.
- 받기 QR은 component가 아니다. S30 프레임 안 `QR code`(29×29 모듈, 4 모듈 여백, `color/neutral/0` 판 + `color/neutral/950` 모듈, 두 모드 모두 밝은 판)이다. 내보낸 PNG를 jsQR 1.4.0으로 해독해 주소와 같음을 확인했다 (`work/v9/qr-decode-proof.json`).

## Redesign B 2차 추가 component (2026-10-17)

Figma `Components · Redesign B` (398:77). 기존 master ID는 그대로다. 기존 component에는 property를 더하기만 했다.

| Component | Node | 계약 |
| --- | --- | --- |
| B/Check row | 515:27570 | State=Off / On. Title(Headline) + Body(Body Small, `Show body`). Off는 `border/strong` 테두리 상자(선택 control이라 기능 테두리), On은 `action/primary/bg` 상자 + 흰 check. 행 전체가 누름 영역(44 px 이상). 모두 On이어야 Primary가 켜진다 (S02 3개, S03 1개) |
| B/Account block | 515:27571 | 설정 맨 위. 아바타(지갑 아이콘) + 계정 이름 + 짧은 주소(`Product B/Address M`) + "복사" Secondary sm 버튼(보이는 label). 복사 = impactLight haptic + "복사했어요" 토스트(앱) |
| B/Balance hero `State=Figure` (변형 추가) | 515:27593 | Label + Amount(`Product B/Figure`) + Unit(`Product B/Figure unit`, 새 text property `Unit`) 기준선 정렬 + Sub. 홈 hero |
| B/Settings row (property 추가) | 426:2045 | `Show icon`(기본 false) + `Icon`(INSTANCE_SWAP, Solar Linear 20). Chevron을 `Icon / navigation / disclosure`로 바꿈 |
| B/Secret grid (변형 수정) | 426:2044 | 두 변형 모두 `surface/subtle` 판(radius 16) 안 번호 2열. Hidden = layer blur 14 + "탭해서 보기" pill. 단어는 공개 BIP39 test vector(abandon ×11, about)만 |

새 Solar icon (09 Icons, CC BY 4.0, 480 Design): `Icon / account / key` 516:235, `Icon / settings / bell` 516:244, `Icon / settings / eye` 516:253, `Icon / settings / network` 516:264, `Icon / status / device-warning` 516:274 (Linear 20, `icon/action/fg`), `Icon / hero / face` 516:288 (Bold Duotone 48, `icon/brand`, 뒤 층 50%).

## 최종 검수 수정 (2026-10-17, `work/review/pd-review-final-2026-10-17.md`)

Master ID와 property는 그대로다. Library는 게시하지 않았다.

| Component | Node | 바뀐 계약 |
| --- | --- | --- |
| B/Bottom sheet, Bottom sheet | 399:157, 301:606 | 아래 padding `space/12`(48 = 16 + home indicator 34 근사). 화면에서는 프레임 바닥에 붙이고 constraint Bottom. 모든 sheet가 같다 (P1-1) |
| B/Bottom sheet grabber | 399:158 | `border/subtle` → `bottomSheet/grabber`(`border/default`). Dark에서 sheet 판(`surface/raised`)과 같은 색이라 안 보였다 (P1-4) |
| Sheet 안 Secondary | S50 등 | 모든 sheet Secondary는 `buttonB/secondary/bgOnRaised` (P1-4, S50 "나중에" 수정) |
| B/Address compare | 477:5145 | 주소 행 좌우 padding 0. sheet 제목·본문과 같은 16 시작선 (P2-18) |
| B/Settings row (라이선스 목록) | 426:2045 | S64에서는 instance 높이를 `size/control_lg`(52)로 묶는다. 한 줄 정보 행. 버전은 S65에서 보인다 (P1-6) |
| Icon swap 뒤 색 | 규칙 13 | 빈 지갑 S10의 보내기(Secondary)로 바꾼 뒤 아이콘을 `buttonB/secondary/fg`로 다시 묶었다 (P1-8) |

Paint 검사(`.claude/skills/vaultme-figma-screen/audit.js`): 보이는 모든 node의 solid paint는 variable에 묶여 있거나 style이어야 한다 (`unboundPaint` = 0). 묶여 있어도 저장된 색이 해석 값과 다르면 `stalePaint`다 (= 0). 예외는 자산 identity artwork(ETH 137:402, USDC 137:429)와 OS chrome·QR 뿐이다. 최종 검수의 `#000000` 글자·아이콘은 묶인 paint가 seed 색 {0,0,0}을 그대로 가진 경우였다. Desktop export가 그 저장 색을 그렸다.


## Seamless 검수 후속 (2026-10-17, `work/review/seamless-*-2026-10-17.md`)

기존 master ID와 property는 그대로다. 새 variant만 더했다. Library는 게시하지 않았다.

| Component | Node | 바뀐 계약 |
| --- | --- | --- |
| Icon / status / loading | 137:178 | glyph를 정지한 새로고침 화살표(Solar restart)에서 3/4 고리 spinner로 바꿨다. Busy: 회전 0→360°, 800 ms, linear, 반복. 움직임 줄이기: 회전 없음 + 진행형 label("보내는 중…", "복구하는 중…") |
| Button / Primary, Button / Secondary | 9:283 `Size=Large, State=Copied` 555:64682, 9:284 `Size=Large, State=Copied` 555:68322 | 새 variant. "복사했어요" + check icon(label·icon 고정). 복사 성공 뒤 1.5 s, 150 ms crossfade, haptic impactLight, screen reader "복사했어요" |
| B/Button | 398:247 `Type=Secondary, Size=sm, State=Copied` 555:68334 | 같은 Copied 계약(USDC 컨트랙트 "복사", 계정 블록 "복사") |
| B/Account block | 515:27571 → set 555:68341 (`State=Default` 515:27571, `State=Copied` 555:68342) | component를 variant set으로 묶었다. 기존 instance는 Default로 그대로 연결 |
| B/Bottom sheet, Bottom sheet | 399:157, 301:606 | 설명에 끌어서 닫기: 아래로 1:1, 놓을 때 높이 30% 또는 500 pt/s 넘으면 닫기(200 ms), 아니면 spring 복귀(300 ms, damping 0.8). 닫기 = 취소 |

## S05 단어 칸 · 선택 패스프레이즈 (2026-10-17, redesign-b.md §9.3)

새 component 1개, 기존 component에 property 추가, Solar icon 3개. 기존 master ID와 property는 그대로다. Library는 게시하지 않았다.

| Component | Node | 계약 |
| --- | --- | --- |
| B/Word cell (새) | 565:73619 (`State=Empty` 565:73599, `Focus` 565:73604, `Filled` 565:73609, `Error` 565:73614) | 복구 단어 1개 칸. Text property `Number`(왼쪽 번호, 폭 20, `Product B/Caption`, `text/tertiary`) + `Word`(`Product B/Body`, `input/fg`, Empty에는 연결 안 함). 판 `input/bg/default`, radius `input/radius`, 테두리 `input/borderWidth` + `input/border/default` · Focus `input/border/focus` + caret(`input/border/focus`) · Error `input/border/error`. 높이 48(padding `space/3` + Body 24), 누름 영역 44 이상. 오류 메시지는 칸 안이 아니라 grid 아래. 접근성 이름 "N번째 단어". 키보드: 영문 소문자, 자동 대문자·자동 수정·추천 끔. 스페이스·엔터 = 다음 칸, 빈 칸에서 지우기 = 이전 칸, 어느 칸에든 붙여넣은 구문은 1번 칸부터 나눠 채움(12·24단어면 칸 수도 바꿈). Focus 테두리 150 ms ease-out, 움직임 줄이기: 바로 바뀜. haptic 없음 |
| B/Input (property 추가) | 421:805 | `Show action`(BOOLEAN, 기본 false) + `Action icon`(INSTANCE_SWAP, 기본 `Icon / settings / eye`). Kind=Text 변형의 Field 오른쪽 끝 아이콘 버튼. S05 패스프레이즈: 가림 = eye(보기), 보임 = eye-closed(숨기기). 누름 영역 44×44, 접근성 이름 "패스프레이즈 보기" / "숨기기" |
| B/Settings row (사용 방법) | 426:2045 | S05 "고급 · 패스프레이즈 입력" 접힘 행. Chevron을 `Icon / navigation / expand`(접힘) / `collapse`(펼침)로 바꾸고 `icon/tertiary`로 다시 묶음(규칙 13) |

새 Solar icon (09 Icons, CC BY 4.0, 480 Design, Linear 20, `icon/action/fg`): `Icon / settings / eye-closed` 565:73587, `Icon / navigation / expand` 565:73591 (alt-arrow-down), `Icon / navigation / collapse` 565:73595 (alt-arrow-up).

S05 화면 조립: 제목 블록 → (Banner Danger, 이미 지갑·저장 실패만) → 칩 `B/Chip` 12단어/24단어 + "붙여넣기"(`B/Button` Ghost sm, label `text/link`) → `B/Word cell` 2열 grid(gap `layout/fieldGap`) → grid 아래 오류 한 줄(`Product B/Body Small`, `input/errorText`) → 접힘 행 → (펼침) `B/Input` Kind=Text + `Show action`. 화면보다 긴 상태는 스크롤한 전체 길이로 그렸다. "복구" 바는 앱에서 화면 아래(키보드 위)에 붙는다.

## 시각 품질 수정 계약 (2026-10-17, 미감 리뷰, #54)

| 항목 | 노드 | 계약 |
|---|---|---|
| Product B/Row title | text style | Pretendard 500 17/25 -0.3. B/Row·B/Settings row·B/Switch row·B/Action row 제목. 600(Headline)은 버튼·강조, 700은 figure만 |
| surface/inset | 02 Semantic 변수 | Light = surface/subtle, Dark = surface/raised. B/Secret grid `Panel` fill. 번호는 `text/tertiary` |
| B/Progress steps | 494:1176 | 3칸 균등. 각 칸에 [왼쪽 선][점][오른쪽 선], 맨 끝 선은 투명. 라벨은 칸 중앙. 끝난 선 `status/success/fg`, 나머지 `border/subtle`. 아래 padding `space/6` |
| B/Keypad key | 421:825 | Label `Product B/Title 1`(26) |
| B/Detail row | 399:129 | center 정렬 |
| Footer stack (S30) | B-S30 `Footer` | faucet 행(B/Action row + Caption) → 주소 복사(Primary) → 공유(Ghost). 위 경계선은 Footer에 둠. 항상 보임 |
| QR tile (S30) | `QR tile` | surface/subtle, radius/2xl, padding space/3. 안의 QR은 흰색, 모듈 Ink |
| Tab header | Home `Header`, 내역·설정 `Title` | H, 높이 58, 중앙 정렬, 좌우 layout/screen/padding, 칩 1개(Sepolia 테스트넷) 오른쪽 |
| Detail link (S23 Failed) | `Detail link` | Ghost sm(link 색) 인라인. 하단 버튼 2개 |
| S06 | Copy row | "주소 복사"는 Ghost sm 인라인, 하단 Secondary는 "다른 주소예요"(지갑 지움 + S05 복귀, 단어 유지) |
| S05 Collapse notice | Passphrase 안 | 펼친 상태에서 입력 아래 Caption "고급을 접으면 입력한 패스프레이즈가 지워져요." |
| Brand/Mark | 495:17569 | option A(V 모노그램 + 열쇠 구멍). Size 96/72/40/24 × OnLight/OnBrand. 화면 안에서는 96(브랜드 화면) |
| Icon / hero / face | 516:288 | Solar face-scan-square-linear에서 입을 뺀 형태, icon/primary |
