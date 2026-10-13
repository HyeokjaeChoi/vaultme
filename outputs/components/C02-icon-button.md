# C02 Icon button

상태: Preview usage contract · 문서 갱신: 2026-10-04  
범위: 기존 Figma family와 `en-US` 합성 UI. 배포된 SDK API가 아님

[문서 홈](../README.md) · [Component 목록](README.md) · [전체 계약](../wallet-component-contracts.md) · [현재 release](../vaultme-release.json)

[Figma 안내](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=83-4251) · [Native master](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=67-205) · [Overview](https://www.figma.com/design/NMXrn0q75G1SX2Bn1L1jP8?node-id=5-2)

**짧은 보조 행동을 icon 하나로 실행합니다. 주요 금융 행동에는 C01의 visible label을 사용합니다.**

## Anatomy

44 × 44 px target → Phosphor icon → focus ring. Accessible action name은 코드에서 따로 제공합니다. Tooltip은 보조 설명입니다.

## Figma → consumer → token

| Native property 또는 slot | 제안 consumer prop | 기존 token 역할 |
| --- | --- | --- |
| State=Default/Hover/Focused/Pressed/Disabled | `state는 browser interaction에서 계산` | `iconButton.bg.default/hover/pressed, fg/disabledFg, focusColor` |
| Icon INSTANCE_SWAP | `icon` | `iconButton.iconSize, fg/disabledFg` |
| Accessible name은 native 설명, 별도 TEXT property 아님 | `label 또는 ariaLabel` | `Token 없음. 의미 있는 문자열은 consumer 제공` |
| Target·shape | `layout` | `iconButton.hitTarget, radius` |

Native TEXT property의 ID suffix는 현재 source definition을 읽습니다. Slot은 property 노출을 뜻하지 않습니다. 제안 prop은 consumer 구현의 대응 이름입니다.

## 상태와 전이

Default에서 focus·hover·press로 전이합니다. Disabled는 activation을 차단합니다. Loading Variant는 없습니다. Async action에 busy 표현이 필요하면 C01을 사용하거나 별도 consumer 계약을 기록합니다.

## Keyboard와 a11y 책임

구현자는 native button, Enter·Space, visible focus와 44 px target을 제공합니다. Consumer는 Copy recipient address 같은 정확한 이름·handler·disabled 이유를 제공합니다. Icon은 aria-hidden입니다. Swap 후 fg 또는 disabledFg를 다시 bind합니다.

## 예제와 Do / Don't

아래는 synthetic slot·조합 예제입니다. 실제 handler와 필요한 host 맥락은 consumer가 제공합니다.

```html
<button type="button" aria-label="Close review">
  <svg aria-hidden="true" focusable="false"><use href="#close" /></svg>
</button>
```

**Do:** Close·Copy 같은 의미를 accessible name에 씁니다. 320 px·200% text에서도 target이 겹치지 않게 합니다.

**Don't:** Icon-only Approve·Sign·Revoke를 쓰지 않습니다. dots glyph를 More라고만 이름 짓고 대상 action을 숨기지 않습니다.

## 성숙도와 증거

[Core readback](../../work/v2/verification/production-native-repair-core.json)은 C02의 `Icon#158:12` additive swap과 기존 master ID 보존을 기록합니다. 기본 source는 Copy master `137:144`입니다. 다른 action은 Icon swap과 accessible name을 함께 바꿉니다. Accessible name의 실제 browser 전달은 별도 검사입니다.

Preview는 사용 계약의 상태입니다. [Token source](../wallet-foundation.tokens.json)의 가장 구체적인 Component 역할을 먼저 씁니다. Native 적용, browser·screen reader, 실제 wallet와 독립 consumer adoption의 현재 결과는 release에 연결된 범위만 인정합니다.
