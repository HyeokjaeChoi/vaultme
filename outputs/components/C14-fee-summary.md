# C14 Fee summary

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: Figma family와 웹 합성 Prototype의 적용 recipe

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4831) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=40-41) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**Estimated native fee와 freshness를 함께 표시합니다.**

## Anatomy

Title → native amount/unit → fiat estimate/time → deduction rule → reason/refresh. Unavailable은 amount와 total을 알 수 없음을 표시합니다.

## Figma → code → token

| Figma property/slot | 제안 code prop | Token 역할 |
| --- | --- | --- |
| `State=Fresh/Stale/Unavailable/Insufficient` | `feeState` | `feeSummary.note/stale/insufficient` |
| `Native fee TEXT` | `nativeFee` | `feeSummary.amount, amountStyle` |
| `Title·fixed status slots` | `label, reason, observedAt` | `feeSummary.title/titleStyle/bodyStyle` |
| `Deduction slot` | `deductionsByAsset` | `feeSummary.total/deductionNote, borderWidth/dividerWidth` |

Component token을 먼저 사용합니다. 없는 역할만 Semantic을 사용합니다. Native에 없는 prop·state를 source에 이미 있는 것으로 추정하지 않습니다.

## 상태와 전이

Fresh만 C24의 다른 validation 조건을 확인할 수 있습니다. Stale은 Refresh fee, Unavailable은 Retry estimate, Insufficient는 native asset 부족 이유를 표시하고 confirm을 차단합니다. Refresh 중 이전 추정값을 fresh로 표시하지 않습니다.

## Keyboard와 a11y 책임

읽기 순서는 title·native fee·estimate·freshness·reason입니다. Refresh는 keyboard button입니다. Consumer는 freshness source, balance, fee validity와 C24 차단 이유를 제공합니다. 단일 status region에서 갱신 결과를 announce합니다.

## 예제와 Do / Don't

아래는 synthetic 조합 예제입니다. 일부 필수 context는 host에서 함께 표시해야 합니다. 이 단편만으로 전체 review를 완료하지 않습니다.

```html
<section aria-labelledby="fee-title">
  <h2 id="fee-title">Estimated network fee</h2>
  <p>0.00063 ETH</p>
  <p>Fee estimate expired. Refresh it before you continue.</p>
  <button type="button">Refresh fee</button>
</section>
```

**Do:** 150 USDC와 0.00063 ETH fee는 별도 줄로 둡니다. 긴 estimated total도 자르지 않습니다.

**Don't:** Unavailable을 0 fee 또는 estimate reviewed로 표시하지 않습니다.

## 성숙도와 증거

이 문서는 consumer 구현 계약입니다. 아래 code prop 이름은 대응 제안이며 배포된 SDK API가 아닙니다. Figma property는 기존 source 정의를 기준으로 읽습니다. 개별 TEXT property의 ID suffix는 현재 `componentPropertyDefinitions`로 확인합니다. Property가 노출되지 않은 slot은 native 설명 또는 별도 조합으로 취급합니다.

현재 값은 [token source](../wallet-foundation.tokens.json), Figma ID·Variant는 [native ledger](../../work/figma-state.json), web specimen은 [Review](../vaultme-v2-review/index.html)를 참조합니다. 최신 검사와 source hash는 release record를 따릅니다. 문서만으로 browser·manual screen reader·독립 consumer 채택을 pass 처리하지 않습니다.

320 px, 긴 값, 200% text, no motion을 적용 대상에서 확인합니다. 기본 정보 container는 Borderless입니다. Focus ring과 44 px target을 보존합니다. 금액과 전체 주소를 자르지 않습니다.
