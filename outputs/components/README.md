# VaultMe Component 사용법

상태: Preview usage contracts · 문서 갱신: 2026-10-04  
범위: C01–C33 전체 33 family (C29–C33은 2026-10-13 추가, Q80). Public SDK API가 아님

[문서 홈](../README.md) · [Figma Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2) · [Components catalog](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-3936) · [전체 C/P 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

**기본 control을 확인하고, 필요한 wallet 행동을 조합합니다.**

## 먼저 읽을 3개

[C01 Button](C01-button.md) → [C03 Input](C03-input.md) → [C15 Transaction panel](C15-transaction-panel.md)을 읽습니다. 그 다음 아래 목록에서 현재 화면의 역할을 고릅니다. Balance 목록을 만들면 [C09 Asset row](C09-asset-row.md)를 읽습니다.

Figma의 **Assets에서 Component 이름으로 검색**합니다. [파일 지도](../figma-organization.md#파일-지도)에서 해당 page로 이동합니다. Native 안내는 `Purpose → Anatomy → Usage → States → Examples → Evidence` 순서로 읽습니다. 상세 recipe는 Anatomy → States → Tokens → Accessibility → Usage → Lifecycle/Evidence 순서로 읽습니다. 이번에 영향받은 C04/C06/C23는 이 순서를 사용합니다. 각 family의 recipe는 이 목록의 Markdown 파일입니다. 안내와 master 링크는 Native track의 `work/v2/overview-guidance-map.json` 매핑을 사용합니다. 편집 후 실제 적용은 Main의 final readback으로 확인합니다. Figma의 local recipe 경로와 실제 native 링크를 구분합니다.

## 전체 Family 목록

Coverage는 **28/28 family 문서**입니다. 각 파일은 anatomy·native property/slot·제안 consumer prop·기존 token·state·keyboard/a11y 책임·예제·Do/Don't·증거 범위를 설명합니다. 문서 coverage와 runtime readiness는 다른 값입니다.

### Controls와 구조

| ID · Family | 고를 때 | Figma |
| --- | --- | --- |
| [C01 Button](C01-button.md) | 정확한 action·busy·disabled. 큰 글자에서 라벨 2줄 줄바꿈 (2026-10-13) | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-3939) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=9-283) |
| [C02 Icon button](C02-icon-button.md) | 보조 action·accessible name | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4251) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=67-205) |
| [C03 Input](C03-input.md) | Label·helper/error·validation. 모든 State에서 `Input value` 연결 (2026-10-13 수정) | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4281) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=67-231) |
| [C04 Card / Group](C04-card-group.md) | 정보 group 또는 독립 task | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4321) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=67-240) |
| [C05 Status label](C05-status-label.md) | 짧은 상태·고정 의미 | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4337) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=67-241) |
| [C06 Navigation](C06-navigation.md) | Product route와 Marketing 구분 | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4386) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=67-342) |

### Account·자산·내역

| ID · Family | 고를 때 | Figma |
| --- | --- | --- |
| [C07 Account selector](C07-account-selector.md) | 단일 account와 연결 account 다중 선택 | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4482) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=35-20) |
| [C08 Network selector](C08-network-selector.md) | Active·Available·Unavailable | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4501) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=35-48) |
| [C09 Asset row](C09-asset-row.md) | Exact balance·quote 상태 | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4522) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=36-20) |
| [C10 Activity row](C10-activity-row.md) | Action·amount·counterparty·result | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4567) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=36-48) |
| [C11 Receive address](C11-receive-address.md) | Full address·network·copy | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4643) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=68-150) |

### 보내기·검토·서명

| ID · Family | 고를 때 | Figma |
| --- | --- | --- |
| [C12 Recipient field](C12-recipient-field.md) | 입력 검증과 full review | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4778) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=40-17) |
| [C13 Amount field](C13-amount-field.md) | 자산 부족과 native fee 부족 | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4806) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=40-28) |
| [C14 Fee summary](C14-fee-summary.md) | Estimate·freshness·차단 이유 | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4831) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=40-41) |
| [C15 Transaction panel](C15-transaction-panel.md) | On-chain send review. `State=High risk` 추가 (burn·토큰 컨트랙트·유사 주소, Danger notice 노출, 2026-10-13) | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4863) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=18-46) |
| [C16 Approval panel](C16-approval-panel.md) | Full spender·allowance | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4953) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=19-30) |
| [C17 Connection request](C17-connection-request.md) | Origin·선택 account·공개 범위 | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5026) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=41-28) |
| [C18 Signature request](C18-signature-request.md) | Exact message·raw payload·해석 범위 | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5080) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=41-51) |

### 보안 task와 권한

| ID · Family | 고를 때 | Figma |
| --- | --- | --- |
| [C19 Backup status](C19-backup-status.md) | 비밀 없는 확인 상태 | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5311) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=44-14) |
| [C20 Connected app row](C20-connected-app-row.md) | Connection lifecycle | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5331) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=44-23) |
| [C21 Token allowance row](C21-allowance-row.md) | Connection과 독립된 chain allowance | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5353) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=44-36) |

### 화면 조립과 결과

| ID · Family | 고를 때 | Figma |
| --- | --- | --- |
| [C22 Product header](C22-product-header.md) | 현재 account·network context | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4679) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=68-167) |
| [C23 Portfolio balance](C23-portfolio-balance.md) | Fiat estimate와 quote coverage | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4702) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=68-180) |
| [C24 Review footer](C24-review-footer.md) | 정확한 confirm·busy·blocked | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5122) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=73-141) |
| [C25 Status notice](C25-status-notice.md) | 구체적 이유와 다음 행동 | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5156) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=73-169) |
| [C26 Address block](C26-address-block.md) | Compact 목록·Full review·copy. `Action label` 속성 추가 (2026-10-13) | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4723) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=68-197) |
| [C27 Collection state](C27-collection-state.md) | Loading·Empty·Unavailable | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4746) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=68-219) |
| [C28 Action result](C28-result.md) | Action × lifecycle·unknown | [안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5205) · [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=73-205) |
| C29 Switch | On·Off × Default·Disabled. 51×31, target 44 pt는 consumer | [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=300-611) |
| C30 Segmented control | 2개 상호 배타 선택 (12/24단어) | [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=300-622) |
| C31 List item | Trailing = Value·Disclosure·Switch, Divider boolean | [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=300-642) |
| C32 Bottom sheet | Title·Body·Primary/Secondary action. scrim은 consumer. 최대 높이 화면의 90%, 내용만 스크롤, 버튼 고정 (2026-10-13) | [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=301-606) |
| C33 Sensitive reveal | Hidden·Revealed. 복구 구문 가림, specimen은 placeholder "word" | [master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=301-668) |

## 조합 경로

| 행동 | 읽을 recipe | 필수 경계 |
| --- | --- | --- |
| Send | C12 + C13 → C15 + C14 + C24 → C28 | Full recipient·native fee·자산별 deduction·chain result |
| Receive | C11 + C26 | Account·network·full address·copy. QR 없음 |
| Connection | C17 + C07/C08 + C24 → C20 | 공개 account scope. Allowance 부여와 별개 |
| Message signing | C18 + C24 | Exact message/raw payload. Unrecognized signing blocked |
| Approval | C16 + C14 + C24 → C28 | Full spender·exact allowance. 지금 전송한 amount와 별개 |
| Allowance review | C21 → C16 또는 별도 revoke review → C28 | Disconnect 후에도 allowance 유지 |
| Wallet 목록 | C22 + C23 + C09/C10 + C27 + C06 | Quote와 token balance, loading·empty·unavailable 구분 |

## Dialog와 drawer의 host 계약

Dialog는 새 C29 family가 아닙니다. C07/C08 picker 또는 C15/C16/C17/C18 review를 담는 host입니다. Host는 accessible title, 초기 focus, 실제 modal focus containment, Escape/close, trigger로 focus restore를 제공합니다. Close는 chain 취소를 뜻하지 않습니다.

Inline panel은 dialog가 아닙니다. Disclosure는 button의 `aria-expanded`와 `aria-controls`를 사용합니다. Fixed footer가 full address·warning을 가리지 않게 scroll body를 분리합니다. Host의 동작은 Figma Variant만으로 구현되지 않습니다.

기존 floating host의 내부 표현에는 `overlay.bg/fg/radius/shadow`를 씁니다. 자식 Component 상태 foreground를 보존합니다. Modal일 때만 `overlay.scrimBg/scrimOpacity`를 씁니다. Opacity는 scrim에만 적용합니다. Nonmodal popover에는 scrim이 없습니다. Fixed drawer는 기존 기능 경계선을 사용합니다. 이 alias는 새 public family나 consumer prop이 아닙니다.

## Native property와 consumer prop

Native TEXT·INSTANCE_SWAP는 실제 source definition으로 읽습니다. 문서의 slot은 property가 노출됐다는 뜻이 아닙니다. 제안 consumer prop은 설치 가능한 SDK API가 아닙니다. ID suffix는 automation 실행 시 현재 source에서 확인합니다.

[Core native readback](../../work/v2/verification/production-native-repair-core.json)은 Input의 `HelperText`·`ErrorText`와 Icon button의 `Icon`을 기록합니다. Helper/error는 별도 additive TEXT입니다. Icon swap 뒤 문맥 foreground를 다시 bind합니다. 이후 property 이름 수정은 최종 readback과 C03/C02 대응을 함께 갱신합니다.

## 책임과 성숙도

Component 구현자는 target·focus·label·reading order를 담당합니다. Consumer는 실제 데이터·validation·async event·fee freshness·result 근거와 announcement를 제공합니다. 자세한 분배는 family별 문서를 따릅니다.

Default informational container는 Borderless입니다. Functional Input·focus·invalid·selected 경계는 보존합니다. 320 px·긴 값·200% text·no motion은 영향을 받은 조합에서 확인합니다. 문서 작성, native 적용, Library publication, browser/AT 검사, 독립 consumer adoption은 각각 증거를 기록합니다.

## Lifecycle와 adoption 기록

현재 family 문서는 Preview usage contract입니다. Stable/Experimental label은 실제 범위·maintainer 결정·근거가 있을 때만 추가합니다. Deprecated 항목은 교체 경로와 유지할 compatibility를 [Migration](../vaultme-v2-migration.md)에 기록합니다. Pending/Confirmed 같은 제품 데이터 상태를 Library 성숙도로 사용하지 않습니다.

Native readback → source review → Library publication → independent consumer update는 각각 확인합니다. Figma consumer는 linked source·update·override retention을 기록합니다. Web consumer는 해당 Component 조립·keyboard·content stress를 실제로 확인합니다. 예제 파일의 존재만으로 adopted를 기록하지 않습니다. 새 C23 Surface와 host는 이번 변경의 digest와 별도 증거를 요구합니다. 현재 결과는 [release](../vaultme-release.json)를 따릅니다.
