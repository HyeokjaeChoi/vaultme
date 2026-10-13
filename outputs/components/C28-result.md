# C28 Action result

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: Figma family와 웹 합성 Prototype의 적용 recipe

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5205) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=73-205) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**관찰한 action과 결과 상태를 정확히 표시합니다.**

## Anatomy

Action title + status icon → account/network → amount 또는 allowance → full recipient/spender → fee/status/time/hash → 다음 행동. C28 native Transaction result는 `Action=Send/Receive/Approve/Revoke`와 lifecycle State를 조합합니다. Approval/Revoke는 allowance 의미를, Receive는 sender를 표시합니다.

## Figma → code → token

| Figma property/slot | 제안 code prop | Token 역할 |
| --- | --- | --- |
| `Action=Send/Receive/Approve/Revoke` | `action` | `action별 고정 copy와 counterparty 역할` |
| `State=Submitting/Pending/Confirmed/Failed/Unknown` | `state` | `statusNotice의 해당 role + icon.status.*` |
| `Account·Network TEXT` | `account, network` | `Component가 없으면 Semantic text 역할` |
| `Amount·Recipient`, `Receive value/Sender`, `Approve value/Spender`, `Revoke value/Spender`, `Transaction hash` TEXT | `amountOrAllowance, counterparty, hash` | `transactionPanel.amountStyle/address/dataStyle` |
| `Fixed title/explanation + next action` | `action, evidence, onNext` | `statusNotice.*; nested C01 Button tokens` |

Component token을 먼저 사용합니다. 없는 역할만 Semantic을 사용합니다. Native에 없는 prop·state를 source에 이미 있는 것으로 추정하지 않습니다.

## 상태와 전이

Submitting은 제출 응답 대기입니다. Pending은 제출됐지만 confirmation 전입니다. Confirmed는 action 완료 근거가 있습니다. Failed는 관찰한 실패 이유입니다. Unknown은 원거래 상태를 알 수 없습니다. Confirm click에서 Confirmed로 직접 전이하지 않습니다. [Lifecycle readback](../../work/v2/verification/production-native-repair-lifecycle.json)은 4 Action × 5 State의 20 native Variant와 기존 Send Variant ID 보존을 기록합니다. 이는 synthetic native 적용 증거이며 실제 chain action 실행 성공이 아닙니다.

## Keyboard와 a11y 책임

Heading과 status를 함께 읽습니다. 화면 전환 host는 heading focus와 announcement를 조정합니다. Consumer가 action 종류·관찰 근거·full context·hash 존재 여부를 제공합니다. Unobserved hash나 block number를 만들지 않습니다. Details/copy action은 실제 구현했을 때만 연결합니다.

## 예제와 Do / Don't

아래는 synthetic 조합 예제입니다. 일부 필수 context는 host에서 함께 표시해야 합니다. 이 단편만으로 전체 review를 완료하지 않습니다.

```html
<section aria-labelledby="result-title">
  <h1 id="result-title">Allowance revocation status unavailable</h1>
  <p>Spender: 0x4444444444444444444444444444444444444444</p>
  <p>Check the original revocation before submitting another request.</p>
  <button type="button">Check status</button>
</section>
```

**Do:** Confirmed send는 Sent, approval은 Allowance approved, revoke는 Allowance revoked 의미를 표시합니다.

**Don't:** Approval을 Tokens sent로 부르지 않습니다. Unknown에 Send again을 바로 제시하지 않습니다.

## 성숙도와 증거

이 문서는 consumer 구현 계약입니다. 아래 code prop 이름은 대응 제안이며 배포된 SDK API가 아닙니다. Figma property는 기존 source 정의를 기준으로 읽습니다. 개별 TEXT property의 ID suffix는 현재 `componentPropertyDefinitions`로 확인합니다. Property가 노출되지 않은 slot은 native 설명 또는 별도 조합으로 취급합니다.

현재 값은 [token source](../wallet-foundation.tokens.json), Figma ID·Variant는 [native ledger](../../work/figma-state.json), web specimen은 [Review](../vaultme-v2-review/index.html)를 참조합니다. 최신 검사와 source hash는 release record를 따릅니다. 문서만으로 browser·manual screen reader·독립 consumer 채택을 pass 처리하지 않습니다.

320 px, 긴 값, 200% text, no motion을 적용 대상에서 확인합니다. 기본 정보 container는 Borderless입니다. Focus ring과 44 px target을 보존합니다. 금액과 전체 주소를 자르지 않습니다.
