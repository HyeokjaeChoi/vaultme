# C21 Token allowance row

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: Figma family와 웹 합성 Prototype의 적용 recipe

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5353) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=44-36) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**Connection과 독립된 현재 allowance를 표시합니다.**

## Anatomy

Token + network → full spender → current allowance + meaning → Review allowance. Desktop은 table, Mobile은 label을 유지한 stacked item입니다.

## Figma → code → token

| Figma property/slot | 제안 code prop | Token 역할 |
| --- | --- | --- |
| `Scope=Limited/Unlimited` | `scope` | `allowanceRow.limited/unlimited` |
| `Layout=Mobile/Desktop` | `layout` | `allowanceRow.padding, table.dividerWidth/divider` |
| `Token·Spender TEXT` | `token, network, spender` | `allowanceRow.spender/detail, titleStyle/bodyStyle` |
| `Fixed allowance/meaning + action instance` | `allowance, onReview` | `allowanceRow.action, borderWidth` |

Component token을 먼저 사용합니다. 없는 역할만 Semantic을 사용합니다. Native에 없는 prop·state를 source에 이미 있는 것으로 추정하지 않습니다.

## 상태와 전이

Scope와 Layout을 별도 축으로 유지합니다. Connected/Disconnected는 다른 모델입니다. Disconnect 후 allowance는 그대로입니다. Revoke review → Submitting/Pending → Confirmed 근거 후 allowance를 0으로 갱신합니다. Unknown에는 이전 allowance를 추정 삭제하지 않습니다.

## Keyboard와 a11y 책임

Desktop table은 header association을 유지합니다. Mobile에서는 Spender·Allowance label을 보존합니다. Review allowance button은 어느 token/spender의 review인지 이름·설명을 연결합니다. Consumer가 현재 chain allowance와 event handler를 제공합니다.

## 예제와 Do / Don't

아래는 synthetic 조합 예제입니다. 일부 필수 context는 host에서 함께 표시해야 합니다. 이 단편만으로 전체 review를 완료하지 않습니다.

각 row의 ID는 고유해야 합니다. 아래 ID는 한 row의 예제입니다.

```html
<article aria-labelledby="allowance-title">
  <h2 id="allowance-title">USDC · Ethereum</h2>
  <p id="allowance-spender">Spender: 0x4444444444444444444444444444444444444444</p>
  <p>Current allowance: Unlimited USDC</p>
  <button type="button" aria-describedby="allowance-title allowance-spender">Review allowance</button>
</article>
```

**Do:** C21 기존 Scope masters는 Mobile로 보존합니다. 긴 spender는 full string으로 둡니다.

**Don't:** 연결 상태를 allowance 취소 상태로 사용하지 않습니다.

## 성숙도와 증거

이 문서는 consumer 구현 계약입니다. 아래 code prop 이름은 대응 제안이며 배포된 SDK API가 아닙니다. Figma property는 기존 source 정의를 기준으로 읽습니다. 개별 TEXT property의 ID suffix는 현재 `componentPropertyDefinitions`로 확인합니다. Property가 노출되지 않은 slot은 native 설명 또는 별도 조합으로 취급합니다.

현재 값은 [token source](../wallet-foundation.tokens.json), Figma ID·Variant는 [native ledger](../../work/figma-state.json), web specimen은 [Review](../vaultme-v2-review/index.html)를 참조합니다. 최신 검사와 source hash는 release record를 따릅니다. 문서만으로 browser·manual screen reader·독립 consumer 채택을 pass 처리하지 않습니다.

320 px, 긴 값, 200% text, no motion을 적용 대상에서 확인합니다. 기본 정보 container는 Borderless입니다. Focus ring과 44 px target을 보존합니다. 금액과 전체 주소를 자르지 않습니다.
