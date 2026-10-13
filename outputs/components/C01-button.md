# C01 Button

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: Figma family와 웹 합성 Prototype의 적용 recipe

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-3939) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=9-283) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**하나의 행동을 실행합니다. 금융 행동은 icon과 정확한 label을 함께 표시합니다.** Primary는 화면의 주요 행동입니다. Secondary는 보조 행동입니다. Ghost는 낮은 위계의 행동입니다. Icon-only action은 C02를 사용합니다.

## Anatomy

```text
[1 Hit target ≥44 px]
  [2 Optional decorative icon] [3 Visible label]
  [4 Busy visual, reserved width]
[5 Nearby reason or status]
```

Label은 필수입니다. Loading으로 폭이 줄거나 주변 위치가 바뀌지 않게 합니다. Busy 중 duplicate activation을 차단합니다. Primary의 white icon과 text는 같은 문맥을 따릅니다.

## Figma → code → token

| Figma property/선택 | 제안 code prop | Component token |
| --- | --- | --- |
| Family Primary/Secondary/Ghost | `variant` | `button.primary/secondary/ghost.bg.*`, `fg.*`, `borderWidth` |
| `Size=Small/Medium/Large` | `size: "sm" | "md" | "lg"` | `button.size.sm/md/lg.height`, `paddingX`, `label` |
| `State=Default/Hover/Focused/Pressed` | browser interaction | variant `bg.*`, `fg.*`, `focusColor`; `button.focusWidth/focusOffset` |
| `State=Disabled/Loading` | `disabled`, `busy` | variant `bg.disabled`, `fg.disabled`; busy는 기존 폭 유지 |
| `Label` TEXT | `label` | 선택 size의 `label` typography |
| `Icon`, `ShowIcon` | `icon`, `showIcon` | `icon.size.control`, Primary `icon.action.onPrimary`; 기타 `icon.action.fg` |
| 전체 hit area | consumer target | `button.hitTarget` |

Loading과 Disabled는 의미가 다릅니다. Loading은 실행 중입니다. Disabled는 실행 조건을 충족하지 못했습니다. Disabled icon은 disabled foreground와 맞춥니다. Additive Icon property는 기존 master ID를 유지합니다.

## 상태와 전이

| 상태 | activation | 사용자에게 보일 내용 |
| --- | --- | --- |
| Default | 1회 허용 | 정확한 행동 label |
| Hover/Focused/Pressed | 1회 허용 | 같은 label, visible focus |
| Disabled | 차단 | 근처에 구체적인 이유 |
| Loading | 차단 | `Submitting` 등 실행 중 label와 status |

Ready → activation → Busy로 전이합니다. 결과는 consumer가 정합니다. Submit click만으로 Confirmed로 전이하지 않습니다. 실패·unknown은 각각의 결과 계약을 따릅니다. `busy && disabled`의 presentation은 Busy를 우선합니다. `focused`는 lifecycle 상태가 아닙니다.

## Keyboard와 a11y 책임

Component 구현은 native `<button>`의 Enter·Space activation, visible focus, hit area와 decoration의 `aria-hidden`을 담당합니다. 실제 `disabled` button은 Tab에서 제외됩니다. Busy를 focusable하게 유지하면 `aria-disabled="true"`와 event guard를 함께 사용합니다. `aria-disabled`만으로 click을 차단했다고 보지 않습니다.

Consumer는 label, action handler, 중복 요청 guard, disabled reason과 live status를 제공합니다. Busy로 label이 바뀔 때 같은 status를 여러 live region에서 중복 announce하지 않습니다. 이동은 `<a>`를 사용하고 button에 navigation 의미를 숨기지 않습니다.

## 예제와 Do / Don't

아래는 합성 HTML 계약 예제입니다. Handler와 guarded busy 전이는 consumer 책임입니다.

```html
<button type="button" aria-describedby="send-status">
  <svg aria-hidden="true" focusable="false"><use href="#arrow-up-right" /></svg>
  <span>Confirm send</span>
</button>
<p id="send-status" role="status">Ready for review</p>
```

**Do:** 긴 label은 target을 늘리거나 줄바꿈합니다. Small visual control도 44 px hit area를 확보합니다. Reduced motion에서도 상태 문구를 즉시 표시합니다.

**Don't:** `Continue`만으로 Approve·Sign·Revoke를 숨기지 않습니다. Loading을 success check로 바꾸지 않습니다. Primary icon swap 후 기본 Ink를 그대로 두지 않습니다.

## 성숙도와 증거

이 문서는 consumer 구현 계약입니다. 아래 code prop 이름은 대응 제안이며 배포된 SDK API가 아닙니다. Figma property는 기존 source 정의를 기준으로 읽습니다. 개별 TEXT property의 ID suffix는 현재 `componentPropertyDefinitions`로 확인합니다. Property가 노출되지 않은 slot은 native 설명 또는 별도 조합으로 취급합니다.

현재 값은 [token source](../wallet-foundation.tokens.json), Figma ID·Variant는 [native ledger](../../work/figma-state.json), web specimen은 [Review](../vaultme-v2-review/index.html)를 참조합니다. 최신 검사와 source hash는 release record를 따릅니다. 문서만으로 browser·manual screen reader·독립 consumer 채택을 pass 처리하지 않습니다.

320 px, 긴 값, 200% text, no motion을 적용 대상에서 확인합니다. 기본 정보 container는 Borderless입니다. Focus ring과 44 px target을 보존합니다. 금액과 전체 주소를 자르지 않습니다.
