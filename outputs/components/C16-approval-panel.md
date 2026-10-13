# C16 Approval panel

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: Figma family와 웹 합성 Prototype의 적용 recipe

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4953) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=19-30) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**Spender가 사용할 token과 정확한 allowance를 검토합니다.**

## Anatomy

Origin + account/network → token/limit → full spender → native estimated fee → permission meaning → edit limit → C24. Approval은 지금 token을 보내는 행동이 아닙니다.

## Figma → code → token

| Figma property/slot | 제안 code prop | Token 역할 |
| --- | --- | --- |
| `Scope=Limited/Unlimited/Editing limit` | `scope, editing` | `approvalPanel.limit/valueStyle, warning.*` |
| `Spender TEXT` | `spender` | `approvalPanel.spender/addressStyle` |
| `Origin·Account·Network TEXT` | `origin, account, network` | `Component가 없으면 Semantic text 역할` |
| `Native fee TEXT + C14` | `fee` | `feeSummary.amount/note` |
| `Permission value·fixed meaning` | `limit, token` | `approvalPanel.heading/titleStyle/bodyStyle, borderWidth` |

Component token을 먼저 사용합니다. 없는 역할만 Semantic을 사용합니다. Native에 없는 prop·state를 source에 이미 있는 것으로 추정하지 않습니다.

## 상태와 전이

Limited → Edit → Editing limit → Save → Limited review입니다. Cancel은 이전 limit을 복원합니다. Unlimited → Set a limit → Editing limit입니다. Fee 문제는 C24 Blocked입니다. Approval submit → C28 Submitting이며 allowance는 Confirmed 근거를 얻은 뒤 갱신합니다.

## Keyboard와 a11y 책임

Editor host는 입력 label·error 연결과 focus 이동/복원을 담당합니다. Consumer는 full spender, account/network, exact limit, token decimals, native fee와 승인 결과를 제공합니다. Unlimited의 미래 입금분 설명을 항상 읽게 합니다.

## 예제와 Do / Don't

아래는 synthetic 조합 예제입니다. 일부 필수 context는 host에서 함께 표시해야 합니다. 이 단편만으로 전체 review를 완료하지 않습니다.

```html
<section aria-labelledby="approval-title">
  <h2 id="approval-title">Review token approval</h2>
  <p>Unlimited USDC</p>
  <p>Spender: 0x4444444444444444444444444444444444444444</p>
  <p>This spender can use future USDC deposits until you revoke this approval.</p>
  <button type="button">Set a limit</button>
</section>
```

**Do:** Edit 뒤 새 limit을 다시 검토합니다. 전체 spender는 좁은 폭에서 줄바꿈합니다.

**Don't:** Disconnect로 allowance가 제거됐다고 표시하지 않습니다.

## 성숙도와 증거

이 문서는 consumer 구현 계약입니다. 아래 code prop 이름은 대응 제안이며 배포된 SDK API가 아닙니다. Figma property는 기존 source 정의를 기준으로 읽습니다. 개별 TEXT property의 ID suffix는 현재 `componentPropertyDefinitions`로 확인합니다. Property가 노출되지 않은 slot은 native 설명 또는 별도 조합으로 취급합니다.

현재 값은 [token source](../wallet-foundation.tokens.json), Figma ID·Variant는 [native ledger](../../work/figma-state.json), web specimen은 [Review](../vaultme-v2-review/index.html)를 참조합니다. 최신 검사와 source hash는 release record를 따릅니다. 문서만으로 browser·manual screen reader·독립 consumer 채택을 pass 처리하지 않습니다.

320 px, 긴 값, 200% text, no motion을 적용 대상에서 확인합니다. 기본 정보 container는 Borderless입니다. Focus ring과 44 px target을 보존합니다. 금액과 전체 주소를 자르지 않습니다.
