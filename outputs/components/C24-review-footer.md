# C24 Review footer

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: Figma family와 웹 합성 Prototype의 적용 recipe

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-5122) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=73-141) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**정확한 행동과 차단 이유를 마지막에 표시합니다.**

## Anatomy

Status/reason → Primary exact action → Cancel/Close. 주 행동은 52 px입니다. Fixed footer는 scroll body와 경계를 분리하며 full address를 덮지 않습니다.

## Figma → code → token

| Figma property/slot | 제안 code prop | Token 역할 |
| --- | --- | --- |
| `State=Ready/Busy/Blocked` | `state` | `reviewFooter.bg/borderWidth/noteStyle` |
| `Nested Button Label·Icon` | `actionLabel, icon` | `button.size.lg.*, icon.action.onPrimary` |
| `Fixed status/reason slot` | `blockedReason, status` | `reviewFooter.noteStyle; color는 해당 Semantic status` |
| `Layout + nested secondary` | `onCancel, onConfirm` | `reviewFooter.padding/gap/actionHeight` |

Component token을 먼저 사용합니다. 없는 역할만 Semantic을 사용합니다. Native에 없는 prop·state를 source에 이미 있는 것으로 추정하지 않습니다.

## 상태와 전이

Ready → confirm → Busy이며 duplicate action을 차단합니다. Invalid input은 해당 행동의 근거에 따라 Blocked입니다. On-chain Send·Approve·Revoke는 fee stale/unavailable/insufficient를 차단하고 결과를 C28로 연결합니다. Connection 결과는 C20으로 연결합니다. Message signing은 host가 별도 서명 결과를 처리하며 chain fee gate를 적용하지 않습니다. Busy의 Close는 UI를 닫는 행동이며 chain transaction 취소가 아닙니다.

## Keyboard와 a11y 책임

Primary는 C01의 keyboard·busy guard를 따릅니다. Consumer가 정확한 action label, 근거 있는 blocked reason, idempotent request guard와 close 의미를 제공합니다. Dialog host가 focus restore를 담당합니다. Footer reason을 primary action의 aria-describedby에 연결합니다.

## 예제와 Do / Don't

아래는 synthetic 조합 예제입니다. 일부 필수 context는 host에서 함께 표시해야 합니다. 이 단편만으로 전체 review를 완료하지 않습니다.

```html
<footer>
  <p id="review-reason">Network fee unavailable</p>
  <button type="button" disabled aria-describedby="review-reason">Confirm send</button>
  <button type="button">Cancel</button>
</footer>
```

**Do:** Approve limit·Sign message·Revoke allowance를 서로 다른 label로 씁니다. Long label도 읽게 합니다.

**Don't:** Busy Close를 Cancel transaction으로 부르지 않습니다.

## 성숙도와 증거

이 문서는 consumer 구현 계약입니다. 아래 code prop 이름은 대응 제안이며 배포된 SDK API가 아닙니다. Figma property는 기존 source 정의를 기준으로 읽습니다. 개별 TEXT property의 ID suffix는 현재 `componentPropertyDefinitions`로 확인합니다. Property가 노출되지 않은 slot은 native 설명 또는 별도 조합으로 취급합니다.

현재 값은 [token source](../wallet-foundation.tokens.json), Figma ID·Variant는 [native ledger](../../work/figma-state.json), web specimen은 [Review](../vaultme-v2-review/index.html)를 참조합니다. 최신 검사와 source hash는 release record를 따릅니다. 문서만으로 browser·manual screen reader·독립 consumer 채택을 pass 처리하지 않습니다.

320 px, 긴 값, 200% text, no motion을 적용 대상에서 확인합니다. 기본 정보 container는 Borderless입니다. Focus ring과 44 px target을 보존합니다. 금액과 전체 주소를 자르지 않습니다.
