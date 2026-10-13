# C05 Status label

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4337) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=67-241) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**짧은 상태를 icon과 고정 label로 표시합니다. 긴 이유와 다음 행동은 C25로 설명합니다.**

## Anatomy

State icon → visible state label. Label은 Variant 의미에 고정합니다. Asset 이름·amount는 이 badge에 넣지 않습니다.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| State=Pending/Confirmed/Failed/Warning/Info/Unknown | `state literal union` | `badge.warning/success/danger/info/unknown.fg/bg` |
| Fixed state label | `derived stateLabel` | `badge.textStyle` |
| Icon·spacing·shape slots | `presentation` | `badge.paddingX/paddingY, radius; contextual icon foreground` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

Pending은 confirmation 대기입니다. Confirmed는 완료 근거가 있습니다. Warning은 검토 조건입니다. Unknown은 결과를 알 수 없습니다. Pending과 Warning은 같은 색 역할을 써도 label·icon·의미가 다릅니다.

## Keyboard와 a11y 책임

구현자는 icon을 decorative로 숨기고 visible text를 제공합니다. Consumer는 관찰한 status와 근거를 제공합니다. 읽기용 label은 Tab stop이 아닙니다. Async 변화의 live announcement는 host가 한 곳에서 담당합니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<span><svg aria-hidden="true"></svg>Pending</span>
<p>Waiting for confirmation</p>
```

**Do:** 한 행의 badge와 상세 이유를 연결합니다. Label이 길면 자르지 않고 크기를 늘립니다.

**Don't:** No issues found를 Confirmed로 표시하지 않습니다. 모든 정적 badge에 role=status를 붙여 중복 announce하지 않습니다.

## 성숙도와 증거

[Core builder](../../work/v2/figma-core.js)와 [native ledger](../../work/figma-state.json)에 6개 State가 있습니다. 이 label은 chain 확인 기능을 구현하지 않습니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
